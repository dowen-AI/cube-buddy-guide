import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { AlertTriangle, ArrowLeft, Brain, Check, HelpCircle, LifeBuoy, RotateCcw, Undo2, Volume2, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MoveName } from '@/hooks/useCubeState';
import { InteractiveCube3D } from '@/components/InteractiveCube3D';
import { CubePicture, TopDownPicture, TopPatternPicture } from './Pictures';
import { MOVE_HINT, MOVE_TEXT, inverseMove } from '@/lib/moves';
import { MOVE_FACE, type Face } from '@/lib/cubeGeometry';
import { applyStep, solvedFor, type Demo } from '@/lib/cubeDemo';
import { getKnownMoves, loadGuideState, markMoveKnown, saveGuideState, usePrefs } from '@/lib/guideMemory';
import { canSpeak, speak, stopSpeaking } from '@/lib/speak';
import { useWakeLock } from '@/hooks/useWakeLock';
import {
  applyEffect, resolveTarget, sequenceMoves, startDemo, CHEAT_SHEET, FLOW_VERSION,
  type ChoiceOption, type Counters, type CounterDisplay, type Effect, type FlowNode, type Picture, type StageFlow, type Target,
} from '@/data/followAlong';

type SequenceNode = Extract<FlowNode, { kind: 'sequence' }>;

interface SeqLog { nodeId: string; name: string; moves: MoveName[]; countersBefore: Counters; demoBefore: Demo }

interface State {
  nodeId: string;
  counters: Counters;
  demo: Demo;
  moveIndex: number;
  phase: 'moves' | 'checkpoint';
  current: SeqLog | null;
  last: SeqLog | null;
  stepStart: { demo: Demo; counters: Counters };
  sheet: boolean;
  help: boolean; // "None of these / I'm not sure"
  undo: { log: SeqLog; index: number } | null;
  undone: SeqLog | null;
  memory: boolean; // "I know this one": the whole set of turns on one screen
  restored: boolean; // reopened part-way through the stage
}

type Action =
  | { type: 'go'; target: Target; effect?: Effect; demo?: Demo }
  | { type: 'moveDone' }
  | { type: 'moveBack' }
  | { type: 'memory'; open: boolean }
  | { type: 'allDone' }
  | { type: 'sheet'; open: boolean }
  | { type: 'help'; open: boolean }
  | { type: 'restartStep' }
  | { type: 'restartStage' }
  | { type: 'startUndo' }
  | { type: 'undoMoveDone' }
  | { type: 'undoMoveBack' }
  | { type: 'retryAfterUndo' }
  | { type: 'stopUndo' };

const fresh = (flow: StageFlow): State => {
  const demo = startDemo(flow);
  return {
    nodeId: flow.start, counters: {}, demo, moveIndex: 0, phase: 'moves', current: null, last: null,
    stepStart: { demo, counters: {} }, sheet: false, help: false, undo: null, undone: null, memory: false, restored: false,
  };
};

const enter = (flow: StageFlow, base: State, id: string): State => {
  const next = flow.nodes[id];
  const entered: State = { ...base, nodeId: id, moveIndex: 0, phase: 'moves', current: null, sheet: false, help: false, undone: null, memory: false };
  if (next.id === next.step) entered.stepStart = { demo: entered.demo, counters: entered.counters };
  if (next.kind === 'sequence') {
    entered.current = { nodeId: id, name: next.name, moves: [], countersBefore: entered.counters, demoBefore: entered.demo };
  }
  return entered;
};

// Open on the exact screen the person left (same turn, same counters), if they
// were part-way through this stage last time.
const initial = (flow: StageFlow): State => {
  const saved = loadGuideState<State>(flow.stageId, FLOW_VERSION);
  if (!saved || !flow.nodes[saved.nodeId] || flow.nodes[saved.nodeId].kind === 'finish') return fresh(flow);
  const atStart = saved.nodeId === flow.start && !saved.current?.moves.length && !Object.values(saved.counters).some(Boolean);
  return { ...saved, sheet: false, help: false, undo: null, memory: false, restored: !atStart };
};

const makeReducer = (flow: StageFlow) => (s: State, a: Action): State => {
  const node = flow.nodes[s.nodeId];
  switch (a.type) {
    case 'go': {
      const counters = applyEffect(s.counters, a.effect);
      return enter(flow, { ...s, counters, demo: a.demo ?? s.demo, restored: false }, resolveTarget(a.target, counters));
    }
    case 'moveDone': {
      if (node.kind !== 'sequence' || !s.current || s.phase !== 'moves') return s;
      const moves = sequenceMoves(node);
      const move = moves[s.moveIndex];
      const current = { ...s.current, moves: [...s.current.moves, move] };
      const demo = applyStep(s.demo, move);
      if (s.moveIndex + 1 < moves.length) return { ...s, demo, current, moveIndex: s.moveIndex + 1, restored: false };
      return { ...s, demo, current, last: current, phase: 'checkpoint', restored: false, counters: applyEffect(s.counters, node.onDone) };
    }
    case 'memory':
      return node.kind === 'sequence' && s.phase === 'moves' ? { ...s, memory: a.open } : s;
    case 'allDone': {
      // Did the rest of the turns from memory: same result as tapping through every one.
      if (node.kind !== 'sequence' || !s.current || s.phase !== 'moves') return s;
      const rest = sequenceMoves(node).slice(s.moveIndex);
      const demo = rest.reduce((d, m) => applyStep(d, m), s.demo);
      const current = { ...s.current, moves: [...s.current.moves, ...rest] };
      return { ...s, demo, current, last: current, phase: 'checkpoint', memory: false, restored: false, counters: applyEffect(s.counters, node.onDone) };
    }
    case 'moveBack': {
      if (node.kind !== 'sequence' || !s.current) return s;
      if (s.phase === 'checkpoint') {
        const moves = sequenceMoves(node);
        const move = moves[moves.length - 1];
        return { ...s, phase: 'moves', moveIndex: moves.length - 1, demo: applyStep(s.demo, inverseMove(move)), counters: s.current.countersBefore, current: { ...s.current, moves: s.current.moves.slice(0, -1) } };
      }
      if (s.moveIndex === 0) return s;
      const move = sequenceMoves(node)[s.moveIndex - 1];
      return { ...s, moveIndex: s.moveIndex - 1, demo: applyStep(s.demo, inverseMove(move)), current: { ...s.current, moves: s.current.moves.slice(0, -1) } };
    }
    case 'sheet':
      return { ...s, sheet: a.open };
    case 'help':
      return { ...s, help: a.open };
    case 'restartStep':
      return enter(flow, { ...s, demo: s.stepStart.demo, counters: s.stepStart.counters, restored: false }, node.step);
    case 'restartStage':
      return fresh(flow);
    case 'startUndo': {
      const log = s.current && s.current.moves.length ? s.current : s.last;
      if (!log || !log.moves.length) return s;
      return { ...s, sheet: false, undo: { log, index: 0 } };
    }
    case 'undoMoveDone': {
      if (!s.undo) return s;
      const { log, index } = s.undo;
      const move = inverseMove(log.moves[log.moves.length - 1 - index]);
      const demo = applyStep(s.demo, move);
      if (index + 1 < log.moves.length) return { ...s, demo, undo: { log, index: index + 1 } };
      return { ...s, demo: log.demoBefore, undo: null, undone: log };
    }
    case 'undoMoveBack': {
      if (!s.undo || s.undo.index === 0) return s;
      const { log, index } = s.undo;
      return { ...s, demo: applyStep(s.demo, log.moves[log.moves.length - index]), undo: { log, index: index - 1 } };
    }
    case 'retryAfterUndo': {
      if (!s.undone) return s;
      const log = s.undone;
      return enter(flow, { ...s, demo: log.demoBefore, counters: log.countersBefore, last: null }, log.nodeId);
    }
    case 'stopUndo':
      return { ...s, undo: null };
  }
};

// ---------------------------------------------------------------- small pieces

// The cube is never flipped, so this says the same thing on every screen of every stage.
const OrientationBanner = ({ onMessedUp }: { onMessedUp?: () => void }) => (
  <div className="flex min-h-14 shrink-0 items-center gap-2 bg-amber-100 pl-3 pr-1 text-amber-950 dark:bg-amber-900/50 dark:text-amber-50">
    <CubePicture colors={solvedFor('yellow-top')} size={34} title="Mini cube: yellow on top, white on the bottom" />
    <span role="note" aria-label="How to hold your cube" className="min-w-0 flex-1 whitespace-nowrap text-[15px] font-bold uppercase leading-tight" data-testid="orientation">
      Yellow on top<br />White on bottom
    </span>
    {onMessedUp ? (
      <button type="button" onClick={onMessedUp} className="flex min-h-14 shrink-0 items-center gap-1 rounded-lg border border-current/20 bg-background/80 px-2 text-sm font-semibold text-foreground hover:bg-background" data-testid="messed-up">
        <LifeBuoy className="h-5 w-5" />I messed up
      </button>
    ) : null}
  </div>
);

const CounterChips = ({ items, counters, note, overlay }: { items: CounterDisplay[]; counters: Counters; note?: string; overlay?: boolean }) => (
  <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm', overlay ? 'absolute left-2 top-2 z-[1] max-w-[75%] rounded-xl bg-background/90 px-2.5 py-1 shadow-sm' : 'shrink-0 border-b border-border px-3 py-1.5')} aria-live="polite">
    {items.map((c) => {
      const value = counters[c.key] ?? 0;
      return (
        <div key={c.key} className="flex min-w-0 items-baseline gap-1.5" data-counter={c.key}>
          <span className="shrink-0 whitespace-nowrap text-muted-foreground">{c.label}:</span>
          {c.of ? (
            <>
              <span className="font-bold tabular-nums text-foreground">{value} of {c.of}</span>
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: c.of }, (_, i) => <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < value ? 'bg-cube-green' : 'bg-muted-foreground/30')} />)}
              </span>
            </>
          ) : (
            <span className="font-bold tabular-nums text-foreground">{value}{c.until && !overlay ? <span className="font-normal text-muted-foreground"> {c.until}</span> : null}</span>
          )}
        </div>
      );
    })}
    {note ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sm font-medium text-sky-950 dark:bg-sky-900/50 dark:text-sky-100" role="status" data-testid="restored">{note}</span> : null}
  </div>
);

const PictureView = ({ picture, size = 72 }: { picture: Picture; size?: number }) =>
  picture.kind === 'pattern' ? <TopPatternPicture pattern={picture.pattern} size={size} />
    : picture.kind === 'top' ? <TopDownPicture demo={picture.demo()} marks={picture.marks} size={size} />
      : <CubePicture demo={picture.demo()} view={picture.view} size={size} />;

const BigButton = ({ children, onClick, variant = 'primary', ...rest }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-lg font-semibold transition-colors disabled:opacity-40',
      variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-2 border-border bg-background text-foreground hover:bg-muted',
    )}
    {...rest}
  >
    {children}
  </button>
);

const SmallButton = ({ children, onClick, disabled, className, ...rest }: { children: React.ReactNode; onClick: () => void; disabled?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn('flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2 text-base font-medium leading-tight text-foreground transition-colors hover:bg-muted disabled:opacity-40', className)}
    {...rest}
  >
    {children}
  </button>
);

const ListenButton = ({ text }: { text: string }) =>
  canSpeak() ? (
    <SmallButton onClick={() => speak(text)} className="max-w-[9rem]" data-testid="listen" aria-label="Listen to this instruction"><Volume2 className="h-5 w-5" />Listen</SmallButton>
  ) : null;

const HANDS_FREE_SECONDS = 8;

// ---------------------------------------------------------------- main

interface FollowAlongProps {
  flow: StageFlow;
  isComplete: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export const FollowAlong = ({ flow, isComplete, onComplete, onClose }: FollowAlongProps) => {
  const reducer = useMemo(() => makeReducer(flow), [flow]);
  const [s, dispatch] = useReducer(reducer, flow, initial);
  const prefs = usePrefs();
  const node = flow.nodes[s.nodeId];
  const go = useCallback((target: Target, effect?: Effect, demo?: Demo) => dispatch({ type: 'go', target, effect, demo }), []);

  const seqNode = node.kind === 'sequence' ? (node as SequenceNode) : null;
  const seqMoves = seqNode ? sequenceMoves(seqNode) : [];
  const seqKey = seqMoves.join(' ');

  // Someone following along has a cube in both hands: don't let the screen sleep.
  useWakeLock();

  // Sets of turns done at least once (on any earlier visit too) can be done "from memory" in one tap.
  const [known, setKnown] = useState<string[]>(getKnownMoves);
  useEffect(() => {
    if (!seqNode || s.phase !== 'checkpoint' || known.includes(seqKey)) return;
    markMoveKnown(seqKey);
    setKnown((k) => [...k, seqKey]);
  }, [seqNode, s.phase, seqKey, known]);
  const canDoFromMemory = seqMoves.length >= 3 && known.includes(seqKey);

  // Save the exact screen after every change, so a locked phone or a reload resumes right here.
  useEffect(() => {
    saveGuideState(flow.stageId, FLOW_VERSION, node.kind === 'finish' ? null : s);
  }, [flow.stageId, node.kind, s]);

  const undoMove = s.undo ? inverseMove(s.undo.log.moves[s.undo.log.moves.length - 1 - s.undo.index]) : null;
  const onMoveScreen = Boolean(seqNode && s.phase === 'moves' && !s.undone && !s.memory && !s.undo);
  const activeMove: MoveName | null = undoMove ?? (onMoveScreen ? seqMoves[s.moveIndex] : node.kind === 'adjust' && !s.undone ? node.move : null);
  const canUndoSequence = Boolean((s.current && s.current.moves.length) || s.last?.moves.length);

  // What "Listen" reads on this screen.
  const spoken = undoMove ? MOVE_TEXT[undoMove]
    : onMoveScreen ? MOVE_TEXT[seqMoves[s.moveIndex]]
      : seqNode && s.phase === 'checkpoint' ? seqNode.checkpoint.title
        : node.kind === 'sequence' ? node.name : node.title;
  useEffect(() => {
    if (prefs.readAloud) speak(spoken);
    return stopSpeaking;
  }, [prefs.readAloud, spoken, s.nodeId, s.moveIndex, s.phase]);

  // Hands-free: on a plain move screen, go on by itself after a few seconds. Checks and questions always wait.
  const handsFree = prefs.handsFree && onMoveScreen && !s.sheet;
  useEffect(() => {
    if (!handsFree) return;
    const timer = setTimeout(() => dispatch({ type: 'moveDone' }), HANDS_FREE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [handsFree, s.nodeId, s.moveIndex]);

  // Tapping the face that should turn counts as "I did it".
  const onFaceClick = useCallback((face: Face) => {
    if (!activeMove || MOVE_FACE[activeMove[0]] !== face) return;
    if (s.undo) dispatch({ type: 'undoMoveDone' });
    else if (seqNode && s.phase === 'moves') dispatch({ type: 'moveDone' });
  }, [activeMove, s.undo, s.phase, seqNode]);

  const atCheckpoint = Boolean(seqNode && s.phase === 'checkpoint' && !s.undo && !s.undone);
  const goal = atCheckpoint ? seqNode!.checkpoint.goal : undefined;
  // A flat picture (looking down at the top) replaces the 3D cube where only the top matters.
  const flatPicture: Picture | null = goal && goal.kind !== 'cube' ? goal : node.kind === 'finish' && node.picture.kind !== 'cube' ? node.picture : null;
  const view = goal?.kind === 'cube' && goal.view ? goal.view : node.view ?? 'top';
  const cubeDemo = goal?.kind === 'cube' ? goal.demo() : node.kind === 'finish' && node.picture.kind === 'cube' ? node.picture.demo() : s.demo;
  const showStage = node.kind !== 'choice';
  const hasGrey = Object.values(cubeDemo.vis).some((face) => face.some((row) => row.some((v) => v === '0')));
  const reassure = s.phase === 'moves' ? seqNode?.reassure?.(s.counters) : undefined;
  const goNumber = seqNode?.repeat ? (s.counters[seqNode.repeat] ?? 0) + (s.phase === 'moves' ? 1 : 0) : 0;
  const instruction = cn('font-bold leading-tight text-foreground', prefs.bigText ? 'text-3xl' : 'text-2xl');
  const title = cn('font-bold leading-snug text-foreground', prefs.bigText ? 'text-2xl' : 'text-xl');
  const body = cn('text-muted-foreground', prefs.bigText ? 'text-lg' : 'text-base');

  // ---------------- control panel by screen type
  let controls: React.ReactNode;

  if (s.undone) {
    controls = (
      <div className="flex flex-col gap-2">
        <p className={title}>Your cube is back to how it was before "{s.undone.name}".</p>
        <p className={body}>Nothing else needs to restart.</p>
        <BigButton onClick={() => dispatch({ type: 'retryAfterUndo' })}>Try "{s.undone.name}" again</BigButton>
        <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStep' })}>Restart this step instead</BigButton>
      </div>
    );
  } else if (s.undo && undoMove) {
    const total = s.undo.log.moves.length;
    controls = (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Undoing "{s.undo.log.name}" on your real cube</p>
        <p className={instruction} data-testid="move-instruction">{MOVE_TEXT[undoMove]}</p>
        <p className="text-sm text-muted-foreground">{prefs.letters ? <><code className="font-mono" data-testid="letter">{undoMove}</code> · </> : null}Undo move {s.undo.index + 1} of {total}</p>
        <BigButton onClick={() => dispatch({ type: 'undoMoveDone' })}>I did it — next undo move</BigButton>
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'undoMoveBack' })} disabled={s.undo.index === 0}><ArrowLeft className="h-5 w-5" />Back one</SmallButton>
          <SmallButton onClick={() => dispatch({ type: 'stopUndo' })}><X className="h-5 w-5" />Stop undoing</SmallButton>
        </div>
      </div>
    );
  } else if (seqNode && s.phase === 'moves' && s.memory) {
    const left = seqMoves.length - s.moveIndex;
    controls = (
      <div className="flex flex-col gap-2" data-testid="memory-screen">
        <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-primary"><Brain className="h-4 w-4" />From memory — {seqNode.name}</p>
        <div className="space-y-1">
          {seqNode.chunks.map((ch, i) => (
            <p key={i} className={cn('font-bold leading-snug text-foreground', prefs.bigText ? 'text-2xl' : 'text-xl')}>{ch.phrase.split(', ').join(' · ')}</p>
          ))}
        </div>
        <p className={body}>Say it out loud as you turn.</p>
        <BigButton onClick={() => dispatch({ type: 'allDone' })} data-testid="memory-done"><Check className="h-5 w-5" />Done — I did all {left} turns</BigButton>
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'memory', open: false })}><ArrowLeft className="h-5 w-5" />Show me one turn at a time</SmallButton>
        </div>
      </div>
    );
  } else if (seqNode && s.phase === 'moves') {
    const move = seqMoves[s.moveIndex];
    let offset = 0;
    const chunkIndex = seqNode.chunks.findIndex((ch) => { if (s.moveIndex < offset + ch.moves.length) return true; offset += ch.moves.length; return false; });
    const chunkInfo = seqNode.chunks[chunkIndex];
    // One phrase per turn: light up the one being done, so the words sink in.
    const words = chunkInfo.phrase.split(', ');
    const wordIndex = s.moveIndex - offset;
    const showIntro = s.moveIndex === 0 && seqNode.intro && goNumber <= 1;
    controls = (
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold leading-snug text-primary" data-testid="chant">
          <span className="uppercase">{seqNode.chunks.length > 1 ? `Part ${chunkIndex + 1} of ${seqNode.chunks.length}: ` : ''}{chunkInfo.name}</span>
          {words.length > 1 ? <>{' — '}{words.map((w, i) => (
            <span key={i}>
              <span className={cn(i === wordIndex ? 'rounded bg-primary px-1 py-0.5 text-primary-foreground' : 'text-muted-foreground')} data-current={i === wordIndex || undefined}>{w}</span>
              {i < words.length - 1 ? <span className="text-muted-foreground">{', '}</span> : null}
            </span>
          ))}</> : null}
          <span className="font-normal text-muted-foreground"> · <span data-testid="move-progress">Move {s.moveIndex + 1} of {seqMoves.length}</span></span>
        </p>
        <p className={instruction} data-testid="move-instruction">{MOVE_TEXT[move]}</p>
        {showIntro ? <p className={body}>{seqNode.intro}</p> : MOVE_HINT[move] && !prefs.bigText ? <p className={body}>{MOVE_HINT[move]}</p> : null}
        {prefs.letters || handsFree ? (
          <p className="text-sm text-muted-foreground">
            {prefs.letters ? <>Letter: <code className="font-mono text-base font-bold text-foreground" data-testid="letter">{move}</code></> : null}
            {prefs.letters && handsFree ? ' · ' : ''}
            {handsFree ? <span data-testid="hands-free">Next move by itself in {HANDS_FREE_SECONDS} seconds</span> : null}
          </p>
        ) : null}
        <BigButton onClick={() => dispatch({ type: 'moveDone' })} data-testid="next-move">I did it — next move</BigButton>
        <div className="flex gap-2">
          {s.moveIndex === 0 && canDoFromMemory ? (
            <SmallButton onClick={() => dispatch({ type: 'memory', open: true })} data-testid="know-it"><Zap className="h-5 w-5 shrink-0" />I know this one</SmallButton>
          ) : (
            <SmallButton onClick={() => dispatch({ type: 'moveBack' })} disabled={s.moveIndex === 0}><ArrowLeft className="h-5 w-5" />Back one move</SmallButton>
          )}
          <ListenButton text={spoken} />
        </div>
      </div>
    );
  } else if (seqNode && s.phase === 'checkpoint') {
    const cp = seqNode.checkpoint;
    controls = (
      <div className="flex flex-col gap-2" data-testid="checkpoint">
        <p className="text-sm font-semibold uppercase tracking-wide text-cube-green">Check your cube{goNumber ? ` · after go ${goNumber}` : ''}</p>
        <p className={title}>{cp.title}</p>
        {cp.body ? <p className={body}>{cp.body}</p> : null}
        <BigButton onClick={() => go(cp.yes.next, cp.yes.effect)}><Check className="h-5 w-5" />{cp.yes.label}</BigButton>
        {cp.notYet ? <BigButton variant="secondary" onClick={() => go(cp.notYet!.next, cp.notYet!.effect)}><RotateCcw className="h-5 w-5" />{cp.notYet.label}</BigButton> : null}
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'moveBack' })}><ArrowLeft className="h-5 w-5" />Back one move</SmallButton>
          <SmallButton onClick={() => dispatch({ type: 'sheet', open: true })}><AlertTriangle className="h-5 w-5 shrink-0" />No, mine looks different</SmallButton>
        </div>
      </div>
    );
  } else if (node.kind === 'choice') {
    const n = node.options.length;
    const cols = n >= 5 ? 3 : n === 4 ? 2 : n;
    const size = n >= 5 ? 66 : n === 4 ? 78 : n === 3 ? 90 : 120;
    controls = (
      <div className="flex h-full flex-col gap-2">
        <p className={title}>{node.title}</p>
        <div className={cn('grid gap-2', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')} data-testid="picker">
          {node.options.map((o: ChoiceOption) => (
            <button
              key={o.label}
              type="button"
              onClick={() => go(o.next, o.effect, o.demo?.())}
              className="flex min-h-14 flex-col items-center gap-0.5 rounded-xl border-2 border-border bg-background px-1 py-1.5 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              {o.picture ? <PictureView picture={o.picture} size={size} /> : null}
              <span className="text-sm font-semibold leading-tight text-foreground">{o.label}</span>
              {o.detail ? <span className="text-sm leading-tight text-muted-foreground">{o.detail}</span> : null}
            </button>
          ))}
        </div>
        <SmallButton onClick={() => dispatch({ type: 'help', open: true })} className="flex-none" data-testid="not-sure"><HelpCircle className="h-5 w-5" />None of these / I'm not sure</SmallButton>
      </div>
    );
  } else if (node.kind === 'adjust' || node.kind === 'info') {
    const target = node.kind === 'adjust' ? node.target : undefined;
    controls = (
      <div className="flex flex-col gap-2">
        {node.kind === 'adjust' ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">Turn until it lines up</p> : null}
        <div className="flex items-start gap-3">
          <p className={cn(title, 'min-w-0 flex-1')} data-testid="move-instruction">{node.title}</p>
          {target ? <span className="shrink-0" data-testid="target-picture"><PictureView picture={target} size={84} /></span> : null}
        </div>
        {node.body ? <p className={body}>{node.body}</p> : null}
        <div className="flex gap-2">
          <BigButton onClick={() => {
            if (node.kind === 'adjust') go(node.next, undefined, node.demoAfter(s.demo));
            else go(node.next, node.effect, node.demoAfter ? node.demoAfter(s.demo) : undefined);
          }} data-testid="continue">{node.button}</BigButton>
        </div>
        <div className="flex gap-2"><ListenButton text={spoken} /></div>
      </div>
    );
  } else if (node.kind === 'finish') {
    const summary = CHEAT_SHEET.find((x) => x.stage === flow.stageId);
    controls = (
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-bold text-foreground">{node.title}</p>
        <p className={body}>{node.body}</p>
        {summary ? (
          <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-base leading-snug text-foreground" data-testid="remember">
            <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-primary"><Brain className="h-4 w-4" />Remember</span>
            {summary.rule}
          </p>
        ) : null}
        <BigButton onClick={() => { if (!isComplete) onComplete(); }} aria-pressed={isComplete}>
          <Check className="h-5 w-5" />{isComplete ? 'Stage Complete!' : 'Complete Stage'}
        </BigButton>
        <BigButton variant="secondary" onClick={onClose}>Close guide</BigButton>
      </div>
    );
  }

  const counterNote = s.restored ? 'Resumed' : undefined;

  return (
    <div className="relative flex h-full flex-col overflow-hidden" data-testid="follow-along" data-node={s.nodeId}>
      <OrientationBanner onMessedUp={s.undo || s.undone ? undefined : () => dispatch({ type: 'sheet', open: true })} />
      {(!showStage || flatPicture) && (node.counters?.length || counterNote) ? <CounterChips items={node.counters ?? []} counters={s.counters} note={counterNote} /> : null}
      {reassure && !s.undo && !s.undone ? (
        <p className="shrink-0 bg-sky-100 px-3 py-1.5 text-base font-medium text-sky-950 dark:bg-sky-900/50 dark:text-sky-100" role="status" data-testid="reassure">{reassure}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showStage ? (
          <div className="relative min-h-[112px] flex-1 bg-muted/30">
            {!flatPicture && (node.counters?.length || counterNote) ? <CounterChips items={node.counters ?? []} counters={s.counters} note={counterNote} overlay /> : null}
            {flatPicture ? (
              <div className="absolute inset-0 flex items-center justify-center p-1" data-testid="flat-picture">
                <PictureView picture={flatPicture} size={132} />
              </div>
            ) : (
              <InteractiveCube3D
                className="absolute inset-0"
                colors={cubeDemo.colors}
                vis={cubeDemo.vis}
                move={activeMove}
                view={view}
                onFaceClick={onFaceClick}
                label={activeMove ? `Cube showing the move: ${MOVE_TEXT[activeMove]}` : 'Cube picture'}
              />
            )}
            {onMoveScreen && goNumber > 1 ? (
              <span className="absolute right-2 top-2 rounded-xl bg-primary px-3 py-1 text-lg font-bold text-primary-foreground" data-testid="go-number">Go {goNumber}</span>
            ) : null}
            {!flatPicture && (atCheckpoint || node.kind === 'finish' || hasGrey) ? (
              <span className="absolute bottom-1 right-1 max-w-[62%] rounded-lg bg-background/90 px-2 py-0.5 text-right text-sm font-semibold leading-tight text-foreground" data-testid="grey-note">
                {atCheckpoint || node.kind === 'finish' ? 'Your cube should look like this' : ''}{(atCheckpoint || node.kind === 'finish') && hasGrey ? ' · ' : ''}{hasGrey ? 'dark grey = any color' : ''}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className={cn('overflow-y-auto p-2.5 md:w-[420px] md:max-h-none md:border-l md:border-border md:p-4', showStage ? 'max-h-[85%] shrink-0' : 'min-h-0 flex-1')}>{controls}</div>
      </div>

      {s.help && node.kind === 'choice' ? (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/50" role="dialog" aria-modal="true" aria-label="Help choosing a picture">
          <div className="max-h-full space-y-2 overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl" data-testid="help-sheet">
            <p className="text-xl font-bold text-foreground">No problem. Take these 3 checks, in order.</p>
            <ol className="space-y-2">
              {node.help.map((line, i) => (
                <li key={i} className="flex gap-3 text-base leading-snug text-foreground">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            <BigButton onClick={() => dispatch({ type: 'help', open: false })}>Back to the pictures</BigButton>
            <BigButton variant="secondary" onClick={() => dispatch({ type: 'sheet', open: true })}>My cube looks wrong — I messed up</BigButton>
          </div>
        </div>
      ) : null}

      {s.sheet ? (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/50" role="dialog" aria-modal="true" aria-label="I messed up">
          <div className="max-h-full space-y-2 overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl">
            <p className="text-xl font-bold text-foreground">No problem — let's fix your real cube.</p>
            <p className="text-base text-muted-foreground">You never have to restart the whole stage for one wrong turn.</p>
            <BigButton onClick={() => dispatch({ type: 'startUndo' })} disabled={!canUndoSequence}>
              <Undo2 className="h-5 w-5 shrink-0" />Undo my last turns on my real cube
            </BigButton>
            {!canUndoSequence ? <p className="text-sm text-muted-foreground">(No turns done yet on this step, so there's nothing to undo.)</p> : null}
            <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStep' })}>Restart this step</BigButton>
            <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStage' })}>Restart this stage</BigButton>
            <SmallButton onClick={() => dispatch({ type: 'sheet', open: false })}>Never mind</SmallButton>
          </div>
        </div>
      ) : null}
    </div>
  );
};

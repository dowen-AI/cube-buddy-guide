import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Brain, Check, HelpCircle, LifeBuoy, PartyPopper, RotateCcw, Undo2, Volume2, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CUBE_COLORS, type MoveName } from '@/hooks/useCubeState';
import { InteractiveCube3D } from '@/components/InteractiveCube3D';
import { FromBelowNote, PictureView } from './Pictures';
import { MOVE_HINT, MOVE_TEXT, inverseMove, isDoubleMove } from '@/lib/moves';
import { ANY_COLOR, MOVE_FACE, type Face } from '@/lib/cubeGeometry';
import { applyStep, type Demo } from '@/lib/cubeDemo';
import { getKnownMoves, loadGuideState, markMoveKnown, saveGuideState, usePrefs } from '@/lib/guideMemory';
import { canSpeak, speak, stopSpeaking } from '@/lib/speak';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  applyEffect, resolveTarget, sequenceMoves, startDemo, CHEAT_SHEET, FLOW_VERSION, TAP_HINT,
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
  again?: boolean; // sent round the stage once more from its finish screen ("mine looks different")
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
  | { type: 'again' }
  | { type: 'startUndo' }
  | { type: 'undoMoveDone' }
  | { type: 'undoMoveBack' }
  | { type: 'retryAfterUndo' }
  | { type: 'stopUndo' };

const fresh = (flow: StageFlow): State => {
  const demo = startDemo(flow);
  return {
    nodeId: flow.start, counters: {}, demo, moveIndex: 0, phase: 'moves', current: null, last: null,
    stepStart: { demo, counters: {} }, sheet: false, help: false, undo: null, undone: null, memory: false, restored: false, again: false,
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
      return enter(flow, { ...s, counters, demo: a.demo ?? s.demo, restored: false, again: false }, resolveTarget(a.target, counters));
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
    case 'again':
      return { ...fresh(flow), again: true };
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

const Swatch = ({ color }: { color: string }) => <span aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] border border-black/50 dark:border-white/70" style={{ backgroundColor: color }} />;

// The cube is never flipped, so this says the same thing on every screen of every stage.
// It names the CENTER square: on a scrambled cube that is the only yellow that tells you which way is up.
const OrientationBanner = ({ onMessedUp }: { onMessedUp?: () => void }) => (
  <div className="guide-banner flex min-h-14 shrink-0 items-center gap-2 bg-amber-100 py-1 pl-3 pr-1 text-amber-950 dark:bg-amber-900/50 dark:text-amber-50">
    <span role="note" aria-label="How to hold your cube" className="min-w-0 flex-1 text-[15px] font-bold leading-tight" data-testid="orientation">
      <span className="flex items-center gap-1.5"><Swatch color={CUBE_COLORS.yellow} />Yellow center on top</span>
      <span className="mt-0.5 flex items-center gap-1.5"><Swatch color={CUBE_COLORS.white} />White center on bottom</span>
    </span>
    {onMessedUp ? (
      <button type="button" onClick={onMessedUp} className="flex min-h-14 shrink-0 items-center gap-1 rounded-lg border border-current/20 bg-background/80 px-2 text-sm font-semibold text-foreground hover:bg-background" data-testid="messed-up">
        <LifeBuoy className="h-5 w-5" />I messed up
      </button>
    ) : null}
  </div>
);

// Progress ("2 of 4 placed", "Goes done: 1"). It lives in the stage's title bar, so it never
// covers the cube picture and never costs a row of its own.
const CounterChips = ({ items, counters, note }: { items: CounterDisplay[]; counters: Counters; note?: string }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-tight" aria-live="polite" data-testid="counters">
    {items.map((c) => {
      const value = counters[c.key] ?? 0;
      return (
        <div key={c.key} className="flex min-w-0 items-center gap-1.5" data-counter={c.key} data-value={value} aria-label={`${c.label}: ${value}${c.of ? ` of ${c.of}` : ''}`}>
          {c.of ? (
            <>
              <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">{value} of {c.of} <span className="font-normal text-muted-foreground">{c.label.split(' ').pop()}</span></span>
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: c.of }, (_, i) => <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < value ? 'bg-cube-green' : 'bg-muted-foreground/30')} />)}
              </span>
            </>
          ) : (
            <span className="whitespace-nowrap text-muted-foreground">{c.label}: <span className="font-semibold tabular-nums text-foreground">{value}</span></span>
          )}
        </div>
      );
    })}
    {note ? <span className="rounded-full bg-sky-100 px-2 text-sm font-medium text-sky-950 dark:bg-sky-900/50 dark:text-sky-100" role="status" data-testid="restored">{note}</span> : null}
  </div>
);

const BigButton = ({ children, onClick, variant = 'primary', className, ...rest }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex min-h-14 w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-1 text-lg font-semibold leading-tight transition-colors disabled:opacity-40',
      variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-2 border-border bg-background text-foreground hover:bg-muted',
      className,
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

const ListenButton = ({ text, className }: { text: string; className?: string }) =>
  canSpeak() ? (
    <SmallButton onClick={() => speak(text)} className={cn('max-w-[9rem]', className)} data-testid="listen" aria-label="Listen to this instruction"><Volume2 className="h-5 w-5 shrink-0" />Listen</SmallButton>
  ) : null;

// "Not yet — do the 4 turns again" is shown as two lines, so two answers fit side by side.
const TwoLine = ({ label }: { label: string }) => {
  const [main, rest] = label.split(' — ');
  return (
    <span className="min-w-0 text-left">
      <span className="block">{main}</span>
      {rest ? <span className="block text-sm font-normal">{rest}</span> : null}
    </span>
  );
};

const HANDS_FREE_SECONDS = 8;

// How far to turn, then how it feels in the hand.
const hintFor = (move: MoveName, firstTimer: boolean) => {
  const amount = isDoubleMove(move) ? 'Two clicks (a half turn). Either way round works.' : firstTimer ? 'One click (a quarter turn).' : 'One click.';
  return MOVE_HINT[move] ? `${amount} ${MOVE_HINT[move]}` : amount;
};

// ---------------------------------------------------------------- main

interface FollowAlongProps {
  flow: StageFlow;
  // the last stage ends the solve; the others lead on to the next stage
  isLast: boolean;
  // the name of the stage that comes next, for the "stage done" screen
  nextTitle?: string;
  // the person says their cube matches the finish picture: the stage is done
  onMatched: () => void;
  // on to the next stage (or, after the last one, close and celebrate)
  onNext: () => void;
  onClose: () => void;
  // ways out for someone who is badly stuck (Stage 1 works from any cube; the solver finishes any cube)
  onStartOver?: () => void;
  onOpenSolver?: () => void;
  // where the progress counter is drawn (a slot in the stage's title bar)
  counterSlot?: HTMLElement | null;
}

export const FollowAlong = ({ flow, isLast, nextTitle, onMatched, onNext, onClose, onStartOver, onOpenSolver, counterSlot }: FollowAlongProps) => {
  const reducer = useMemo(() => makeReducer(flow), [flow]);
  const [s, dispatch] = useReducer(reducer, flow, initial);
  const prefs = usePrefs();
  // Short screens (a small phone with the browser bars showing, or a phone held sideways) get
  // smaller question pictures, so the question still fits on one screen.
  const shortScreen = useMediaQuery('(max-height: 620px)');
  const sideways = useMediaQuery('(orientation: landscape) and (max-height: 480px)');
  const node = flow.nodes[s.nodeId];
  const go = useCallback((target: Target, effect?: Effect, demo?: Demo) => dispatch({ type: 'go', target, effect, demo }), []);

  const seqNode = node.kind === 'sequence' ? (node as SequenceNode) : null;
  const seqMoves = seqNode ? sequenceMoves(seqNode) : [];
  const seqKey = seqMoves.join(' ');

  // Someone following along has a cube in both hands: don't let the screen sleep.
  useWakeLock();

  // The finish screen is two looks: first check the cube against the picture, then (once it
  // matches) what to remember and the way on. Each gets a screen to itself.
  const [matched, setMatched] = useState(false);
  useEffect(() => { setMatched(false); }, [s.nodeId]);

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
  const checkpoint = atCheckpoint ? seqNode!.checkpoint : undefined;
  const goal = checkpoint?.goal;
  // every picture of a stage goes through the stage's display filter (Stage 4 hides everything on top that is not yellow)
  const display = flow.display ?? ((d: Demo) => d);
  // "Turn until it lines up" screens show the finished position, still, so the picture is the target.
  const turnGoal = node.kind === 'adjust' && node.showGoal !== false && !s.undone ? node.demoAfter(s.demo) : null;
  const shown = display(turnGoal ?? (goal?.kind === 'cube' ? goal.demo() : node.kind === 'finish' && node.picture.kind === 'cube' ? node.picture.demo() : s.demo));
  // A flat picture (looking straight down at the top) replaces the 3D cube where only the top matters.
  // It is always drawn from a simulated cube, never from a hand-made table.
  const flatPicture: Picture | null =
    goal && goal.kind !== 'cube' ? goal
      : checkpoint?.flat || (node.kind === 'adjust' && node.flat && turnGoal) ? { kind: 'topface', demo: () => shown }
        : node.kind === 'finish' && node.picture.kind !== 'cube' ? node.picture : null;
  const view = goal?.kind === 'cube' && goal.view ? goal.view : node.view ?? 'top';
  // A second view from underneath wherever the bottom face is what matters.
  const below = Boolean(checkpoint?.alsoBelow || (onMoveScreen && seqNode?.alsoBelow) || (node.kind === 'finish' && node.picture.kind === 'cube' && node.picture.view === 'bottom')) && view !== 'bottom';
  const cubeDemo = shown;
  const stageDone = node.kind === 'finish' && matched && !isLast;
  const showStage = node.kind !== 'choice' && !stageDone;
  const hasGrey = Object.values(cubeDemo.vis).some((face) => face.some((row) => row.some((v) => v === '0')));
  const reassure = s.again ? 'No problem. Go through this stage once more: it only fixes what is still wrong.' : s.phase === 'moves' ? seqNode?.reassure?.(s.counters) : undefined;
  const goNumber = seqNode?.repeat ? (s.counters[seqNode.repeat] ?? 0) + (s.phase === 'moves' ? 1 : 0) : 0;
  const instruction = cn('font-bold leading-tight text-foreground', prefs.bigText ? 'text-3xl' : 'text-2xl');
  const title = cn('font-bold leading-snug text-foreground', prefs.bigText ? 'text-2xl' : 'text-xl');
  const body = cn('text-muted-foreground', prefs.bigText ? 'text-lg' : 'text-base');

  // What the picture is. It sits under the picture, never on top of it.
  const pictureCaption = s.undo || s.undone ? ''
    : turnGoal ? 'Turn until yours looks like this'
      : atCheckpoint ? checkpoint?.caption ?? 'Your cube should look like this'
        : node.kind === 'finish' ? node.caption ?? 'Your cube should look like this' : '';

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
        <BigButton onClick={() => dispatch({ type: 'allDone' })} data-testid="memory-done"><Check className="h-5 w-5 shrink-0" />Done — I did all {left} turns</BigButton>
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
        {/* How far to turn and how it feels. Dropped on very short screens, where the cube needs the room. */}
        {showIntro ? <p className={cn(body, 'guide-extra')}>{seqNode.intro}</p> : !prefs.bigText ? <p className={cn(body, 'guide-extra')} data-testid="move-hint">{hintFor(move, known.length === 0)}</p> : null}
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
        {cp.body ? <p className={cn(body, 'guide-body-text')}>{cp.body}</p> : null}
        {/* "Not yet" is the usual answer on a repeat, so it gets a button as big as "Yes". */}
        <div className="flex gap-2">
          {cp.notYet ? <BigButton variant="secondary" onClick={() => go(cp.notYet!.next, cp.notYet!.effect)} data-testid="not-yet"><RotateCcw className="h-5 w-5 shrink-0" /><TwoLine label={cp.notYet.label} /></BigButton> : null}
          <BigButton onClick={() => go(cp.yes.next, cp.yes.effect)} data-testid="yes"><Check className="h-5 w-5 shrink-0" />{cp.yes.label}</BigButton>
        </div>
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'moveBack' })}><ArrowLeft className="h-5 w-5 shrink-0" />Back one move</SmallButton>
          <SmallButton onClick={() => dispatch({ type: 'sheet', open: true })}><AlertTriangle className="h-5 w-5 shrink-0" />No, mine looks different</SmallButton>
        </div>
      </div>
    );
  } else if (node.kind === 'choice') {
    const n = node.options.length;
    const cols = n >= 5 ? 3 : n === 4 ? 2 : n;
    const size = n >= 4 ? (shortScreen ? 58 : 72) : n === 3 ? (sideways ? 72 : shortScreen ? 80 : 96) : sideways ? 84 : shortScreen ? 104 : 128;
    controls = (
      <div className="flex h-full flex-col gap-2">
        <p className={title}>{node.title}</p>
        {node.body ? <p className={cn(body, node.body === TAP_HINT && 'guide-extra')}>{node.body}</p> : null}
        <div className={cn('guide-picker grid gap-2', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')} style={{ '--options': n } as React.CSSProperties} data-testid="picker">
          {node.options.map((o: ChoiceOption) => (
            <button
              key={o.label}
              type="button"
              onClick={() => go(o.next, o.effect, o.demo?.())}
              className="flex min-h-14 flex-col items-center gap-0.5 rounded-xl border-2 border-border bg-background px-1 py-1 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              {o.picture ? <><PictureView picture={o.picture} size={size} /><FromBelowNote picture={o.picture} /></> : null}
              <span className="text-sm font-semibold leading-tight text-foreground">{o.label}</span>
              {o.detail ? <span className="text-sm leading-tight text-muted-foreground">{o.detail}</span> : null}
            </button>
          ))}
        </div>
        <SmallButton onClick={() => dispatch({ type: 'help', open: true })} className="flex-none" data-testid="not-sure"><HelpCircle className="h-5 w-5" />None of these / I'm not sure</SmallButton>
      </div>
    );
  } else if (node.kind === 'adjust' || node.kind === 'info') {
    controls = (
      <div className="flex flex-col gap-2">
        {node.kind === 'adjust' ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{node.showGoal === false ? 'One click of the top' : 'Turn until it lines up'}</p> : null}
        <p className={title} data-testid="move-instruction">{node.title}</p>
        {node.body ? <p className={cn(body, 'guide-body-text')}>{node.body}</p> : null}
        <div className="flex gap-2">
          <BigButton className="flex-1" onClick={() => {
            if (node.kind === 'adjust') go(node.next, undefined, node.demoAfter(s.demo));
            else go(node.next, node.effect, node.demoAfter ? node.demoAfter(s.demo) : undefined);
          }} data-testid="continue">{node.button}</BigButton>
          <ListenButton text={spoken} className="flex-none px-3" />
        </div>
      </div>
    );
  } else if (node.kind === 'finish' && stageDone) {
    const summary = CHEAT_SHEET.find((x) => x.stage === flow.stageId);
    controls = (
      <div className="flex h-full flex-col gap-3" data-testid="stage-done">
        <p className="flex items-center gap-2 text-2xl font-bold leading-tight text-foreground">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cube-green text-white"><Check className="h-5 w-5" /></span>
          {node.title}
        </p>
        <p className={body}>Stage {flow.stageId} of 7 done.</p>
        {summary ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5" data-testid="remember">
            <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-primary"><Brain className="h-4 w-4" />Remember this stage</p>
            <p className={cn('mt-1 leading-snug text-foreground', prefs.bigText ? 'text-xl' : 'text-lg')}>{summary.rule}</p>
            {summary.move ? <p className="guide-extra mt-1.5 text-base leading-snug text-muted-foreground"><span className="font-semibold text-foreground">{summary.move.name}:</span> {summary.move.chant}</p> : null}
          </div>
        ) : null}
        {nextTitle ? <p className={body}>Next: <span className="font-semibold text-foreground">Stage {flow.stageId + 1}, {nextTitle}</span></p> : null}
        <div className="flex gap-2">
          <SmallButton onClick={onClose} className="flex-none px-3" data-testid="finish-close"><X className="h-5 w-5 shrink-0" />Stop here</SmallButton>
          <BigButton onClick={onNext} className="flex-1" data-testid="finish-next">Next stage<ArrowRight className="h-5 w-5 shrink-0" /></BigButton>
        </div>
        <p className="guide-extra text-sm text-muted-foreground">Stopping is fine: this stage is saved as done.</p>
      </div>
    );
  } else if (node.kind === 'finish') {
    controls = (
      <div className="flex flex-col gap-2" data-testid="finish">
        <p className="text-sm font-semibold uppercase tracking-wide text-cube-green">Last check of this stage</p>
        <p className={title}>{isLast ? 'Is every side of your cube one color?' : 'Does your cube look like this?'}</p>
        <p className={cn(body, 'guide-body-text')}>{node.body}</p>
        {/* Saying "mine matches" is the last check of the stage: nothing is counted for the person. */}
        <BigButton onClick={() => { onMatched(); if (isLast) onNext(); else setMatched(true); }} data-testid="finish-match">
          {isLast ? <><PartyPopper className="h-5 w-5 shrink-0" />Mine is solved!</> : <><Check className="h-5 w-5 shrink-0" />Mine matches</>}
        </BigButton>
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'again' })} data-testid="finish-different"><AlertTriangle className="h-5 w-5 shrink-0" />Mine looks different</SmallButton>
          <SmallButton onClick={onClose} data-testid="finish-close"><X className="h-5 w-5 shrink-0" />Close</SmallButton>
        </div>
      </div>
    );
  }

  // Leaving through a way out: the cube is about to change completely, so the place kept in this stage is dropped.
  const leaveStage = (to?: () => void) => (to ? () => { saveGuideState(flow.stageId, FLOW_VERSION, null); to(); } : undefined);
  const startOver = leaveStage(onStartOver);
  const openSolver = leaveStage(onOpenSolver);

  const counterNote = s.restored ? 'Resumed' : undefined;
  const hasCounters = Boolean(node.counters?.length || counterNote);

  return (
    <div className="guide-root relative flex h-full flex-col overflow-hidden" data-testid="follow-along" data-node={s.nodeId}>
      <OrientationBanner onMessedUp={s.undo || s.undone ? undefined : () => dispatch({ type: 'sheet', open: true })} />
      {counterSlot && hasCounters && !stageDone ? createPortal(<CounterChips items={node.counters ?? []} counters={s.counters} note={counterNote} />, counterSlot) : null}
      {reassure && !s.undo && !s.undone ? (
        <p className="guide-reassure shrink-0 bg-sky-100 px-3 py-1.5 text-base font-medium leading-snug text-sky-950 dark:bg-sky-900/50 dark:text-sky-100" role="status" data-testid="reassure">{reassure}</p>
      ) : null}
      <div className="guide-body">
        {showStage ? (
          <div className="flex min-h-[112px] min-w-0 flex-1 flex-col bg-muted/30 dark:bg-slate-800/40" data-testid="stage">
            <div className="relative min-h-0 flex-1">
              {flatPicture ? (
                <div className="absolute inset-1.5 flex items-center justify-center" data-testid="flat-picture">
                  <div className="h-full max-h-[240px] w-full max-w-[240px]"><PictureView picture={flatPicture} fit /></div>
                </div>
              ) : (
                <InteractiveCube3D
                  className="absolute inset-0"
                  colors={cubeDemo.colors}
                  vis={cubeDemo.vis}
                  move={activeMove}
                  view={view}
                  animate={!turnGoal}
                  extraView={below ? 'bottom' : undefined}
                  onFaceClick={onFaceClick}
                  label={activeMove ? `Cube showing the move: ${MOVE_TEXT[activeMove]}` : 'Cube picture'}
                />
              )}
              {onMoveScreen && goNumber > 1 ? (
                <span className="absolute right-2 top-2 rounded-xl bg-primary px-3 py-1 text-lg font-bold text-primary-foreground" data-testid="go-number">Go {goNumber}</span>
              ) : null}
            </div>
            {flatPicture ? (
              <p className="shrink-0 px-2 pb-0.5 text-center text-sm font-semibold leading-tight text-foreground" data-testid="picture-caption">
                ▼ FRONT (toward you){pictureCaption && pictureCaption !== 'Your cube should look like this' ? <span className="block font-medium text-muted-foreground">{pictureCaption}</span> : null}
              </p>
            ) : pictureCaption || hasGrey ? (
              <p className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 px-2.5 py-0.5 text-sm font-semibold leading-tight text-foreground" data-testid="picture-caption">
                <span data-testid="grey-note">{pictureCaption}</span>
                {hasGrey ? <span className="ml-auto flex items-center gap-1.5 font-medium" data-testid="grey-key"><Swatch color={ANY_COLOR} />= any color</span> : null}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={cn('guide-controls', showStage ? 'guide-controls-with-picture' : 'min-h-0 flex-1')}>{controls}</div>
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
          <div className="max-h-full space-y-2 overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl" data-testid="recovery-sheet">
            <p className="text-xl font-bold text-foreground">No problem — let's fix your real cube.</p>
            <p className="text-base text-muted-foreground">You never have to restart the whole stage for one wrong turn.</p>
            <BigButton onClick={() => dispatch({ type: 'startUndo' })} disabled={!canUndoSequence}>
              <Undo2 className="h-5 w-5 shrink-0" />Undo my last turns on my real cube
            </BigButton>
            {!canUndoSequence ? <p className="text-sm text-muted-foreground">(No turns done yet on this step, so there's nothing to undo.)</p> : null}
            <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStep' })}>Restart this step</BigButton>
            <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStage' })}>Restart this stage</BigButton>
            {startOver || openSolver ? (
              <div className="rounded-xl border border-border p-2" data-testid="ways-out">
                <p className="text-base leading-snug text-muted-foreground">
                  <span className="font-semibold text-foreground">Badly mixed up?</span> {startOver ? 'Stage 1 works from any cube, and the solver can finish any cube.' : 'The solver can finish any cube: copy your colors in and follow its turns.'}
                </p>
                <div className="mt-2 flex gap-2">
                  {startOver ? <SmallButton onClick={startOver} data-testid="start-over">Go back to Stage 1</SmallButton> : null}
                  {openSolver ? <SmallButton onClick={openSolver} data-testid="open-solver">Solve it for me</SmallButton> : null}
                </div>
              </div>
            ) : null}
            <SmallButton onClick={() => dispatch({ type: 'sheet', open: false })} className="w-full">Never mind</SmallButton>
          </div>
        </div>
      ) : null}
    </div>
  );
};

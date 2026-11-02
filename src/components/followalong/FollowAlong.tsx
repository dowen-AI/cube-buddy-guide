import { useCallback, useMemo, useReducer } from 'react';
import { AlertTriangle, ArrowLeft, Check, LifeBuoy, RotateCcw, Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MoveName } from '@/hooks/useCubeState';
import { InteractiveCube3D } from '@/components/InteractiveCube3D';
import { CubePicture, TopPatternPicture } from './Pictures';
import { MOVE_HINT, MOVE_TEXT, inverseMove, isDoubleMove } from '@/lib/moves';
import { MOVE_FACE, type Face } from '@/lib/cubeGeometry';
import { applyStep, solvedFor, type Demo, type Hold } from '@/lib/cubeDemo';
import {
  applyEffect, resolveTarget, sequenceMoves, startDemo,
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
  undo: { log: SeqLog; index: number } | null;
  undone: SeqLog | null;
}

type Action =
  | { type: 'go'; target: Target; effect?: Effect; demo?: Demo }
  | { type: 'moveDone' }
  | { type: 'moveBack' }
  | { type: 'sheet'; open: boolean }
  | { type: 'restartStep' }
  | { type: 'restartStage' }
  | { type: 'startUndo' }
  | { type: 'undoMoveDone' }
  | { type: 'undoMoveBack' }
  | { type: 'retryAfterUndo' }
  | { type: 'stopUndo' };

const initial = (flow: StageFlow): State => {
  const demo = startDemo(flow);
  return {
    nodeId: flow.start, counters: {}, demo, moveIndex: 0, phase: 'moves', current: null, last: null,
    stepStart: { demo, counters: {} }, sheet: false, undo: null, undone: null,
  };
};

const makeReducer = (flow: StageFlow) => (s: State, a: Action): State => {
  const node = flow.nodes[s.nodeId];
  const enter = (base: State, id: string): State => {
    const next = flow.nodes[id];
    const entered: State = { ...base, nodeId: id, moveIndex: 0, phase: 'moves', current: null, sheet: false, undone: null };
    if (next.id === next.step) entered.stepStart = { demo: entered.demo, counters: entered.counters };
    if (next.kind === 'sequence') {
      entered.current = { nodeId: id, name: next.name, moves: [], countersBefore: entered.counters, demoBefore: entered.demo };
    }
    return entered;
  };
  switch (a.type) {
    case 'go': {
      const counters = applyEffect(s.counters, a.effect);
      return enter({ ...s, counters, demo: a.demo ?? s.demo }, resolveTarget(a.target, counters));
    }
    case 'moveDone': {
      if (node.kind !== 'sequence' || !s.current || s.phase !== 'moves') return s;
      const moves = sequenceMoves(node);
      const move = moves[s.moveIndex];
      const current = { ...s.current, moves: [...s.current.moves, move] };
      const demo = applyStep(s.demo, move);
      if (s.moveIndex + 1 < moves.length) return { ...s, demo, current, moveIndex: s.moveIndex + 1 };
      return { ...s, demo, current, last: current, phase: 'checkpoint', counters: applyEffect(s.counters, node.onDone) };
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
    case 'restartStep':
      return enter({ ...s, demo: s.stepStart.demo, counters: s.stepStart.counters }, node.step);
    case 'restartStage':
      return initial(flow);
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
      return { ...enter({ ...s, demo: log.demoBefore, counters: log.countersBefore, last: null }, log.nodeId) };
    }
    case 'stopUndo':
      return { ...s, undo: null };
  }
};

// ---------------------------------------------------------------- small pieces

const holdText = (hold: Hold) => (hold === 'yellow-top' ? { top: 'YELLOW', bottom: 'WHITE' } : { top: 'WHITE', bottom: 'YELLOW' });

const OrientationBanner = ({ hold, loudFlip, onMessedUp }: { hold: Hold; loudFlip?: string; onMessedUp?: () => void }) => {
  const t = holdText(hold);
  const flipped = hold === 'white-top';
  return (
    <div
      className={cn(
        'flex min-h-12 shrink-0 items-center gap-2 py-0.5 pl-3 pr-1 text-sm',
        loudFlip ? 'bg-amber-400 text-black font-bold' : flipped ? 'bg-amber-100 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100 font-semibold' : 'bg-muted text-foreground',
      )}
    >
      <CubePicture colors={solvedFor(hold)} size={28} title={`Mini cube: ${t.top.toLowerCase()} on top`} />
      <span role="note" aria-label="How to hold your cube" className="min-w-0 flex-1 leading-tight" data-testid="orientation">
        {loudFlip ?? (flipped ? `Hold it FLIPPED: ${t.top} on top, ${t.bottom} on bottom` : `Hold it: ${t.top} on top, ${t.bottom} on bottom`)}
      </span>
      {onMessedUp ? (
        <button type="button" onClick={onMessedUp} className="flex min-h-12 shrink-0 items-center gap-1 rounded-lg border border-current/20 bg-background/70 px-2 text-xs font-semibold text-foreground hover:bg-background" data-testid="messed-up">
          <LifeBuoy className="h-4 w-4" />I messed up
        </button>
      ) : null}
    </div>
  );
};

const CounterRow = ({ items, counters }: { items: CounterDisplay[]; counters: Counters }) => (
  <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-0.5 border-b border-border px-3 py-1" aria-live="polite">
    {items.map((c) => {
      const value = counters[c.key] ?? 0;
      return (
        <div key={c.key} className="flex items-center gap-2 text-sm" data-counter={c.key}>
          <span className="text-muted-foreground">{c.label}:</span>
          {c.of ? (
            <>
              <span className="font-bold tabular-nums text-foreground">{value} of {c.of}</span>
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: c.of }, (_, i) => <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < value ? 'bg-cube-green' : 'bg-muted-foreground/30')} />)}
              </span>
            </>
          ) : (
            <span className="font-bold tabular-nums text-foreground">{value}{c.until ? <span className="font-normal text-muted-foreground"> — {c.until}</span> : null}</span>
          )}
        </div>
      );
    })}
  </div>
);

const PictureView = ({ picture, size = 72 }: { picture: Picture; size?: number }) =>
  picture.kind === 'pattern' ? <TopPatternPicture pattern={picture.pattern} size={size} /> : <CubePicture demo={picture.demo()} view={picture.view} size={size} />;

const BigButton = ({ children, onClick, variant = 'primary', ...rest }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors',
      variant === 'primary' ? 'min-h-14 bg-primary text-primary-foreground hover:bg-primary/90' : 'min-h-12 border-2 border-border bg-background text-foreground hover:bg-muted',
    )}
    {...rest}
  >
    {children}
  </button>
);

const SmallButton = ({ children, onClick, disabled, ...rest }: { children: React.ReactNode; onClick: () => void; disabled?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
    {...rest}
  >
    {children}
  </button>
);

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
  const node = flow.nodes[s.nodeId];
  const go = useCallback((target: Target, effect?: Effect, demo?: Demo) => dispatch({ type: 'go', target, effect, demo }), []);

  const seqNode = node.kind === 'sequence' ? (node as SequenceNode) : null;
  const seqMoves = seqNode ? sequenceMoves(seqNode) : [];
  const undoMove = s.undo ? inverseMove(s.undo.log.moves[s.undo.log.moves.length - 1 - s.undo.index]) : null;
  const activeMove: MoveName | null = undoMove ?? (seqNode && s.phase === 'moves' && !s.undone ? seqMoves[s.moveIndex] : node.kind === 'adjust' && !s.undone ? node.move : null);
  const canUndoSequence = Boolean((s.current && s.current.moves.length) || s.last?.moves.length);

  // Tapping the face that should turn counts as "I did it".
  const onFaceClick = useCallback((face: Face) => {
    if (!activeMove || MOVE_FACE[activeMove[0]] !== face) return;
    if (s.undo) dispatch({ type: 'undoMoveDone' });
    else if (seqNode && s.phase === 'moves') dispatch({ type: 'moveDone' });
  }, [activeMove, s.undo, s.phase, seqNode]);

  const checkpointPicture = seqNode && s.phase === 'checkpoint' ? seqNode.checkpoint.goal : undefined;
  const view = checkpointPicture?.kind === 'cube' && checkpointPicture.view ? checkpointPicture.view : node.view ?? 'top';
  const cubeDemo = checkpointPicture?.kind === 'cube' ? checkpointPicture.demo() : node.kind === 'finish' && node.picture.kind === 'cube' ? node.picture.demo() : s.demo;
  const showCube = node.kind !== 'choice' && !(node.kind === 'finish' && node.picture.kind === 'pattern');
  // On move screens; the checkpoint carries the same reassurance in its own text.
  const reassure = s.phase === 'moves' ? seqNode?.reassure?.(s.counters) : undefined;

  // ---------------- control panel by screen type
  let controls: React.ReactNode;

  if (s.undone) {
    controls = (
      <div className="flex flex-col gap-3">
        <p className="text-xl font-bold leading-snug text-foreground">Your cube should be back to how it was before "{s.undone.name}".</p>
        <p className="text-sm text-muted-foreground">Nothing else needs to restart.</p>
        <BigButton onClick={() => dispatch({ type: 'retryAfterUndo' })}>Try "{s.undone.name}" again</BigButton>
        <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStep' })}>Restart this step instead</BigButton>
      </div>
    );
  } else if (s.undo && undoMove) {
    const total = s.undo.log.moves.length;
    controls = (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Undoing "{s.undo.log.name}" on your real cube</p>
        <p className="text-2xl font-bold leading-tight text-foreground" data-testid="move-instruction">{MOVE_TEXT[undoMove]}</p>
        <p className="text-sm text-muted-foreground"><code className="font-mono">{undoMove}</code> · Undo move {s.undo.index + 1} of {total}</p>
        <BigButton onClick={() => dispatch({ type: 'undoMoveDone' })}>I did it — next undo move</BigButton>
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'undoMoveBack' })} disabled={s.undo.index === 0}><ArrowLeft className="h-4 w-4" />Back one</SmallButton>
          <SmallButton onClick={() => dispatch({ type: 'stopUndo' })}><X className="h-4 w-4" />Stop undoing</SmallButton>
        </div>
      </div>
    );
  } else if (seqNode && s.phase === 'moves') {
    const move = seqMoves[s.moveIndex];
    let offset = 0;
    const chunkIndex = seqNode.chunks.findIndex((ch) => { if (s.moveIndex < offset + ch.moves.length) return true; offset += ch.moves.length; return false; });
    const chunkInfo = seqNode.chunks[chunkIndex];
    controls = (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {seqNode.chunks.length > 1 ? `Part ${chunkIndex + 1} of ${seqNode.chunks.length}: ` : ''}{chunkInfo.name} — <span className="normal-case">{chunkInfo.phrase}</span>
        </p>
        {s.moveIndex === 0 && seqNode.intro ? <p className="text-sm text-muted-foreground">{seqNode.intro}</p> : null}
        <p className="text-2xl font-bold leading-tight text-foreground" data-testid="move-instruction">{MOVE_TEXT[move]}</p>
        {MOVE_HINT[move] && !(s.moveIndex === 0 && seqNode.intro) ? <p className="text-sm text-muted-foreground">{MOVE_HINT[move]}</p> : null}
        <p className="text-sm text-muted-foreground"><code className="font-mono">{move}</code> · <span data-testid="move-progress">Move {s.moveIndex + 1} of {seqMoves.length}</span></p>
        <BigButton onClick={() => dispatch({ type: 'moveDone' })} data-testid="next-move">I did it — next move</BigButton>
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'moveBack' })} disabled={s.moveIndex === 0}><ArrowLeft className="h-4 w-4" />Back one move (tapped too soon)</SmallButton>
        </div>
      </div>
    );
  } else if (seqNode && s.phase === 'checkpoint') {
    const cp = seqNode.checkpoint;
    controls = (
      <div className="flex flex-col gap-2" data-testid="checkpoint">
        <p className="text-xs font-semibold uppercase tracking-wide text-cube-green">Check your cube</p>
        <p className="text-xl font-bold leading-snug text-foreground">{cp.title}</p>
        {cp.body ? <p className="text-sm text-muted-foreground">{cp.body}</p> : null}
        <BigButton onClick={() => go(cp.yes.next, cp.yes.effect)}><Check className="h-5 w-5" />{cp.yes.label}</BigButton>
        {cp.notYet ? <BigButton variant="secondary" onClick={() => go(cp.notYet!.next, cp.notYet!.effect)}><RotateCcw className="h-4 w-4" />{cp.notYet.label}</BigButton> : null}
        <div className="flex gap-2">
          <SmallButton onClick={() => dispatch({ type: 'moveBack' })}><ArrowLeft className="h-4 w-4" />Back one move</SmallButton>
          <SmallButton onClick={() => dispatch({ type: 'sheet', open: true })}><AlertTriangle className="h-4 w-4" />No, mine looks different</SmallButton>
        </div>
      </div>
    );
  } else if (node.kind === 'choice') {
    controls = (
      <div className="flex h-full flex-col gap-1.5">
        <p className="text-base font-bold leading-snug text-foreground">{node.title}</p>
        {node.body ? <p className="text-sm text-muted-foreground">{node.body}</p> : null}
        <div className="flex flex-col gap-1.5">
          {node.options.map((o: ChoiceOption) => (
            <button
              key={o.label}
              type="button"
              onClick={() => go(o.next, o.effect, o.demo?.())}
              className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-border bg-background px-2 py-1 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              {o.picture ? <span className="shrink-0"><PictureView picture={o.picture} size={node.options.length > 4 ? 42 : 52} /></span> : null}
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight text-foreground">{o.label}</span>
                {o.detail ? <span className="block text-xs leading-tight text-muted-foreground">{o.detail}</span> : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  } else if (node.kind === 'adjust' || node.kind === 'info') {
    controls = (
      <div className="flex flex-col gap-2">
        {node.kind === 'adjust' ? <p className="text-xs font-semibold uppercase tracking-wide text-primary">Turn until it lines up</p> : null}
        <p className="text-xl font-bold leading-snug text-foreground" data-testid="move-instruction">{node.title}</p>
        {node.body ? <p className="text-sm text-muted-foreground">{node.body}</p> : null}
        {node.kind === 'adjust' ? <p className="text-sm text-muted-foreground">The arrow shows one click: <code className="font-mono">{node.move}</code> ({MOVE_TEXT[node.move].replace('Turn the ', '').toLowerCase()}).</p> : null}
        <BigButton onClick={() => {
          if (node.kind === 'adjust') go(node.next, undefined, node.demoAfter(s.demo));
          else go(node.next, node.effect, node.demoAfter ? node.demoAfter(s.demo) : undefined);
        }}>{node.button}</BigButton>
      </div>
    );
  } else if (node.kind === 'finish') {
    controls = (
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-bold text-foreground">{node.title}</p>
        <p className="text-sm text-muted-foreground">{node.body}</p>
        {node.picture.kind === 'pattern' ? <div className="flex justify-center"><TopPatternPicture pattern={node.picture.pattern} size={120} /></div> : null}
        <BigButton onClick={() => { if (!isComplete) onComplete(); }} aria-pressed={isComplete}>
          <Check className="h-5 w-5" />{isComplete ? 'Stage Complete!' : 'Complete Stage'}
        </BigButton>
        <BigButton variant="secondary" onClick={onClose}>Close guide</BigButton>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden" data-testid="follow-along" data-node={s.nodeId}>
      <OrientationBanner hold={node.hold} loudFlip={node.loudFlip} onMessedUp={s.undo || s.undone ? undefined : () => dispatch({ type: 'sheet', open: true })} />
      {node.counters?.length ? <CounterRow items={node.counters} counters={s.counters} /> : null}
      {reassure && !s.undo && !s.undone ? (
        <p className="shrink-0 bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-950 dark:bg-sky-900/50 dark:text-sky-100" role="status" data-testid="reassure">{reassure}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showCube ? (
          <div className="relative min-h-[120px] flex-1 bg-muted/30">
            <InteractiveCube3D
              className="absolute inset-0"
              colors={cubeDemo.colors}
              vis={cubeDemo.vis}
              move={activeMove}
              view={view}
              onFaceClick={onFaceClick}
              label={activeMove ? `Cube showing the move: ${MOVE_TEXT[activeMove]}` : 'Cube picture'}
            />
            {activeMove && isDoubleMove(activeMove) ? (
              <span className="absolute right-3 top-3 rounded-full bg-fuchsia-600 px-3 py-1 text-sm font-bold text-white">×2 — turn twice</span>
            ) : null}
            {(seqNode && s.phase === 'checkpoint') || node.kind === 'finish' ? (
              <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground">Your cube should look like THIS · grey = any color</span>
            ) : null}
          </div>
        ) : null}
        <div className={cn('overflow-y-auto p-3 md:w-[400px] md:max-h-none md:border-l md:border-border', showCube ? 'max-h-[85%] shrink-0' : 'min-h-0 flex-1')}>{controls}</div>
      </div>

      {s.sheet ? (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/50" role="dialog" aria-modal="true" aria-label="I messed up">
          <div className="space-y-2 rounded-t-2xl bg-card p-4 shadow-xl">
            <p className="text-lg font-bold text-foreground">No problem — let's fix your real cube.</p>
            <p className="text-sm text-muted-foreground">Pick what happened. You never have to restart the whole stage for one wrong turn.</p>
            <BigButton onClick={() => dispatch({ type: 'startUndo' })} disabled={!canUndoSequence}>
              <Undo2 className="h-5 w-5" />Undo that last sequence on my real cube
            </BigButton>
            {!canUndoSequence ? <p className="text-xs text-muted-foreground">(No moves done yet on this step, so there's nothing to undo.)</p> : null}
            <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStep' })}>Restart this step</BigButton>
            <BigButton variant="secondary" onClick={() => dispatch({ type: 'restartStage' })}>Restart this stage</BigButton>
            <SmallButton onClick={() => dispatch({ type: 'sheet', open: false })}>Never mind</SmallButton>
          </div>
        </div>
      ) : null}
    </div>
  );
};


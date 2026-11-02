import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Lock, Pencil, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { executeMove, getSolvedCube, type CubeState, type MoveName } from '@/hooks/useCubeState';
import { InteractiveCube3D } from '@/components/InteractiveCube3D';
import { CubePicture } from '@/components/followalong/Pictures';
import { MOVE_HINT, MOVE_TEXT, inverseMove, isDoubleMove } from '@/lib/moves';

interface SolutionPlayerProps {
  start: CubeState;
  moves: MoveName[];
  onEdit: () => void;
  onNewCube: () => void;
}

// One move at a time: only the next move is shown large and can be confirmed.
// The full list is a locked progress strip, so a stray tap can't skip ahead.
export const SolutionPlayer = ({ start, moves, onEdit, onNewCube }: SolutionPlayerProps) => {
  const [index, setIndex] = useState(0);
  const [wentBack, setWentBack] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // states[i] = the cube before move i (states[moves.length] = solved)
  const states = useMemo(() => {
    const out = [start];
    for (const m of moves) out.push(executeMove(out[out.length - 1], m));
    return out;
  }, [start, moves]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const done = index >= moves.length;
  const move = done ? null : moves[index];
  const next = () => { if (!done) { setIndex(index + 1); setWentBack(false); } };
  const back = () => { if (index > 0) { setIndex(index - 1); setWentBack(true); } };

  return (
    <section
      ref={ref}
      aria-label="Your solution"
      data-testid="solution-player"
      className="flex h-[calc(100dvh-4rem)] scroll-mt-16 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card md:h-[min(calc(100dvh-5rem),720px)]"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border pl-3 pr-1">
        <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-foreground">Your solution</h3>
        <button type="button" onClick={onEdit} className="flex h-12 items-center gap-1 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <Pencil className="h-4 w-4" /> Edit colors
        </button>
      </div>
      <div className="flex min-h-12 shrink-0 items-center gap-2 bg-muted px-3 py-0.5 text-sm text-foreground">
        <CubePicture colors={getSolvedCube()} size={28} title="Mini cube: yellow on top, red facing you" />
        <span role="note" aria-label="How to hold your cube" className="leading-tight" data-testid="orientation">
          Hold it: YELLOW center on top, RED center facing you — for every move.
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[120px] flex-1 bg-muted/30">
          <InteractiveCube3D
            className="absolute inset-0"
            colors={states[index]}
            move={move}
            onFaceClick={done ? undefined : next}
            label={move ? `Cube showing the move: ${MOVE_TEXT[move]}` : 'Your cube, solved'}
          />
          {move && isDoubleMove(move) ? (
            <span className="absolute right-3 top-3 rounded-full bg-fuchsia-600 px-3 py-1 text-sm font-bold text-white">×2 — turn twice</span>
          ) : null}
        </div>
        <div className="shrink-0 space-y-2 p-3 md:w-[400px] md:border-l md:border-border">
          {move ? (
            <>
              {wentBack ? (
                <p className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 dark:bg-amber-900/50 dark:text-amber-100" role="status">
                  Already did this move? Undo it first: {MOVE_TEXT[inverseMove(move)].toLowerCase()}.
                </p>
              ) : null}
              <p className="font-display text-xl font-bold leading-snug text-foreground" data-testid="move-instruction" aria-live="polite">{MOVE_TEXT[move]}</p>
              {MOVE_HINT[move] ? <p className="text-sm text-muted-foreground">{MOVE_HINT[move]}</p> : null}
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground" data-testid="move-progress">Move {index + 1} of {moves.length}</span>
                {' · '}notation <span className="font-mono">{move}</span>
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={back} disabled={index === 0} className="flex min-h-14 min-w-14 items-center justify-center gap-1 rounded-xl border border-border px-3 font-medium disabled:opacity-40" aria-label="Back one move">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={next} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90" data-testid="next-move">
                  <Check className="h-5 w-5" /> I did it — next move
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 font-display text-xl font-bold text-foreground" data-testid="solved">
                <PartyPopper className="h-5 w-5 text-primary" /> Solved! Your cube should match this picture.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={back} className="flex min-h-14 min-w-14 items-center justify-center rounded-xl border border-border px-3" aria-label="Back one move">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={onNewCube} className="flex min-h-14 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90">
                  Solve another cube
                </button>
              </div>
            </>
          )}
          <div aria-label={`Solution progress: ${Math.min(index, moves.length)} of ${moves.length} moves done`} role="img" data-testid="move-strip">
            <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Moves stay in order — follow them one at a time</p>
            <div className="flex flex-wrap gap-1" aria-hidden="true">
              {moves.map((m, i) => (
                <span
                  key={i}
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-xs',
                    i < index && 'bg-primary/10 text-primary/60 line-through',
                    i === index && 'bg-primary px-2 font-bold text-primary-foreground',
                    i > index && 'bg-muted text-muted-foreground',
                  )}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

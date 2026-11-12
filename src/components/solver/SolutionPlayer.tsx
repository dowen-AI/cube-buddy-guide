import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Gauge, Pause, Pencil, PartyPopper, Play, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { executeMove, getSolvedCube, type CubeState, type MoveName } from '@/hooks/useCubeState';
import { InteractiveCube3D } from '@/components/InteractiveCube3D';
import { CubePicture } from '@/components/followalong/Pictures';
import { MOVE_HINT, MOVE_TEXT, inverseMove, isDoubleMove } from '@/lib/moves';
import { usePrefs } from '@/lib/guideMemory';
import { canSpeak, speak, stopSpeaking } from '@/lib/speak';
import { useWakeLock } from '@/hooks/useWakeLock';

interface SolutionPlayerProps {
  start: CubeState;
  moves: MoveName[];
  index: number;
  onIndex: (index: number) => void;
  onEdit: () => void;
  onNewCube: () => void;
}

const SPEEDS = [0.5, 1, 2];
const small = 'flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2 text-base font-medium text-foreground hover:bg-muted disabled:opacity-40';

// One move at a time, on a cube that turns. "I did it" steps through at your
// own pace; Play runs the moves by themselves at the speed you pick.
export const SolutionPlayer = ({ start, moves, index, onIndex, onEdit, onNewCube }: SolutionPlayerProps) => {
  const prefs = usePrefs();
  const [wentBack, setWentBack] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const speed = SPEEDS[speedIdx];
  const ref = useRef<HTMLElement>(null);
  useWakeLock();

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

  // Play: let the turn finish on screen, then go on to the next move.
  useEffect(() => {
    if (!playing || !move) { if (done) setPlaying(false); return; }
    const seconds = (0.45 + (isDoubleMove(move) ? 1.3 : 0.9) + 0.7) / speed;
    const timer = setTimeout(() => onIndex(index + 1), seconds * 1000);
    return () => clearTimeout(timer);
  }, [playing, move, done, index, speed, onIndex]);

  useEffect(() => {
    if (prefs.readAloud && move) speak(MOVE_TEXT[move]);
    return stopSpeaking;
  }, [prefs.readAloud, move, index]);

  const next = () => { if (!done) { onIndex(index + 1); setWentBack(false); } };
  const back = () => { if (index > 0) { setPlaying(false); onIndex(index - 1); setWentBack(true); } };
  const instruction = cn('font-display font-bold leading-snug text-foreground', prefs.bigText ? 'text-3xl' : 'text-2xl');

  return (
    <section
      ref={ref}
      aria-label="Your solution"
      data-testid="solution-player"
      className="flex h-[calc(100dvh-4rem)] scroll-mt-16 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card md:h-[min(calc(100dvh-5rem),760px)]"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border pl-3 pr-1">
        <h3 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-foreground">Your solution: {moves.length} moves</h3>
        <button type="button" onClick={onEdit} className="flex h-14 items-center gap-1 rounded-lg px-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <Pencil className="h-5 w-5" /> Edit
        </button>
      </div>
      <div className="flex min-h-14 shrink-0 items-center gap-2 bg-amber-100 px-3 text-amber-950 dark:bg-amber-900/50 dark:text-amber-50">
        <CubePicture colors={getSolvedCube()} size={34} title="Mini cube: yellow on top, red facing you" />
        <span role="note" aria-label="How to hold your cube" className="text-[15px] font-bold uppercase leading-tight" data-testid="orientation">
          Yellow on top<br />Red facing you
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[112px] flex-1 bg-muted/30">
          <InteractiveCube3D
            className="absolute inset-0"
            colors={states[Math.min(index, moves.length)]}
            move={move}
            loop={!playing}
            speed={speed}
            onFaceClick={done || playing ? undefined : next}
            label={move ? `Cube showing the move: ${MOVE_TEXT[move]}` : 'Your cube, solved'}
          />
        </div>
        <div className="shrink-0 space-y-2 p-2.5 md:w-[420px] md:border-l md:border-border md:p-4">
          {move ? (
            <>
              {wentBack ? (
                <p className="rounded-lg bg-amber-100 px-3 py-1.5 text-base font-medium text-amber-950 dark:bg-amber-900/50 dark:text-amber-100" role="status">
                  Already did this move? Undo it first: {MOVE_TEXT[inverseMove(move)].toLowerCase()}.
                </p>
              ) : null}
              <p className={instruction} data-testid="move-instruction" aria-live="polite">{MOVE_TEXT[move]}</p>
              {MOVE_HINT[move] && !prefs.bigText && !wentBack ? <p className="text-base text-muted-foreground">{MOVE_HINT[move]}</p> : null}
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground" data-testid="move-progress">Move {index + 1} of {moves.length}</span>
                {prefs.letters ? <> · letter <span className="font-mono text-base font-bold text-foreground" data-testid="letter">{move}</span></> : null}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={back} disabled={index === 0} className="flex min-h-14 min-w-14 items-center justify-center rounded-xl border border-border px-3 disabled:opacity-40" aria-label="Back one move">
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <button type="button" onClick={() => { setPlaying(false); next(); }} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90" data-testid="next-move">
                  <Check className="h-5 w-5" /> I did it — next move
                </button>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPlaying((p) => !p)} className={small} data-testid="play" aria-pressed={playing}>
                  {playing ? <><Pause className="h-5 w-5" />Pause</> : <><Play className="h-5 w-5" />Play</>}
                </button>
                <button type="button" onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)} className={small} data-testid="speed" aria-label={`Speed ${speed} times. Tap to change.`}>
                  <Gauge className="h-5 w-5" />{speed}× speed
                </button>
                {canSpeak() ? (
                  <button type="button" onClick={() => speak(MOVE_TEXT[move])} className={small} data-testid="listen" aria-label="Listen to this instruction"><Volume2 className="h-5 w-5" />Listen</button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 font-display text-2xl font-bold text-foreground" data-testid="solved">
                <PartyPopper className="h-6 w-6 text-primary" /> Solved!
              </p>
              <p className="text-base text-muted-foreground">Your cube should match this picture: every side one color.</p>
              <div className="flex gap-2">
                <button type="button" onClick={back} className="flex min-h-14 min-w-14 items-center justify-center rounded-xl border border-border px-3" aria-label="Back one move">
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <button type="button" onClick={onNewCube} className="flex min-h-14 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90">
                  Solve another cube
                </button>
              </div>
            </>
          )}
          {/* Progress only: nothing here can be tapped, so a stray touch can't skip ahead. */}
          <div aria-label={`Solution progress: ${Math.min(index, moves.length)} of ${moves.length} moves done`} role="img" data-testid="move-strip" className="flex flex-wrap gap-1" >
            {moves.map((m, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  'flex h-6 items-center justify-center rounded font-mono text-sm',
                  prefs.letters ? 'min-w-7 px-1' : 'w-3',
                  i < index && 'bg-cube-green/70 text-white',
                  i === index && 'bg-primary font-bold text-primary-foreground',
                  i > index && 'bg-muted-foreground/25 text-muted-foreground',
                )}
              >
                {prefs.letters ? m : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

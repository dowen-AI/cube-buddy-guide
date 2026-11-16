import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, PartyPopper, Pencil, RotateCcw, Shuffle, Wand2 } from 'lucide-react';
import { CubeState, MoveName, CUBE_COLORS, getSolvedCube, createScrambledCube } from '@/hooks/useCubeState';
import {
  COLOR_NAMES,
  ColorPalette,
  FACE_LABELS,
  FacePainter,
  NetOverview,
  PAINT_STEPS,
  stickerKey,
  type FaceName,
} from '@/components/CubeNetEditor';
import { PaintingGuide } from '@/components/solver/PaintingGuide';
import { SolutionPlayer } from '@/components/solver/SolutionPlayer';
import { faceletToSticker, solveCube, SolverError } from '@/lib/cubeSolver';
import { loadSolverState, saveSolverState } from '@/lib/guideMemory';

interface CubeSolverSectionProps {
  // Lets the page shrink its header while the solution is on screen, like an open guide.
  onPlayingChange?: (playing: boolean) => void;
}

// Everything worth keeping across a reload: the painted cube, which faces were
// checked, and (mid-solution) the solution and the move the person is on.
interface Saved {
  cube: CubeState;
  guideDone: boolean;
  faceIdx: number;
  confirmed: FaceName[];
  reviewing: number | null;
  solution: MoveName[] | null;
  solutionFor: CubeState | null;
  index: number;
}
const blank = (): Saved => ({ cube: getSolvedCube(), guideDone: false, faceIdx: 0, confirmed: [], reviewing: null, solution: null, solutionFor: null, index: 0 });
const restore = (): Saved => {
  const saved = loadSolverState<Saved>();
  return saved && saved.cube?.front?.length === 3 ? { ...blank(), ...saved } : blank();
};

const btn = 'flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-4 text-base font-semibold text-foreground hover:bg-muted disabled:opacity-40';
const primary = 'flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60';

export const CubeSolverSection = ({ onPlayingChange }: CubeSolverSectionProps) => {
  const [s, setS] = useState<Saved>(restore);
  const [paintColor, setPaintColor] = useState<string>(CUBE_COLORS.red);
  const [isSolving, setIsSolving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<{ message: string; highlight: number[] } | null>(null);
  const update = useCallback((patch: Partial<Saved>) => setS((prev) => ({ ...prev, ...patch })), []);

  useEffect(() => saveSolverState(s), [s]);

  const playing = s.solution !== null && s.solution.length > 0 && s.solutionFor !== null;
  useEffect(() => onPlayingChange?.(playing), [playing, onPlayingChange]);

  const highlight = useMemo(() => {
    const set = new Set<string>();
    for (const i of error?.highlight ?? []) {
      const { face, r, c } = faceletToSticker(i);
      set.add(stickerKey(face, r, c));
    }
    return set;
  }, [error]);

  const step = PAINT_STEPS[s.faceIdx];
  const face = step.face;
  const confirmed = useMemo(() => new Set(s.confirmed), [s.confirmed]);

  const goToFace = (f: FaceName) => update({ faceIdx: PAINT_STEPS.findIndex((p) => p.face === f), reviewing: null, guideDone: true });

  const handlePaint = (r: number, c: number) => {
    setS((prev) => {
      const cube: CubeState = { ...prev.cube, [face]: prev.cube[face].map((row) => [...row]) };
      cube[face][r][c] = paintColor;
      // a repainted face has to be checked again
      return { ...prev, cube, confirmed: prev.confirmed.filter((f) => f !== face), solution: null, solutionFor: null, index: 0 };
    });
    setError(null);
  };

  const handleScramble = () => {
    // a demo cube made by the app is right by construction: no need to check it face by face
    update({ cube: createScrambledCube(), confirmed: PAINT_STEPS.map((p) => p.face), solution: null, solutionFor: null, index: 0, reviewing: null, guideDone: true });
    setError(null);
  };

  const handleReset = () => {
    setS({ ...blank(), guideDone: s.guideDone });
    setError(null);
  };

  const solve = async (cube: CubeState) => {
    setIsSolving(true);
    setProgress(null);
    setError(null);
    try {
      const { moves } = await solveCube(cube, setProgress);
      update({ solution: moves, solutionFor: cube, index: 0, reviewing: null });
    } catch (err) {
      update({ reviewing: null });
      setError(
        err instanceof SolverError
          ? { message: err.message, highlight: err.highlight }
          : { message: 'Something went wrong while solving. Please try again.', highlight: [] },
      );
    } finally {
      setIsSolving(false);
    }
  };

  // "Solve my cube" first walks through any face not yet checked against the real cube.
  const handleSolve = () => {
    const next = PAINT_STEPS.findIndex((p) => !confirmed.has(p.face));
    if (next === -1) void solve(s.cube);
    else update({ reviewing: next, solution: null, solutionFor: null });
  };
  const confirmFace = () => {
    if (s.reviewing === null) return;
    const done = [...new Set([...s.confirmed, PAINT_STEPS[s.reviewing].face])];
    const next = PAINT_STEPS.findIndex((p) => !done.includes(p.face));
    update({ confirmed: done, reviewing: next === -1 ? null : next });
    if (next === -1) void solve(s.cube);
  };

  const showFirstProblem = () => {
    if (!error?.highlight.length) return;
    goToFace(faceletToSticker(error.highlight[0]).face);
    document.getElementById('solver-painter')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const review = s.reviewing !== null ? PAINT_STEPS[s.reviewing] : null;

  return (
    <section id="solver" className="scroll-mt-28 border-y border-border bg-muted/30 px-4 py-16 min-[1440px]:scroll-mt-8 print:hidden">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground">Just Want the Solution?</h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Copy your cube's colors into the app, face by face, then follow the turns one at a time. In the solver you can also press Play and it steps through them for you.
          </p>
        </div>

        {playing ? (
          <SolutionPlayer
            start={s.solutionFor!}
            moves={s.solution!}
            index={s.index}
            onIndex={(index) => update({ index })}
            onEdit={() => update({ solution: null, solutionFor: null, index: 0 })}
            onNewCube={() => setS({ ...blank(), guideDone: true })}
          />
        ) : review ? (
          <div className="mx-auto max-w-md space-y-3 rounded-xl border border-border bg-card p-3 shadow-soft sm:p-5" data-testid="review">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Check face {s.reviewing! + 1} of {PAINT_STEPS.length}: {FACE_LABELS[review.face].name} ({review.center} center)</p>
            <p className="text-xl font-bold leading-snug text-foreground">{review.hold}</p>
            <p className="text-base text-muted-foreground">{review.lineUp} Does your cube's {FACE_LABELS[review.face].name.toLowerCase()} face look exactly like this, not mirrored?</p>
            <FacePainter face={review.face} grid={s.cube[review.face]} onPaint={() => undefined} highlight={new Set()} disabled />
            <div className="flex flex-col gap-2">
              <button type="button" onClick={confirmFace} className={primary} data-testid="review-yes"><Check className="h-5 w-5" />Yes, this face matches</button>
              <button type="button" onClick={() => goToFace(review.face)} className={btn} data-testid="review-fix"><Pencil className="h-5 w-5" />No, fix this face</button>
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div id="solver-painter" className="min-w-0 scroll-mt-40 space-y-3 rounded-xl border border-border bg-card p-3 shadow-soft sm:p-5">
              <h3 className="text-lg font-semibold text-foreground">1. Copy your cube's colors</h3>
              {!s.guideDone ? (
                <PaintingGuide onDone={() => update({ guideDone: true })} />
              ) : (
                <>
                  <div className="space-y-1" data-testid="paint-step">
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                      Face {s.faceIdx + 1} of {PAINT_STEPS.length}: {FACE_LABELS[face].name} ({step.center} center)
                    </p>
                    <p className="text-base font-semibold text-foreground">{step.hold}</p>
                    <p className="text-base text-muted-foreground">{step.lineUp}</p>
                  </div>
                  <FacePainter face={face} grid={s.cube[face]} onPaint={handlePaint} highlight={highlight} disabled={isSolving} />
                  <div className="space-y-1">
                    <p className="text-center text-base text-muted-foreground">
                      Painting with <strong className="text-foreground">{COLOR_NAMES[paintColor]}</strong>. Pick a color, then tap stickers.
                    </p>
                    <ColorPalette selected={paintColor} onSelect={setPaintColor} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => update({ faceIdx: s.faceIdx - 1 })} disabled={s.faceIdx === 0} className={btn}>
                      <ArrowLeft className="h-5 w-5" /> Back
                    </button>
                    {s.faceIdx < PAINT_STEPS.length - 1 ? (
                      <button type="button" onClick={() => update({ faceIdx: s.faceIdx + 1 })} className={`${primary} flex-1`}>
                        Next face: {FACE_LABELS[PAINT_STEPS[s.faceIdx + 1].face].name} <ArrowRight className="h-5 w-5" />
                      </button>
                    ) : (
                      <p className="flex min-h-14 flex-1 items-center justify-center rounded-xl bg-muted px-3 text-center text-base font-medium">
                        Last face. Now tap Solve.
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => update({ guideDone: false })} className={`${btn} w-full border-transparent text-muted-foreground`}>
                    <BookOpen className="h-5 w-5" /> How to copy your cube
                  </button>
                </>
              )}
            </div>

            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 shadow-soft sm:p-5">
              <h3 className="text-lg font-semibold text-foreground">2. Check, then solve</h3>
              <div className="space-y-1">
                <NetOverview cubeState={s.cube} current={face} onSelect={goToFace} highlight={highlight} done={confirmed} />
                <p className="text-center text-sm text-muted-foreground">Your whole cube, unfolded. Tap a face to paint it. A tick means you checked it.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={handleScramble} disabled={isSolving} className={btn}>
                  <Shuffle className="h-5 w-5" /> Try a random scramble
                </button>
                <button type="button" onClick={handleReset} disabled={isSolving} className={btn}>
                  <RotateCcw className="h-5 w-5" /> Reset
                </button>
              </div>
              <button type="button" onClick={handleSolve} disabled={isSolving} className={`${primary} w-full`} data-testid="solve">
                <Wand2 className="h-5 w-5" /> {isSolving ? 'Finding a short solution…' : 'Solve my cube'}
              </button>
              {isSolving ? (
                <p className="text-center text-base text-muted-foreground" role="status" data-testid="solving">
                  {progress ? `Found one with ${progress} moves. Looking for a shorter one for a few seconds…` : 'This can take a few seconds the first time.'}
                </p>
              ) : null}
              {error ? (
                <div role="alert" data-testid="solver-error" className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-base text-foreground">
                  <p className="font-semibold text-destructive">These colors can't be a real cube yet.</p>
                  <p>{error.message}</p>
                  {error.highlight.length ? (
                    <button type="button" onClick={showFirstProblem} className={btn}>
                      Show me the stickers to check
                    </button>
                  ) : null}
                </div>
              ) : null}
              {s.solution && s.solution.length === 0 ? (
                <p className="flex items-center justify-center gap-2 text-center text-lg font-medium text-primary" role="status">
                  <PartyPopper className="h-5 w-5" /> This cube is already solved!
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

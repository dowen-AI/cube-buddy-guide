import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, PartyPopper, RotateCcw, Shuffle, Wand2 } from 'lucide-react';
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
import { faceletToSticker, solveCubeState, SolverError } from '@/lib/cubeSolver';

interface CubeSolverSectionProps {
  // Lets the page shrink its header while the solution is on screen, like an open guide.
  onPlayingChange?: (playing: boolean) => void;
}

export const CubeSolverSection = ({ onPlayingChange }: CubeSolverSectionProps) => {
  const [cubeState, setCubeState] = useState<CubeState>(getSolvedCube());
  const [paintColor, setPaintColor] = useState<string>(CUBE_COLORS.red);
  const [guideDone, setGuideDone] = useState(false);
  const [faceIdx, setFaceIdx] = useState(0);
  const [visited, setVisited] = useState<Set<FaceName>>(new Set());
  const [solution, setSolution] = useState<MoveName[] | null>(null);
  const [solvedState, setSolvedState] = useState<CubeState | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<{ message: string; highlight: number[] } | null>(null);

  const playing = solution !== null && solution.length > 0;
  useEffect(() => onPlayingChange?.(playing), [playing, onPlayingChange]);

  const highlight = useMemo(() => {
    const set = new Set<string>();
    for (const i of error?.highlight ?? []) {
      const { face, r, c } = faceletToSticker(i);
      set.add(stickerKey(face, r, c));
    }
    return set;
  }, [error]);

  const step = PAINT_STEPS[faceIdx];
  const face = step.face;

  const goToFace = (f: FaceName) => {
    setVisited((v) => new Set(v).add(face));
    setFaceIdx(PAINT_STEPS.findIndex((s) => s.face === f));
  };

  const clearResult = () => {
    setSolution(null);
    setSolvedState(null);
    setError(null);
  };

  const handlePaint = (r: number, c: number) => {
    setCubeState((prev) => {
      const next: CubeState = { ...prev, [face]: prev[face].map((row) => [...row]) };
      next[face][r][c] = paintColor;
      return next;
    });
    clearResult();
  };

  const handleScramble = () => {
    setCubeState(createScrambledCube());
    clearResult();
  };

  const handleReset = () => {
    setCubeState(getSolvedCube());
    setVisited(new Set());
    setFaceIdx(0);
    clearResult();
  };

  const handleSolve = async () => {
    setIsSolving(true);
    clearResult();
    try {
      const moves = await solveCubeState(cubeState);
      setSolvedState(cubeState);
      setSolution(moves);
    } catch (err) {
      setError(
        err instanceof SolverError
          ? { message: err.message, highlight: err.highlight }
          : { message: 'Something went wrong while solving. Please try again.', highlight: [] },
      );
    } finally {
      setIsSolving(false);
    }
  };

  const showFirstProblem = () => {
    if (!error?.highlight.length) return;
    goToFace(faceletToSticker(error.highlight[0]).face);
    document.getElementById('solver-painter')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="solver" className="scroll-mt-16 border-y border-border bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground">Just Want the Solution?</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Copy your cube's colors into the app, face by face, then follow the moves one at a time — no need to learn
            the method yourself.
          </p>
        </div>

        {playing && solvedState ? (
          <SolutionPlayer
            start={solvedState}
            moves={solution}
            onEdit={() => setSolution(null)}
            onNewCube={() => { handleReset(); setGuideDone(true); }}
          />
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div id="solver-painter" className="min-w-0 scroll-mt-36 space-y-4 rounded-xl border border-border bg-card p-3 shadow-soft sm:p-5">
              <h3 className="font-semibold text-foreground">1. Copy your cube's colors</h3>
              {!guideDone ? (
                <PaintingGuide onDone={() => setGuideDone(true)} />
              ) : (
                <>
                  <div className="space-y-1" data-testid="paint-step">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Face {faceIdx + 1} of {PAINT_STEPS.length}: {FACE_LABELS[face].name} ({step.center} center)
                    </p>
                    <p className="font-medium text-foreground">{step.hold}</p>
                    <p className="text-sm text-muted-foreground">{step.lineUp}</p>
                  </div>
                  <FacePainter face={face} grid={cubeState[face]} onPaint={handlePaint} highlight={highlight} disabled={isSolving} />
                  <div className="space-y-1">
                    <p className="text-center text-sm text-muted-foreground">
                      Painting with <strong className="text-foreground">{COLOR_NAMES[paintColor]}</strong> — pick a color, then tap stickers
                    </p>
                    <ColorPalette selected={paintColor} onSelect={setPaintColor} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => goToFace(PAINT_STEPS[faceIdx - 1].face)}
                      disabled={faceIdx === 0}
                      className="flex min-h-12 items-center gap-1 rounded-xl border border-border px-4 font-medium disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    {faceIdx < PAINT_STEPS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => goToFace(PAINT_STEPS[faceIdx + 1].face)}
                        className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        Next face: {FACE_LABELS[PAINT_STEPS[faceIdx + 1].face].name} <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <p className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-muted px-3 text-center text-sm font-medium">
                        Last face — now tap Solve below
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => setGuideDone(false)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted">
                    <BookOpen className="h-4 w-4" /> How to copy your cube (guide)
                  </button>
                </>
              )}
            </div>

            <div className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-3 shadow-soft sm:p-5">
              <h3 className="font-semibold text-foreground">2. Check, then solve</h3>
              <div className="space-y-1">
                <NetOverview cubeState={cubeState} current={face} onSelect={(f) => { setGuideDone(true); goToFace(f); }} highlight={highlight} done={visited} />
                <p className="text-center text-xs text-muted-foreground">Your whole cube, unfolded. Tap a face to paint it.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={handleScramble} disabled={isSolving} className="flex min-h-12 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
                  <Shuffle className="h-4 w-4" /> Try a random scramble
                </button>
                <button type="button" onClick={handleReset} disabled={isSolving} className="flex min-h-12 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
              <button
                type="button"
                onClick={handleSolve}
                disabled={isSolving}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Wand2 className="h-5 w-5" /> {isSolving ? 'Solving…' : 'Solve my cube'}
              </button>
              {error ? (
                <div role="alert" data-testid="solver-error" className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                  <p className="font-semibold text-destructive">These colors can't be a real cube yet.</p>
                  <p>{error.message}</p>
                  {error.highlight.length ? (
                    <button type="button" onClick={showFirstProblem} className="flex min-h-12 items-center rounded-lg border border-destructive/40 bg-background px-3 font-medium">
                      Show me the stickers to check
                    </button>
                  ) : null}
                </div>
              ) : null}
              {solution && solution.length === 0 ? (
                <p className="flex items-center justify-center gap-2 text-center font-medium text-primary" role="status">
                  <PartyPopper className="h-4 w-4" /> This cube is already solved!
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { Wand2, Shuffle, RotateCcw, ChevronLeft, ChevronRight, Play, Pause, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CubeState,
  MoveName,
  CUBE_COLORS,
  executeMove,
  getSolvedCube,
  createScrambledCube,
} from '@/hooks/useCubeState';
import { RubiksCube3D } from '@/components/RubiksCube3D';
import { CubeNetEditor, ColorPalette } from '@/components/CubeNetEditor';
import { solveCubeState, SolverError } from '@/lib/cubeSolver';

type FaceName = keyof CubeState;

const PLAY_INTERVAL_MS = 700;

export const CubeSolverSection = () => {
  const [cubeState, setCubeState] = useState<CubeState>(getSolvedCube());
  const [paintColor, setPaintColor] = useState<string>(CUBE_COLORS.red);
  const [solution, setSolution] = useState<MoveName[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSolving, setIsSolving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewState = useMemo(() => {
    if (!solution) return cubeState;
    let state = cubeState;
    for (let i = 0; i < stepIndex; i++) {
      state = executeMove(state, solution[i]);
    }
    return state;
  }, [cubeState, solution, stepIndex]);

  useEffect(() => {
    if (!isPlaying || !solution) return;
    if (stepIndex >= solution.length) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStepIndex((i) => i + 1), PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, solution, stepIndex]);

  const handlePaint = (face: FaceName, row: number, col: number) => {
    setCubeState((prev) => {
      const next: CubeState = {
        ...prev,
        [face]: prev[face].map((r) => [...r]),
      };
      next[face][row][col] = paintColor;
      return next;
    });
    setSolution(null);
    setError(null);
  };

  const handleScramble = () => {
    setCubeState(createScrambledCube());
    setSolution(null);
    setError(null);
    setStepIndex(0);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCubeState(getSolvedCube());
    setSolution(null);
    setError(null);
    setStepIndex(0);
    setIsPlaying(false);
  };

  const handleSolve = async () => {
    setIsSolving(true);
    setError(null);
    setSolution(null);
    setStepIndex(0);
    try {
      const moves = await solveCubeState(cubeState);
      setSolution(moves);
    } catch (err) {
      setError(err instanceof SolverError ? err.message : 'Something went wrong while solving. Please try again.');
    } finally {
      setIsSolving(false);
    }
  };

  const isSolvedResult = solution !== null && stepIndex === solution.length;

  return (
    <section id="solver" className="py-16 px-4 bg-muted/30 border-y border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold font-display text-foreground mb-3">Just Want the Solution?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Enter your cube's exact colors below and get the precise moves to solve it —
            no need to learn the method yourself.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Input side */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-soft space-y-5">
            <h3 className="font-semibold text-foreground">1. Match Your Cube's Colors</h3>
            <CubeNetEditor cubeState={cubeState} onPaint={handlePaint} disabled={isSolving} />
            <ColorPalette selected={paintColor} onSelect={setPaintColor} />

            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Button variant="outline" size="sm" onClick={handleScramble} disabled={isSolving}>
                <Shuffle className="w-4 h-4" />
                Try a Random Scramble
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isSolving}>
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>

            <Button className="w-full" onClick={handleSolve} disabled={isSolving}>
              <Wand2 className="w-4 h-4" />
              {isSolving ? 'Solving…' : 'Solve My Cube'}
            </Button>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Output side */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-soft space-y-4">
            <h3 className="font-semibold text-foreground">2. Follow the Solution</h3>

            <RubiksCube3D cubeState={previewState} autoRotate={!isPlaying} />

            {!solution && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Set up your cube on the left, then tap <strong>Solve My Cube</strong> to see the
                exact moves here, with a 3D preview you can step through.
              </p>
            )}

            {solution && solution.length === 0 && (
              <p className="text-sm text-center text-primary font-medium flex items-center justify-center gap-2">
                <PartyPopper className="w-4 h-4" /> This cube is already solved!
              </p>
            )}

            {solution && solution.length > 0 && (
              <>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {solution.map((move, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setIsPlaying(false);
                        setStepIndex(i + 1);
                      }}
                      className={cn(
                        'font-mono text-sm px-2.5 py-1 rounded-md border transition-colors',
                        i < stepIndex && 'bg-primary/10 border-primary/30 text-primary/70',
                        i === stepIndex && 'bg-primary text-primary-foreground border-primary shadow-md scale-105',
                        i > stepIndex && 'bg-muted border-border text-muted-foreground',
                      )}
                    >
                      {move}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIndex((i) => Math.max(0, i - 1));
                    }}
                    disabled={stepIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => setIsPlaying((p) => !p)}
                    disabled={isSolvedResult}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIndex((i) => Math.min(solution.length, i + 1));
                    }}
                    disabled={isSolvedResult}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Step {stepIndex} of {solution.length}
                  {isSolvedResult && ' — Solved! 🎉'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
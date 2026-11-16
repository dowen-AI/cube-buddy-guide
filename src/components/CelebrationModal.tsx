import { useEffect, useState } from 'react';
import { RubiksCube3D, cubeStates } from './RubiksCube3D';
import { X, Trophy, RefreshCw } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

export const CelebrationModal = ({ isOpen, onClose, onReset }: CelebrationModalProps) => {
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      const colors = ['#DC2626', '#2563EB', '#16A34A', '#EA580C', '#EAB308', '#F5F5F5'];
      const newConfetti = Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
      }));
      setConfetti(newConfetti);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="You solved the cube">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Confetti */}
      {confetti.map((piece, index) => (
        <div
          key={index}
          className="absolute w-3 h-3 rounded-full animate-bounce pointer-events-none"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: '1s',
          }}
        />
      ))}

      {/* Never taller than the screen: it scrolls inside if it has to, so the buttons can always be reached. */}
      <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 text-center shadow-card animate-fade-in sm:p-8" data-testid="celebration">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-1 top-1 flex h-14 w-14 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        >
          <X className="h-6 w-6 text-muted-foreground" />
        </button>

        {/* Trophy */}
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-cube-yellow/20 sm:mb-6 sm:h-20 sm:w-20">
          <Trophy className="h-7 w-7 text-cube-yellow sm:h-10 sm:w-10" />
        </div>

        {/* Title */}
        <h2 className="mb-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
          🎉 You solved it! 🎉
        </h2>
        <p className="mb-4 text-lg text-muted-foreground">
          All 7 stages done. That is a solved Rubik's Cube.
        </p>

        {/* Solved Cube */}
        <div className="mb-4 rounded-xl bg-muted/50 p-2 sm:p-4">
          <RubiksCube3D cubeState={cubeStates.solved} autoRotate={true} className="!h-36 sm:!h-56" />
        </div>

        {/* Message */}
        <p className="mb-5 text-base text-foreground">
          Scramble it and go again while it's fresh: the second solve is where it sticks, and
          each one is faster. The one-page cheat sheet is at the bottom of this page.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-center">
          <button
            onClick={onClose}
            className="min-h-14 rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="celebration-close"
          >
            Done
          </button>
          <button
            onClick={onReset}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-muted px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted/80"
            data-testid="celebration-again"
          >
            <RefreshCw className="h-5 w-5" />
            Solve it again from Stage 1
          </button>
        </div>
      </div>
    </div>
  );
};

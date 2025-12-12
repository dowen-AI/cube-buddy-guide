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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

      {/* Modal */}
      <div className="relative bg-card rounded-2xl border border-border shadow-card max-w-lg w-full p-8 text-center animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Trophy */}
        <div className="w-20 h-20 bg-cube-yellow/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-cube-yellow" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold font-display text-foreground mb-2">
          🎉 Congratulations! 🎉
        </h2>
        <p className="text-lg text-muted-foreground mb-6">
          You've completed all 7 stages of the Rubik's Cube guide!
        </p>

        {/* Solved Cube */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <RubiksCube3D cubeState={cubeStates.solved} autoRotate={true} />
          <p className="text-sm text-muted-foreground mt-2">
            Your solved cube! 🧊
          </p>
        </div>

        {/* Message */}
        <p className="text-foreground mb-6">
          You now know the Layer-by-Layer method! Keep practicing to get faster. 
          Most beginners can solve it in under 5 minutes with practice.
        </p>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Start Over
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

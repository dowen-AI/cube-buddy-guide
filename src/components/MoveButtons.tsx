import { cn } from '@/lib/utils';
import { MoveName } from '@/hooks/useCubeState';
import { FaceName } from '@/data/interactiveStagesData';
import { RotateCw, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';

interface MoveButtonsProps {
  allowedMoves: MoveName[];
  allowedFaces: FaceName[];
  onMove: (move: MoveName) => void;
  highlightFaces?: FaceName[];
}

const FACE_MOVES: Record<FaceName, { cw: MoveName; ccw: MoveName; double: MoveName }> = {
  right: { cw: 'R', ccw: "R'", double: 'R2' },
  left: { cw: 'L', ccw: "L'", double: 'L2' },
  top: { cw: 'U', ccw: "U'", double: 'U2' },
  bottom: { cw: 'D', ccw: "D'", double: 'D2' },
  front: { cw: 'F', ccw: "F'", double: 'F2' },
  back: { cw: 'B', ccw: "B'", double: 'B2' },
};

const FACE_LABELS: Record<FaceName, string> = {
  right: 'Right (R)',
  left: 'Left (L)',
  top: 'Top (U)',
  bottom: 'Bottom (D)',
  front: 'Front (F)',
  back: 'Back (B)',
};

const FACE_COLORS: Record<FaceName, string> = {
  right: 'bg-cube-green/20 border-cube-green hover:bg-cube-green/30',
  left: 'bg-cube-blue/20 border-cube-blue hover:bg-cube-blue/30',
  top: 'bg-cube-yellow/20 border-cube-yellow hover:bg-cube-yellow/30',
  bottom: 'bg-white/20 border-white hover:bg-white/30',
  front: 'bg-cube-red/20 border-cube-red hover:bg-cube-red/30',
  back: 'bg-cube-orange/20 border-cube-orange hover:bg-cube-orange/30',
};

export const MoveButtons = ({ allowedMoves, allowedFaces, onMove, highlightFaces = [] }: MoveButtonsProps) => {
  if (allowedMoves.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        <p className="text-sm">No cube moves needed for this step</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Available Moves
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allowedFaces.map((face) => {
          const moves = FACE_MOVES[face];
          const isHighlighted = highlightFaces.includes(face);
          const hasCW = allowedMoves.includes(moves.cw);
          const hasCCW = allowedMoves.includes(moves.ccw);
          const hasDouble = allowedMoves.includes(moves.double);

          if (!hasCW && !hasCCW && !hasDouble) return null;

          return (
            <div
              key={face}
              className={cn(
                "rounded-xl border-2 p-3 transition-all",
                FACE_COLORS[face],
                isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
              )}
            >
              <p className="text-xs font-semibold mb-2 text-foreground">
                {FACE_LABELS[face]}
              </p>
              <div className="flex gap-2">
                {hasCW && (
                  <button
                    onClick={() => onMove(moves.cw)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-background/80 rounded-lg text-sm font-medium hover:bg-background transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>{moves.cw}</span>
                  </button>
                )}
                {hasCCW && (
                  <button
                    onClick={() => onMove(moves.ccw)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-background/80 rounded-lg text-sm font-medium hover:bg-background transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{moves.ccw}</span>
                  </button>
                )}
                {hasDouble && (
                  <button
                    onClick={() => onMove(moves.double)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-background/80 rounded-lg text-sm font-medium hover:bg-background transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                    <span>{moves.double}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

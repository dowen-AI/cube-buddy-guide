import { cn } from '@/lib/utils';
import { MoveName } from '@/hooks/useCubeState';
import { FaceName } from '@/data/interactiveStagesData';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

interface MoveButtonsProps {
  allowedMoves: MoveName[];
  allowedFaces: FaceName[];
  onMove: (move: MoveName) => void;
  highlightFaces?: FaceName[];
}

// Beginner-friendly direction labels
const MOVE_DESCRIPTIONS: Record<MoveName, { label: string; direction: string; icon: 'up' | 'down' | 'left' | 'right' | 'flip' }> = {
  'R': { label: 'Right UP', direction: 'Turn away from you', icon: 'up' },
  "R'": { label: 'Right DOWN', direction: 'Turn toward you', icon: 'down' },
  'R2': { label: 'Right ×2', direction: '180° flip', icon: 'flip' },
  'L': { label: 'Left DOWN', direction: 'Turn toward you', icon: 'down' },
  "L'": { label: 'Left UP', direction: 'Turn away from you', icon: 'up' },
  'L2': { label: 'Left ×2', direction: '180° flip', icon: 'flip' },
  'U': { label: 'Top LEFT', direction: 'Turn left', icon: 'left' },
  "U'": { label: 'Top RIGHT', direction: 'Turn right', icon: 'right' },
  'U2': { label: 'Top ×2', direction: '180° flip', icon: 'flip' },
  'D': { label: 'Bottom RIGHT', direction: 'Turn right', icon: 'right' },
  "D'": { label: 'Bottom LEFT', direction: 'Turn left', icon: 'left' },
  'D2': { label: 'Bottom ×2', direction: '180° flip', icon: 'flip' },
  'F': { label: 'Front CW', direction: 'Turn clockwise', icon: 'right' },
  "F'": { label: 'Front CCW', direction: 'Turn counter-clockwise', icon: 'left' },
  'F2': { label: 'Front ×2', direction: '180° flip', icon: 'flip' },
  'B': { label: 'Back CCW', direction: 'Turn counter-clockwise', icon: 'left' },
  "B'": { label: 'Back CW', direction: 'Turn clockwise', icon: 'right' },
  'B2': { label: 'Back ×2', direction: '180° flip', icon: 'flip' },
};

const FACE_MOVES: Record<FaceName, { cw: MoveName; ccw: MoveName; double: MoveName }> = {
  right: { cw: 'R', ccw: "R'", double: 'R2' },
  left: { cw: 'L', ccw: "L'", double: 'L2' },
  top: { cw: 'U', ccw: "U'", double: 'U2' },
  bottom: { cw: 'D', ccw: "D'", double: 'D2' },
  front: { cw: 'F', ccw: "F'", double: 'F2' },
  back: { cw: 'B', ccw: "B'", double: 'B2' },
};

const FACE_LABELS: Record<FaceName, { name: string; notation: string }> = {
  right: { name: 'Right Face', notation: 'R' },
  left: { name: 'Left Face', notation: 'L' },
  top: { name: 'Top Layer', notation: 'U' },
  bottom: { name: 'Bottom Layer', notation: 'D' },
  front: { name: 'Front Face', notation: 'F' },
  back: { name: 'Back Face', notation: 'B' },
};

const FACE_COLORS: Record<FaceName, string> = {
  right: 'bg-cube-green/20 border-cube-green/60',
  left: 'bg-cube-blue/20 border-cube-blue/60',
  top: 'bg-cube-yellow/20 border-cube-yellow/60',
  bottom: 'bg-white/20 border-border',
  front: 'bg-cube-red/20 border-cube-red/60',
  back: 'bg-cube-orange/20 border-cube-orange/60',
};

const DirectionIcon = ({ icon }: { icon: 'up' | 'down' | 'left' | 'right' | 'flip' }) => {
  switch (icon) {
    case 'up': return <ArrowUp className="w-5 h-5" />;
    case 'down': return <ArrowDown className="w-5 h-5" />;
    case 'left': return <ArrowLeft className="w-5 h-5" />;
    case 'right': return <ArrowRight className="w-5 h-5" />;
    case 'flip': return <RotateCcw className="w-5 h-5" />;
  }
};

export const MoveButtons = ({ allowedMoves, allowedFaces, onMove, highlightFaces = [] }: MoveButtonsProps) => {
  if (allowedMoves.length === 0) {
    return (
      <div className="bg-muted/50 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">👋</div>
        <p className="text-foreground font-medium">No cube moves needed</p>
        <p className="text-sm text-muted-foreground mt-1">
          This step involves holding or looking at the cube
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with explanation */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          🎮 <span className="text-primary">Tap a button</span> to turn that face of the cube
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Only highlighted faces can be moved in this step
        </p>
      </div>

      {/* Move buttons grouped by face */}
      <div className="grid grid-cols-1 gap-3">
        {allowedFaces.map((face) => {
          const moves = FACE_MOVES[face];
          const faceInfo = FACE_LABELS[face];
          const isHighlighted = highlightFaces.includes(face);
          const hasCW = allowedMoves.includes(moves.cw);
          const hasCCW = allowedMoves.includes(moves.ccw);
          const hasDouble = allowedMoves.includes(moves.double);

          if (!hasCW && !hasCCW && !hasDouble) return null;

          const availableMoves = [
            hasCW && moves.cw,
            hasCCW && moves.ccw,
            hasDouble && moves.double,
          ].filter(Boolean) as MoveName[];

          return (
            <div
              key={face}
              className={cn(
                "rounded-xl border-2 overflow-hidden transition-all",
                FACE_COLORS[face],
                isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
              )}
            >
              {/* Face header */}
              <div className="px-4 py-2 border-b border-inherit bg-background/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{faceInfo.name}</span>
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {faceInfo.notation}
                  </span>
                </div>
              </div>

              {/* Move buttons */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableMoves.map((move) => {
                  const desc = MOVE_DESCRIPTIONS[move];
                  return (
                    <button
                      key={move}
                      onClick={() => onMove(move)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 bg-background rounded-lg",
                        "hover:bg-primary hover:text-primary-foreground transition-all",
                        "border border-border hover:border-primary",
                        "text-left group"
                      )}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted group-hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
                        <DirectionIcon icon={desc.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{desc.label}</div>
                        <div className="text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                          {desc.direction}
                        </div>
                      </div>
                      <div className="text-xs font-mono bg-muted group-hover:bg-primary-foreground/20 px-2 py-1 rounded transition-colors">
                        {move}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

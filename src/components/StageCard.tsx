import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { RubiksCube3D, type CubeState } from './RubiksCube3D';
import { useState } from 'react';

interface Step {
  instruction: string;
  tip?: string;
}

interface StageCardProps {
  id: number;
  title: string;
  description: string;
  goal: string;
  steps: Step[];
  cubeState: CubeState;
  algorithm?: string;
  algorithmName?: string;
  isComplete: boolean;
  onToggleComplete: () => void;
}

export const StageCard = ({
  id,
  title,
  description,
  goal,
  steps,
  cubeState,
  algorithm,
  algorithmName,
  isComplete,
  onToggleComplete,
}: StageCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section
      id={`stage-${id}`}
      className={cn(
        "scroll-mt-24 bg-card rounded-2xl border border-border shadow-card overflow-hidden transition-all duration-300",
        isComplete && "ring-2 ring-cube-green/30"
      )}
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold transition-all",
                isComplete
                  ? "bg-cube-green text-white"
                  : "bg-gradient-to-br from-primary to-accent text-white"
              )}
            >
              {isComplete ? <Check className="w-6 h-6" /> : id}
            </span>
            <div>
              <h2 className="text-2xl font-bold text-foreground font-display">
                {title}
              </h2>
              <p className="text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 3D Cube */}
            <div className="order-2 md:order-1">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Drag to rotate the cube
                </p>
                <RubiksCube3D cubeState={cubeState} autoRotate={false} />
              </div>
            </div>

            {/* Instructions */}
            <div className="order-1 md:order-2 space-y-6">
              {/* Goal */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                  🎯 Goal
                </h3>
                <p className="text-foreground">{goal}</p>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Steps
                </h3>
                <ol className="space-y-3">
                  {steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-foreground">{step.instruction}</p>
                        {step.tip && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            💡 {step.tip}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Algorithm (if applicable) */}
              {algorithm && (
                <div className="bg-muted rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {algorithmName || 'Algorithm'}
                  </h3>
                  <code className="text-lg font-mono text-primary font-semibold">
                    {algorithm}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Don't worry about this notation yet—focus on the simple instructions above!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Complete Button */}
          <div className="mt-8 pt-6 border-t border-border flex justify-center">
            <button
              onClick={onToggleComplete}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200",
                isComplete
                  ? "bg-cube-green text-white hover:bg-cube-green/90"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <Check className={cn("w-5 h-5", !isComplete && "opacity-50")} />
              {isComplete ? "Stage Complete!" : "Mark as Complete"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

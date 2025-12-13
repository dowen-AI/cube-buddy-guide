import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  goalImage?: string;
  algorithm?: string;
  algorithmName?: string;
  isComplete: boolean;
  onToggleComplete: () => void;
}

// Static goal images for each stage (cube diagrams as styled divs)
const StageGoalVisual = ({ stageId }: { stageId: number }) => {
  const visuals: Record<number, React.ReactNode> = {
    1: (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground mb-2">White Cross (Bottom View)</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="w-8 h-8 bg-white border border-border rounded" />
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="w-8 h-8 bg-white border border-border rounded" />
          <div className="w-8 h-8 bg-white border border-border rounded" />
          <div className="w-8 h-8 bg-white border border-border rounded" />
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="w-8 h-8 bg-white border border-border rounded" />
          <div className="w-8 h-8 bg-muted rounded" />
        </div>
      </div>
    ),
    2: (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground mb-2">Complete White Face</p>
        <div className="grid grid-cols-3 gap-1">
          {Array(9).fill(null).map((_, i) => (
            <div key={i} className="w-8 h-8 bg-white border border-border rounded" />
          ))}
        </div>
      </div>
    ),
    3: (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground mb-2">First Two Layers Complete</p>
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-3 gap-0.5">
              <div className="w-5 h-5 bg-cube-red rounded-sm" />
              <div className="w-5 h-5 bg-cube-red rounded-sm" />
              <div className="w-5 h-5 bg-cube-red rounded-sm" />
            </div>
            <div className="grid grid-cols-3 gap-0.5">
              <div className="w-5 h-5 bg-cube-red rounded-sm" />
              <div className="w-5 h-5 bg-cube-red rounded-sm" />
              <div className="w-5 h-5 bg-cube-red rounded-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-3 gap-0.5">
              <div className="w-5 h-5 bg-cube-blue rounded-sm" />
              <div className="w-5 h-5 bg-cube-blue rounded-sm" />
              <div className="w-5 h-5 bg-cube-blue rounded-sm" />
            </div>
            <div className="grid grid-cols-3 gap-0.5">
              <div className="w-5 h-5 bg-cube-blue rounded-sm" />
              <div className="w-5 h-5 bg-cube-blue rounded-sm" />
              <div className="w-5 h-5 bg-cube-blue rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    ),
    4: (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground mb-2">Yellow Cross (Top View)</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-muted rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-muted rounded" />
        </div>
      </div>
    ),
    5: (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground mb-2">Edges Match Centers</p>
        <div className="flex gap-1 items-center">
          <div className="w-6 h-6 bg-cube-red rounded-sm" />
          <div className="w-6 h-6 bg-cube-green rounded-sm" />
          <div className="w-6 h-6 bg-cube-orange rounded-sm" />
          <div className="w-6 h-6 bg-cube-blue rounded-sm" />
        </div>
        <p className="text-xs text-muted-foreground">↑ Side colors aligned</p>
      </div>
    ),
    6: (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground mb-2">Corners in Position</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="w-8 h-8 bg-cube-yellow rounded flex items-center justify-center text-xs">✓</div>
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded flex items-center justify-center text-xs">✓</div>
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded flex items-center justify-center text-xs">✓</div>
          <div className="w-8 h-8 bg-cube-yellow rounded" />
          <div className="w-8 h-8 bg-cube-yellow rounded flex items-center justify-center text-xs">✓</div>
        </div>
      </div>
    ),
    7: (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground mb-2">SOLVED!</p>
        <div className="grid grid-cols-3 gap-1">
          {Array(9).fill(null).map((_, i) => (
            <div key={i} className="w-8 h-8 bg-cube-yellow rounded" />
          ))}
        </div>
      </div>
    ),
  };

  return visuals[stageId] || null;
};

export const StageCard = ({
  id,
  title,
  description,
  goal,
  steps,
  algorithm,
  algorithmName,
  isComplete,
  onToggleComplete,
}: StageCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isNotationOpen, setIsNotationOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleToggleComplete = () => {
    if (!isComplete) {
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    }
    onToggleComplete();
  };

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
            {/* Goal Visual */}
            <div className="order-2 md:order-1">
              <div className="bg-muted/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Goal for this Stage
                </h3>
                <StageGoalVisual stageId={id} />
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
                <ol className="space-y-4">
                  {steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="flex-1">
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

              {/* Algorithm (Collapsible) */}
              {algorithm && (
                <Collapsible open={isNotationOpen} onOpenChange={setIsNotationOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full">
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      isNotationOpen && "rotate-90"
                    )} />
                    <span className="uppercase tracking-wide">
                      {algorithmName || 'Algorithm'} (Optional Notation)
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-muted rounded-xl p-4 mt-2">
                      <code className="text-lg font-mono text-primary font-semibold">
                        {algorithm}
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        This is the standard notation. You don't need to memorize this—the simple instructions above work just fine!
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>

          {/* Complete Button */}
          <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-4">
            <button
              onClick={handleToggleComplete}
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

            {/* Confirmation feedback */}
            {showConfirmation && (
              <div className="animate-fade-in bg-cube-green/10 border border-cube-green/30 rounded-xl p-4 text-center">
                <p className="text-cube-green font-semibold mb-2">
                  Great job! Your cube should now match the goal above.
                </p>
                <p className="text-sm text-muted-foreground">
                  If it doesn't look right, review the steps and try again—you've got this!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

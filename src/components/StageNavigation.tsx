import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { StageProgress } from '@/hooks/useProgress';

interface Stage {
  id: number;
  title: string;
  shortTitle: string;
}

const stages: Stage[] = [
  { id: 1, title: 'The White Cross', shortTitle: 'Cross' },
  { id: 2, title: 'The White Corners', shortTitle: 'Corners' },
  { id: 3, title: 'The Middle Layer', shortTitle: 'Middle' },
  { id: 4, title: 'The Yellow Cross', shortTitle: 'Y-Cross' },
  { id: 5, title: 'Yellow Edge Permutation', shortTitle: 'Y-Edges' },
  { id: 6, title: 'Yellow Corner Permutation', shortTitle: 'Y-Corners' },
  { id: 7, title: 'Yellow Corner Orientation', shortTitle: 'Finish!' },
];

interface StageNavigationProps {
  progress: StageProgress;
  activeStage: number;
  onStageClick: (stageId: number) => void;
}

export const StageNavigation = ({ progress, activeStage, onStageClick }: StageNavigationProps) => {
  return (
    <nav className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
      <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-card p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Stages
        </h3>
        <ul className="space-y-2">
          {stages.map((stage) => {
            const isComplete = progress[stage.id];
            const isActive = activeStage === stage.id;
            
            return (
              <li key={stage.id}>
                <button
                  onClick={() => onStageClick(stage.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    "hover:bg-muted",
                    isActive && "bg-primary/10 text-primary font-medium",
                    !isActive && !isComplete && "text-muted-foreground",
                    isComplete && !isActive && "text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all",
                      isComplete 
                        ? "bg-cube-green text-white" 
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isComplete ? <Check className="w-3.5 h-3.5" /> : stage.id}
                  </span>
                  <span className="truncate">{stage.shortTitle}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export { stages };

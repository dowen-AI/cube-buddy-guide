import { cn } from '@/lib/utils';

interface ProgressBarProps {
  percentage: number;
  completedCount: number;
  totalStages: number;
}

export const ProgressBar = ({ percentage, completedCount, totalStages }: ProgressBarProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Your Progress
          </span>
          <span className="text-sm font-semibold text-primary">
            {completedCount} / {totalStages} stages complete
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full gradient-progress transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

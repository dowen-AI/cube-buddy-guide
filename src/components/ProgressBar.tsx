import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ProgressBarProps {
  percentage: number;
  completedCount: number;
  totalStages: number;
  // While a guide is open the header shrinks to exactly 4rem (63px row + 1px
  // border) and hides stage navigation, so the guide fills the rest of the
  // screen and a stray tap can't jump the page.
  compact?: boolean;
  children?: ReactNode;
}

export const ProgressBar = ({ percentage, completedCount, totalStages, compact, children }: ProgressBarProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="max-w-4xl mx-auto px-4 h-[63px] flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-sm font-medium text-foreground">
              Your Progress
            </span>
            <span className="text-sm font-semibold text-primary whitespace-nowrap">
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
        <ThemeToggle />
      </div>
      {compact ? null : children}
    </header>
  );
};

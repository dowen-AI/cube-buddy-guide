import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { StageProgress } from '@/hooks/useProgress';
import { interactiveStagesData } from '@/data/interactiveStagesData';

interface StageNavigationProps {
  progress: StageProgress;
  activeStage: number;
  onStageClick: (stageId: number) => void;
}

const StageBadge = ({ id, isComplete, isActive }: { id: number; isComplete: boolean; isActive: boolean }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all',
      isComplete
        ? 'bg-cube-green text-white'
        : isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground',
    )}
  >
    {isComplete ? <Check className="w-3.5 h-3.5" /> : id}
  </span>
);

// Wide screens (≥1440px) have a gutter beside the 896px content column, so the
// floating sidebar fits there without covering the stage cards.
export const StageSidebar = ({ progress, activeStage, onStageClick }: StageNavigationProps) => (
  <nav aria-label="Stages" className="hidden min-[1440px]:block fixed left-4 top-1/2 -translate-y-1/2 z-40 w-60">
    <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Stages</h3>
      <ul className="space-y-1">
        {interactiveStagesData.map((stage) => {
          const isComplete = !!progress[stage.id];
          const isActive = activeStage === stage.id;
          return (
            <li key={stage.id}>
              <button
                onClick={() => onStageClick(stage.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-left transition-all duration-200 hover:bg-muted',
                  isActive && 'bg-primary/10 text-primary font-medium',
                  !isActive && !isComplete && 'text-muted-foreground',
                  isComplete && !isActive && 'text-foreground',
                )}
              >
                <StageBadge id={stage.id} isComplete={isComplete} isActive={isActive} />
                <span className="leading-tight">{stage.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  </nav>
);

// Below 1440px the stage list lives in the sticky header instead: seven
// numbered 48px buttons (which fit a 390px phone without sideways scrolling)
// plus the full name of the current stage.
export const StageStrip = ({ progress, activeStage, onStageClick }: StageNavigationProps) => {
  const active = interactiveStagesData.find((s) => s.id === activeStage);
  return (
    <nav aria-label="Stages" className="min-[1440px]:hidden border-t border-border">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1">
        <ol className="flex gap-1">
          {interactiveStagesData.map((stage) => {
            const isComplete = !!progress[stage.id];
            const isActive = activeStage === stage.id;
            return (
              <li key={stage.id}>
                <button
                  onClick={() => onStageClick(stage.id)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Stage ${stage.id}: ${stage.title}${isComplete ? ' (complete)' : ''}`}
                  title={stage.title}
                  className={cn('flex h-12 w-12 items-center justify-center rounded-lg transition-colors hover:bg-muted', isActive && 'bg-primary/10')}
                >
                  <StageBadge id={stage.id} isComplete={isComplete} isActive={isActive} />
                </button>
              </li>
            );
          })}
        </ol>
        {active ? (
          <p className="basis-full truncate pb-1 text-xs font-medium text-foreground md:basis-auto md:pb-0 md:text-sm" data-testid="active-stage-name">
            Stage {active.id}: {active.title}
          </p>
        ) : null}
      </div>
    </nav>
  );
};

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Play, Settings2, X } from 'lucide-react';
import { FollowAlong } from './followalong/FollowAlong';
import { GuideOptions } from './GuideOptions';
import { FOLLOW_ALONG } from '@/data/followAlong';
import type { InteractiveStage } from '@/data/interactiveStagesData';

interface InteractiveStageCardProps {
  stage: InteractiveStage;
  isComplete: boolean;
  onToggleComplete: () => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const InteractiveStageCard = ({ stage, isComplete, onToggleComplete, isOpen, onOpen, onClose }: InteractiveStageCardProps) => {
  const [showOptions, setShowOptions] = useState(false);

  if (isOpen) {
    return (
      <section
        id={`stage-${stage.id}`}
        aria-label={`Stage ${stage.id}: ${stage.title}`}
        // Exactly one screen tall under the 4rem sticky header, so a step never needs scrolling.
        className="relative flex h-[calc(100dvh-4rem)] scroll-mt-16 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card md:h-[min(calc(100dvh-5rem),780px)]"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border pl-3 pr-1">
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white', isComplete ? 'bg-cube-green' : 'bg-gradient-to-br from-primary to-accent')}>
            {isComplete ? <Check className="h-4 w-4" /> : stage.id}
          </span>
          <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-foreground">{stage.title}</h2>
          <button type="button" onClick={() => setShowOptions((v) => !v)} aria-expanded={showOptions} aria-label="Options: big text, read aloud, hands-free, letters" className="flex h-14 w-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="options-button">
            <Settings2 className="h-6 w-6" />
          </button>
          <button type="button" onClick={onClose} aria-label={`Close the ${stage.title} guide`} className="flex h-14 items-center gap-1 rounded-lg px-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />Close
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <FollowAlong flow={FOLLOW_ALONG[stage.id]} isComplete={isComplete} onComplete={onToggleComplete} onClose={onClose} />
          {showOptions ? (
            <div className="absolute inset-0 z-20 overflow-y-auto bg-background p-3">
              <GuideOptions onClose={() => setShowOptions(false)} />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      id={`stage-${stage.id}`}
      className={cn('scroll-mt-36 overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300', isComplete && 'ring-2 ring-cube-green/30')}
    >
      <div className="border-b border-border p-5 md:p-8">
        <div className="flex items-center gap-4">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white', isComplete ? 'bg-cube-green' : 'bg-gradient-to-br from-primary to-accent')}>
            {isComplete ? <Check className="h-6 w-6" /> : stage.id}
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">{stage.title}</h2>
            <p className="mt-1 text-base text-muted-foreground">{stage.description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5 text-center md:p-8">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">🎯 Goal</h3>
          <p className="text-lg text-foreground">{stage.goal}</p>
        </div>
        <button type="button" onClick={onOpen} className="inline-flex min-h-14 items-center gap-2 rounded-xl bg-primary px-8 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          <Play className="h-5 w-5" />
          {isComplete ? 'Follow along again' : 'Start follow-along'}
        </button>
        <p className="text-base text-muted-foreground">Hold your real cube and do each turn with the guide, one at a time.</p>
      </div>
    </section>
  );
};

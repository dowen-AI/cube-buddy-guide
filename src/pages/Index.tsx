import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useProgress } from '@/hooks/useProgress';
import { ProgressBar } from '@/components/ProgressBar';
import { StageSidebar, StageStrip } from '@/components/StageNavigation';
import { HeroSection } from '@/components/HeroSection';
import { HowToUseSection } from '@/components/HowToUseSection';
import { CubeSolverSection } from '@/components/CubeSolverSection';
import { InteractiveStageCard } from '@/components/InteractiveStageCard';
import { NotationReference } from '@/components/NotationReference';
import { CelebrationModal } from '@/components/CelebrationModal';
import { interactiveStagesData } from '@/data/interactiveStagesData';

const Index = () => {
  const {
    progress,
    toggleStage,
    resetProgress,
    completedCount,
    totalStages,
    progressPercentage,
  } = useProgress();

  const [activeStage, setActiveStage] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  // Accordion: at most one guide is open, so at most one guide 3D cube is mounted.
  const [openStageId, setOpenStageId] = useState<number | null>(null);

  // Opening a guide collapses any guide above it, which shifts the page;
  // re-anchor on the newly opened card once the layout has settled.
  useEffect(() => {
    if (openStageId === null) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`stage-${openStageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
    return () => cancelAnimationFrame(frame);
  }, [openStageId]);

  // Track active stage on scroll
  useEffect(() => {
    const handleScroll = () => {
      const stageElements = interactiveStagesData.map((stage) =>
        document.getElementById(`stage-${stage.id}`)
      );

      for (let i = stageElements.length - 1; i >= 0; i--) {
        const element = stageElements[i];
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveStage(i + 1);
            break;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show celebration when all stages complete
  useEffect(() => {
    if (completedCount === totalStages) {
      setShowCelebration(true);
    }
  }, [completedCount, totalStages]);

  const handleStageClick = (stageId: number) => {
    document.getElementById(`stage-${stageId}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReset = () => {
    resetProgress();
    setShowCelebration(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>Rubik's Cube Beginner's Guide - Learn to Solve in 7 Simple Stages</title>
        <meta
          name="description"
          content="Learn how to solve a Rubik's Cube with our beginner-friendly, visual guide. Interactive 3D cubes, simple instructions, notation explained in plain English, and progress tracking."
        />
        <meta name="keywords" content="Rubik's Cube, solve Rubik's Cube, beginner guide, tutorial, 3x3 cube, Layer by Layer method" />
      </Helmet>

      <main className="min-h-screen bg-background">
        {/* Sticky header: progress, theme toggle, and (below 1440px) stage navigation */}
        <ProgressBar
          percentage={progressPercentage}
          completedCount={completedCount}
          totalStages={totalStages}
        >
          <StageStrip progress={progress} activeStage={activeStage} onStageClick={handleStageClick} />
        </ProgressBar>

        {/* Floating stage navigation on wide screens */}
        <StageSidebar progress={progress} activeStage={activeStage} onStageClick={handleStageClick} />

        {/* Hero */}
        <HeroSection />

        {/* How to Use */}
        <HowToUseSection />

        {/* Notation Reference: before the solver and the guides, which both use notation */}
        <NotationReference />

        {/* Instant Solver */}
        <CubeSolverSection />

        {/* Stages */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {interactiveStagesData.map((stage) => (
              <InteractiveStageCard
                key={stage.id}
                stage={stage}
                isComplete={progress[stage.id] || false}
                onToggleComplete={() => toggleStage(stage.id)}
                isOpen={openStageId === stage.id}
                onOpen={() => setOpenStageId(stage.id)}
                onClose={() => setOpenStageId(null)}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 text-center border-t border-border">
          <p className="text-muted-foreground">
            Built with ❤️ to help everyone solve the Rubik's Cube
          </p>
        </footer>

        {/* Celebration Modal */}
        <CelebrationModal
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          onReset={handleReset}
        />
      </main>
    </>
  );
};

export default Index;

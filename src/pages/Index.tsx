import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useProgress } from '@/hooks/useProgress';
import { ProgressBar } from '@/components/ProgressBar';
import { StageNavigation } from '@/components/StageNavigation';
import { HeroSection } from '@/components/HeroSection';
import { HowToUseSection } from '@/components/HowToUseSection';
import { StageCard } from '@/components/StageCard';
import { NotationReference } from '@/components/NotationReference';
import { CelebrationModal } from '@/components/CelebrationModal';
import { stagesData } from '@/data/stagesData';

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

  // Track active stage on scroll
  useEffect(() => {
    const handleScroll = () => {
      const stageElements = stagesData.map((stage) =>
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

    window.addEventListener('scroll', handleScroll);
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
          content="Learn how to solve a Rubik's Cube with our beginner-friendly, visual guide. Interactive 3D cubes, simple instructions, and progress tracking. No confusing notation!"
        />
        <meta name="keywords" content="Rubik's Cube, solve Rubik's Cube, beginner guide, tutorial, 3x3 cube, Layer by Layer method" />
      </Helmet>

      <main className="min-h-screen">
        {/* Progress Bar */}
        <ProgressBar
          percentage={progressPercentage}
          completedCount={completedCount}
          totalStages={totalStages}
        />

        {/* Side Navigation */}
        <StageNavigation
          progress={progress}
          activeStage={activeStage}
          onStageClick={handleStageClick}
        />

        {/* Hero */}
        <HeroSection />

        {/* How to Use */}
        <HowToUseSection />

        {/* Stages */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {stagesData.map((stage) => (
              <StageCard
                key={stage.id}
                id={stage.id}
                title={stage.title}
                description={stage.description}
                goal={stage.goal}
                steps={stage.steps}
                cubeState={stage.cubeState}
                algorithm={stage.algorithm}
                algorithmName={stage.algorithmName}
                isComplete={progress[stage.id] || false}
                onToggleComplete={() => toggleStage(stage.id)}
              />
            ))}
          </div>
        </section>

        {/* Notation Reference */}
        <NotationReference />

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

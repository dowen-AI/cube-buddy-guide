import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { useProgress } from '@/hooks/useProgress';
import { ProgressBar } from '@/components/ProgressBar';
import { StageSidebar, StageStrip } from '@/components/StageNavigation';
import { HeroSection } from '@/components/HeroSection';
import { HowToUseSection } from '@/components/HowToUseSection';
import { CubeSolverSection } from '@/components/CubeSolverSection';
import { InteractiveStageCard } from '@/components/InteractiveStageCard';
import { NotationReference } from '@/components/NotationReference';
import { CelebrationModal } from '@/components/CelebrationModal';
import { CheatSheet } from '@/components/CheatSheet';
import { SiteFooter } from '@/components/SiteFooter';
import { clearGuideMemory } from '@/lib/guideMemory';
import { interactiveStagesData } from '@/data/interactiveStagesData';

const Index = () => {
  const {
    progress,
    markComplete,
    resetProgress,
    completedCount,
    totalStages,
    progressPercentage,
  } = useProgress();

  // null while the reader is above Stage 1 (hero, notation, solver)
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  // Accordion: at most one guide is open, so at most one guide 3D cube is mounted.
  const [openStageId, setOpenStageId] = useState<number | null>(null);
  // While the solver's one-move-at-a-time player is on screen the header shrinks too.
  const [solverPlaying, setSolverPlaying] = useState(false);

  // What to bring into view once the open guide has closed: that stage's card, or the solver.
  const afterClose = useRef<{ stage: number | null; solver: boolean }>({ stage: null, solver: false });

  // Opening a guide collapses any guide above it, which shifts the page;
  // re-anchor on the newly opened card once the layout has settled.
  // Closing one lands on its card, with the next stage just below.
  useEffect(() => {
    let target: string | null = null;
    let smooth = false;
    if (openStageId !== null) {
      afterClose.current.stage = openStageId;
      target = `stage-${openStageId}`;
      smooth = true;
    } else {
      const { stage, solver } = afterClose.current;
      afterClose.current = { stage: null, solver: false };
      target = solver ? 'solver' : stage !== null ? `stage-${stage}` : null;
    }
    if (!target) return;
    const id = target;
    const frame = requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    );
    return () => cancelAnimationFrame(frame);
  }, [openStageId]);

  // On a phone the open guide is a full-screen sheet. While it is open the page
  // behind it does not scroll, and the phone's Back button closes the guide
  // instead of leaving the site.
  const guideOpen = openStageId !== null;
  useEffect(() => {
    if (!guideOpen) return;
    document.documentElement.classList.add('guide-open');
    const state = window.history.state ?? {};
    // one extra history entry per visit at most: it is reused the next time a guide opens
    if (state.cubeGuide) window.history.replaceState({ ...state, cubeGuide: 'open' }, '');
    else window.history.pushState({ ...state, cubeGuide: 'open' }, '');
    const onPop = () => setOpenStageId(null);
    window.addEventListener('popstate', onPop);
    return () => {
      document.documentElement.classList.remove('guide-open');
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.cubeGuide === 'open') window.history.replaceState({ ...window.history.state, cubeGuide: 'closed' }, '');
    };
  }, [guideOpen]);

  // Track active stage on scroll
  useEffect(() => {
    const handleScroll = () => {
      const stageElements = interactiveStagesData.map((stage) =>
        document.getElementById(`stage-${stage.id}`)
      );

      let current: number | null = null;
      for (let i = stageElements.length - 1; i >= 0; i--) {
        const element = stageElements[i];
        if (element && element.getBoundingClientRect().top <= 200) {
          current = i + 1;
          break;
        }
      }
      setActiveStage(current);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Celebrate at the moment the last stage is finished (not on every later visit).
  const previousCount = useRef(completedCount);
  useEffect(() => {
    if (completedCount === totalStages && previousCount.current < totalStages) setShowCelebration(true);
    previousCount.current = completedCount;
  }, [completedCount, totalStages]);

  // "Mine matches" on a finish screen: the stage is done. Matching the last one
  // means the cube is solved, so every stage counts as done, whichever were opened.
  const stageMatched = (stageId: number) => {
    if (stageId >= totalStages) interactiveStagesData.forEach((stage) => markComplete(stage.id));
    else markComplete(stageId);
  };
  // ...and on: straight into the next stage's guide, or (after the last) back to the page.
  const nextStage = (stageId: number) => setOpenStageId(stageId >= totalStages ? null : stageId + 1);

  // A stuck beginner can always fall back on the solver.
  const openSolverFromGuide = () => {
    afterClose.current.solver = true;
    setOpenStageId(null);
  };

  const handleStageClick = (stageId: number) => {
    // Mid-guide, jumping to another stage would pull the beginner away from the
    // move they're doing; the open guide keeps its place until it's closed.
    if (openStageId !== null && stageId !== openStageId) {
      toast(`Close the Stage ${openStageId} guide first — your place in it is kept until you close it.`);
      return;
    }
    document.getElementById(`stage-${stageId}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Remounts every guide and the solver after a full reset, so nothing stale stays on screen.
  const [resetKey, setResetKey] = useState(0);
  const handleResetAll = () => {
    resetProgress();
    clearGuideMemory();
    setOpenStageId(null);
    setShowCelebration(false);
    setResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          content="Learn to solve a Rubik's Cube one turn at a time. A 3D cube with a big arrow shows every turn in plain words. No letters to decode, no flipping the cube, and your place is saved."
        />
        <meta name="keywords" content="Rubik's Cube, solve Rubik's Cube, beginner guide, tutorial, 3x3 cube, Layer by Layer method" />
      </Helmet>

      <main className="min-h-screen bg-background print:min-h-0">
        {/* Sticky header: progress, theme toggle, and (below 1440px) stage navigation */}
        <ProgressBar
          percentage={progressPercentage}
          completedCount={completedCount}
          totalStages={totalStages}
          compact={openStageId !== null || solverPlaying}
        >
          <StageStrip progress={progress} activeStage={activeStage} onStageClick={handleStageClick} />
        </ProgressBar>

        {/* Floating stage navigation on wide screens */}
        <StageSidebar progress={progress} activeStage={activeStage} onStageClick={handleStageClick} />

        {/* Hero */}
        <HeroSection onStart={() => setOpenStageId(1)} />

        {/* How to Use */}
        <HowToUseSection />


        {/* Instant Solver */}
        <CubeSolverSection key={`solver-${resetKey}`} onPlayingChange={setSolverPlaying} />

        {/* Stages */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {interactiveStagesData.map((stage) => (
              <InteractiveStageCard
                key={`${stage.id}-${resetKey}`}
                stage={stage}
                isComplete={progress[stage.id] || false}
                isLast={stage.id === totalStages}
                isOpen={openStageId === stage.id}
                onOpen={() => setOpenStageId(stage.id)}
                onClose={() => setOpenStageId(null)}
                nextTitle={interactiveStagesData.find((next) => next.id === stage.id + 1)?.title}
                onMatched={() => stageMatched(stage.id)}
                onNext={() => nextStage(stage.id)}
                onStartOver={stage.id > 1 ? () => setOpenStageId(1) : undefined}
                onOpenSolver={openSolverFromGuide}
              />
            ))}
          </div>
        </section>

        {/* The whole method on one page, for remembering it afterwards */}
        <CheatSheet />

        {/* Cubing letters: optional, after everything else */}
        <NotationReference />

        {/* Footer */}
        <SiteFooter onResetAll={handleResetAll} />

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

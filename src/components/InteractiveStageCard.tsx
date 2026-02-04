import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, RotateCcw, Play, Eye, EyeOff } from 'lucide-react';
import { InteractiveCube3D } from './InteractiveCube3D';
import { MoveButtons } from './MoveButtons';
import { StepGoalPreview } from './StepGoalPreview';
import { useCubeState, getStageStartState, MoveName } from '@/hooks/useCubeState';
import { InteractiveStage, MicroStep, FaceName } from '@/data/interactiveStagesData';

interface InteractiveStageCardProps {
  stage: InteractiveStage;
  isComplete: boolean;
  onToggleComplete: () => void;
}

export const InteractiveStageCard = ({
  stage,
  isComplete,
  onToggleComplete,
}: InteractiveStageCardProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { cubeState, performMove, undoMove, resetCube, moveHistory } = useCubeState(
    getStageStartState(stage.id)
  );
  const [isPracticing, setIsPracticing] = useState(false);
  const [showGoalPreview, setShowGoalPreview] = useState(true);

  const currentStep = stage.steps[currentStepIndex];
  const isLastStep = currentStepIndex === stage.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleMove = useCallback((move: MoveName) => {
    if (!currentStep.allowedMoves.includes(move)) return;
    performMove(move);
  }, [currentStep, performMove]);

  const handleFaceClick = useCallback((face: FaceName) => {
    if (!currentStep.allowedFaces.includes(face)) return;
    
    // Default to clockwise rotation when clicking a face
    const moveMap: Record<FaceName, MoveName> = {
      right: 'R',
      left: 'L',
      top: 'U',
      bottom: 'D',
      front: 'F',
      back: 'B',
    };
    
    if (currentStep.allowedMoves.includes(moveMap[face])) {
      performMove(moveMap[face]);
    }
  }, [currentStep, performMove]);

  const goToNextStep = () => {
    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStartPractice = () => {
    setIsPracticing(true);
    setCurrentStepIndex(0);
    resetCube(getStageStartState(stage.id));
  };

  const handleReset = () => {
    resetCube(getStageStartState(stage.id));
  };

  return (
    <section
      id={`stage-${stage.id}`}
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
              {isComplete ? <Check className="w-6 h-6" /> : stage.id}
            </span>
            <div>
              <h2 className="text-2xl font-bold text-foreground font-display">
                {stage.title}
              </h2>
              <p className="text-muted-foreground mt-1">{stage.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {!isPracticing ? (
          // Start screen
          <div className="text-center space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                🎯 Goal
              </h3>
              <p className="text-foreground text-lg">{stage.goal}</p>
            </div>
            
            <button
              onClick={handleStartPractice}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors"
            >
              <Play className="w-5 h-5" />
              Start Interactive Guide
            </button>
            
            <p className="text-sm text-muted-foreground">
              Follow step-by-step instructions with move locking
            </p>
          </div>
        ) : (
          // Interactive practice mode
          <div className="space-y-6">
            {/* Step Progress Bar */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Step {currentStepIndex + 1}/{stage.steps.length}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / stage.steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: 3D Cube */}
              <div className="order-2 lg:order-1">
                <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                  <InteractiveCube3D
                    cubeState={cubeState}
                    highlightFaces={currentStep.highlightFaces}
                    allowedFaces={currentStep.allowedFaces}
                    onFaceClick={handleFaceClick}
                  />
                  
                  {/* Move history */}
                  <div className="flex items-center gap-2 flex-wrap min-h-[32px]">
                    <span className="text-xs text-muted-foreground font-medium">Moves:</span>
                    {moveHistory.length === 0 ? (
                      <span className="text-xs text-muted-foreground/60 italic">None yet</span>
                    ) : (
                      <>
                        {moveHistory.slice(-8).map((move, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {move}
                          </span>
                        ))}
                        {moveHistory.length > 8 && (
                          <span className="text-xs text-muted-foreground">+{moveHistory.length - 8} more</span>
                        )}
                        <button
                          onClick={undoMove}
                          className="text-xs text-primary hover:underline ml-auto flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Undo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Instructions */}
              <div className="order-1 lg:order-2 space-y-4">
                {/* Current Instruction Card */}
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/30 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                      {currentStepIndex + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="text-foreground font-semibold text-lg leading-snug">
                        {currentStep.instruction}
                      </p>
                      {currentStep.tip && (
                        <p className="text-sm text-muted-foreground bg-background/50 rounded-lg px-3 py-2">
                          💡 {currentStep.tip}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {currentStep.stopCondition && (
                    <div className="mt-4 pt-4 border-t border-primary/20">
                      <div className="flex items-center gap-2">
                        <span className="text-cube-green text-lg">✓</span>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                            Stop when
                          </p>
                          <p className="text-sm text-foreground font-medium">{currentStep.stopCondition}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Goal Preview Toggle */}
                <button
                  onClick={() => setShowGoalPreview(!showGoalPreview)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showGoalPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showGoalPreview ? 'Hide goal preview' : 'Show goal preview'}
                </button>
                
                {showGoalPreview && (
                  <StepGoalPreview stepId={currentStep.id} />
                )}
              </div>
            </div>

            {/* Move Buttons */}
            <MoveButtons
              allowedMoves={currentStep.allowedMoves}
              allowedFaces={currentStep.allowedFaces}
              onMove={handleMove}
              highlightFaces={currentStep.highlightFaces}
            />

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                onClick={goToPrevStep}
                disabled={isFirstStep}
                className={cn(
                  "flex items-center gap-1 px-4 py-2.5 rounded-lg font-medium transition-colors",
                  isFirstStep
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-4 py-2.5 rounded-lg font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>

              <div className="flex-1" />

              {currentStep.isManualCheck ? (
                <button
                  onClick={isLastStep ? onToggleComplete : goToNextStep}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all",
                    isLastStep && isComplete
                      ? "bg-cube-green text-white"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {isLastStep ? (
                    <>
                      <Check className="w-4 h-4" />
                      {isComplete ? 'Stage Complete!' : 'Complete Stage'}
                    </>
                  ) : (
                    <>
                      Done, Next Step
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2.5 rounded-lg">
                  <span className="animate-pulse">●</span>
                  Complete the move to continue
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

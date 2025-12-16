import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, RotateCcw, Play, Pause } from 'lucide-react';
import { InteractiveCube3D } from './InteractiveCube3D';
import { MoveButtons } from './MoveButtons';
import { useCubeState, getSolvedCube, createScrambledCube, MoveName } from '@/hooks/useCubeState';
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
    stage.id === 1 ? createScrambledCube() : getSolvedCube()
  );
  const [isPracticing, setIsPracticing] = useState(false);

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
    resetCube(stage.id === 1 ? createScrambledCube() : getSolvedCube());
  };

  const handleReset = () => {
    resetCube(stage.id === 1 ? createScrambledCube() : getSolvedCube());
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
          <div className="grid md:grid-cols-2 gap-8">
            {/* 3D Cube */}
            <div className="order-2 md:order-1">
              <div className="bg-muted/30 rounded-xl p-4">
                <InteractiveCube3D
                  cubeState={cubeState}
                  highlightFaces={currentStep.highlightFaces}
                  allowedFaces={currentStep.allowedFaces}
                  onFaceClick={handleFaceClick}
                />
                
                {/* Move history */}
                {moveHistory.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Moves:</span>
                    {moveHistory.slice(-10).map((move, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {move}
                      </span>
                    ))}
                    <button
                      onClick={undoMove}
                      className="text-xs text-primary hover:underline ml-auto"
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Step Instructions */}
            <div className="order-1 md:order-2 space-y-6">
              {/* Step Progress */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {currentStepIndex + 1} of {stage.steps.length}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentStepIndex + 1) / stage.steps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Instruction */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {currentStepIndex + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-foreground font-medium text-lg">
                      {currentStep.instruction}
                    </p>
                    {currentStep.tip && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        💡 {currentStep.tip}
                      </p>
                    )}
                  </div>
                </div>
                
                {currentStep.stopCondition && (
                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      ✓ Stop when:
                    </p>
                    <p className="text-sm text-foreground">{currentStep.stopCondition}</p>
                  </div>
                )}
              </div>

              {/* Move Buttons */}
              <MoveButtons
                allowedMoves={currentStep.allowedMoves}
                allowedFaces={currentStep.allowedFaces}
                onMove={handleMove}
                highlightFaces={currentStep.highlightFaces}
              />

              {/* Navigation */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={goToPrevStep}
                  disabled={isFirstStep}
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors",
                    isFirstStep
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>

                {currentStep.isManualCheck ? (
                  <button
                    onClick={goToNextStep}
                    disabled={isLastStep}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg font-semibold transition-colors",
                      isLastStep
                        ? "bg-cube-green text-white"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {isLastStep ? (
                      <>
                        <Check className="w-4 h-4" />
                        Complete Stage
                      </>
                    ) : (
                      <>
                        Done, Next Step
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex-1 text-center text-sm text-muted-foreground">
                    Complete the move to continue
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Complete Button */}
        {isPracticing && isLastStep && (
          <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-4">
            <button
              onClick={onToggleComplete}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200",
                isComplete
                  ? "bg-cube-green text-white hover:bg-cube-green/90"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <Check className={cn("w-5 h-5", !isComplete && "opacity-50")} />
              {isComplete ? "Stage Complete!" : "Mark Stage as Complete"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rubiks-cube-progress';

export interface StageProgress {
  [stageId: number]: boolean;
}

export const useProgress = () => {
  const [progress, setProgress] = useState<StageProgress>(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const toggleStage = useCallback((stageId: number) => {
    setProgress((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  }, []);

  const markComplete = useCallback((stageId: number) => {
    setProgress((prev) => ({
      ...prev,
      [stageId]: true,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({});
  }, []);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalStages = 7;
  const progressPercentage = (completedCount / totalStages) * 100;

  return {
    progress,
    toggleStage,
    markComplete,
    resetProgress,
    completedCount,
    totalStages,
    progressPercentage,
  };
};

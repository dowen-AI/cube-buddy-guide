import { useSyncExternalStore } from 'react';

// Small, separate localStorage records for the guides and the solver. They
// never touch the stage-completion progress saved by useProgress.
const KNOWN_KEY = 'cube-guide-known-moves';
const STATE_KEY = 'cube-guide-state';
const PREFS_KEY = 'cube-guide-prefs';
const SOLVER_KEY = 'cube-solver-state';
const OLD_POSITION_KEY = 'cube-guide-position';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or storage full: everything still works, it just forgets
  }
};

// Sets of turns the person has completed at least once (keyed by the turns
// themselves, so the Sledgehammer learned in Stage 2 is known in Stage 4 too).
export const getKnownMoves = (): string[] => read<string[]>(KNOWN_KEY, []);
export const markMoveKnown = (moves: string) => {
  const known = getKnownMoves();
  if (!known.includes(moves)) write(KNOWN_KEY, [...known, moves]);
};

// The exact screen the person is on inside each stage (move number, counters,
// picture and all), so a locked phone or a reload resumes on the same turn.
export const loadGuideState = <T,>(stageId: number, version: number): T | null => {
  const saved = read<Record<string, { v: number; s: T }>>(STATE_KEY, {})[stageId];
  return saved && saved.v === version ? saved.s : null;
};
export const saveGuideState = (stageId: number, version: number, state: unknown | null) => {
  const all = read<Record<string, unknown>>(STATE_KEY, {});
  if (state) all[stageId] = { v: version, s: state };
  else delete all[stageId];
  write(STATE_KEY, all);
};

// The solver: painted colors, the solution and the move the person is on.
export const loadSolverState = <T,>(): T | null => read<T | null>(SOLVER_KEY, null);
export const saveSolverState = (state: unknown | null) => {
  if (state) write(SOLVER_KEY, state);
  else try { localStorage.removeItem(SOLVER_KEY); } catch { /* ignore */ }
};

// "Start over": forget everything the guides and solver remember (stage
// completion itself is reset by useProgress).
export const clearGuideMemory = () => {
  for (const key of [KNOWN_KEY, STATE_KEY, SOLVER_KEY, OLD_POSITION_KEY]) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
};

// ---- preferences shared by every guide, the solver and the cheat sheet ----
export interface Prefs {
  letters: boolean; // show cubing letters (R, U', F2…) next to the plain words
  bigText: boolean; // larger instruction text
  readAloud: boolean; // speak each instruction when it appears
  handsFree: boolean; // go to the next move by itself after a few seconds
}
const DEFAULT_PREFS: Prefs = { letters: false, bigText: false, readAloud: false, handsFree: false };
let prefs: Prefs = { ...DEFAULT_PREFS, ...read<Partial<Prefs>>(PREFS_KEY, {}) };
const listeners = new Set<() => void>();
export const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
  prefs = { ...prefs, [key]: value };
  write(PREFS_KEY, prefs);
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, () => prefs, () => DEFAULT_PREFS);

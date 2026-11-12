import type { Counters } from '@/data/followAlong';

// Small, separate localStorage records for the follow-along guides. They never
// touch the stage-completion progress saved by useProgress.
const KNOWN_KEY = 'cube-guide-known-moves';
const POSITION_KEY = 'cube-guide-position';

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
    // private mode or storage full: the guide still works, it just forgets
  }
};

// Move sequences the person has completed at least once (keyed by the moves
// themselves, so the Sledgehammer learned in Stage 2 is known in Stage 7 too).
export const getKnownMoves = (): string[] => read<string[]>(KNOWN_KEY, []);
export const markMoveKnown = (moves: string) => {
  const known = getKnownMoves();
  if (!known.includes(moves)) write(KNOWN_KEY, [...known, moves]);
};

// Where the person is inside each stage, so a locked phone or a reload doesn't
// send them back to the start of the stage.
export interface SavedPosition { step: string; counters: Counters }
export const loadPosition = (stageId: number): SavedPosition | null => read<Record<string, SavedPosition>>(POSITION_KEY, {})[stageId] ?? null;
export const savePosition = (stageId: number, position: SavedPosition | null) => {
  const all = read<Record<string, SavedPosition>>(POSITION_KEY, {});
  if (position) all[stageId] = position;
  else delete all[stageId];
  write(POSITION_KEY, all);
};

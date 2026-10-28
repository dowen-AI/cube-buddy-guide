import Cube from 'cubejs';
import { CubeState, CUBE_COLORS, MoveName } from '@/hooks/useCubeState';

type FaceLetter = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export class SolverError extends Error {}

// Our internal face-color scheme (fixed by getSolvedCube in useCubeState.ts):
// top=yellow(U), right=green(R), front=red(F), bottom=white(D), left=blue(L), back=orange(B)
const FACE_ORDER: { face: keyof CubeState; letter: FaceLetter }[] = [
  { face: 'top', letter: 'U' },
  { face: 'right', letter: 'R' },
  { face: 'front', letter: 'F' },
  { face: 'bottom', letter: 'D' },
  { face: 'left', letter: 'L' },
  { face: 'back', letter: 'B' },
];

const COLOR_TO_LETTER: Record<string, FaceLetter> = {
  [CUBE_COLORS.yellow]: 'U',
  [CUBE_COLORS.green]: 'R',
  [CUBE_COLORS.red]: 'F',
  [CUBE_COLORS.white]: 'D',
  [CUBE_COLORS.blue]: 'L',
  [CUBE_COLORS.orange]: 'B',
};

export const LETTER_TO_COLOR: Record<FaceLetter, string> = {
  U: CUBE_COLORS.yellow,
  R: CUBE_COLORS.green,
  F: CUBE_COLORS.red,
  D: CUBE_COLORS.white,
  L: CUBE_COLORS.blue,
  B: CUBE_COLORS.orange,
};

const LETTER_BASE: Record<FaceLetter, number> = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

// Converts our per-face color grids into the standard 54-char facelet string
// (U R F D L B, each read row-major), the format cubejs's Cube.fromString expects.
// Verified by round-trip testing against cubejs's own move engine.
export const cubeStateToFacelets = (state: CubeState): string => {
  const result: string[] = new Array(54);
  for (const { face, letter } of FACE_ORDER) {
    const base = LETTER_BASE[letter];
    const grid = state[face];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const letterAtCell = COLOR_TO_LETTER[grid[r][c]];
        if (!letterAtCell) {
          throw new SolverError('Every sticker must be one of the six cube colors.');
        }
        result[base + r * 3 + c] = letterAtCell;
      }
    }
  }
  return result.join('');
};

// Standard corner/edge facelet index tables (positions within the 54-char string),
// matching cubejs's own definitions.
const CORNERS: { indices: [number, number, number]; colors: [FaceLetter, FaceLetter, FaceLetter] }[] = [
  { indices: [8, 9, 20], colors: ['U', 'R', 'F'] },   // URF
  { indices: [6, 18, 38], colors: ['U', 'F', 'L'] },  // UFL
  { indices: [0, 36, 47], colors: ['U', 'L', 'B'] },  // ULB
  { indices: [2, 45, 11], colors: ['U', 'B', 'R'] },  // UBR
  { indices: [29, 26, 15], colors: ['D', 'F', 'R'] }, // DFR
  { indices: [27, 44, 24], colors: ['D', 'L', 'F'] }, // DLF
  { indices: [33, 53, 42], colors: ['D', 'B', 'L'] }, // DBL
  { indices: [35, 17, 51], colors: ['D', 'R', 'B'] }, // DRB
];

const EDGES: { indices: [number, number]; colors: [FaceLetter, FaceLetter] }[] = [
  { indices: [5, 10], colors: ['U', 'R'] },
  { indices: [7, 19], colors: ['U', 'F'] },
  { indices: [3, 37], colors: ['U', 'L'] },
  { indices: [1, 46], colors: ['U', 'B'] },
  { indices: [32, 16], colors: ['D', 'R'] },
  { indices: [28, 25], colors: ['D', 'F'] },
  { indices: [30, 43], colors: ['D', 'L'] },
  { indices: [34, 52], colors: ['D', 'B'] },
  { indices: [23, 12], colors: ['F', 'R'] },
  { indices: [21, 41], colors: ['F', 'L'] },
  { indices: [50, 39], colors: ['B', 'L'] },
  { indices: [48, 14], colors: ['B', 'R'] },
];

const CENTER_INDEX: Record<FaceLetter, number> = { U: 4, R: 13, F: 22, D: 31, L: 40, B: 49 };

const permutationParity = (perm: number[]): number => {
  const visited = new Array(perm.length).fill(false);
  let parity = 0;
  for (let i = 0; i < perm.length; i++) {
    if (visited[i]) continue;
    let cycleLength = 0;
    let j = i;
    while (!visited[j]) {
      visited[j] = true;
      j = perm[j];
      cycleLength++;
    }
    parity += cycleLength - 1;
  }
  return parity % 2;
};

const sameSet = <T,>(a: T[], b: T[]): boolean => {
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
};

/**
 * Checks that a facelet string represents a state a real cube can actually
 * reach (right piece colors, and correct permutation/orientation parity).
 * This catches manual color-entry mistakes that would otherwise make the
 * solver hang, throw, or silently return a bogus solution.
 */
export const validateFacelets = (facelets: string): { valid: boolean; error?: string } => {
  if (facelets.length !== 54 || /[^URFDLB]/.test(facelets)) {
    return { valid: false, error: 'Cube data is corrupted.' };
  }

  for (const letter of Object.keys(LETTER_BASE) as FaceLetter[]) {
    const count = facelets.split('').filter((ch) => ch === letter).length;
    if (count !== 9) {
      return { valid: false, error: `Expected 9 ${letter} stickers, found ${count}. Double-check your colors.` };
    }
    if (facelets[CENTER_INDEX[letter]] !== letter) {
      return { valid: false, error: 'Center stickers must stay fixed — they define each face.' };
    }
  }

  const usedCorners = new Set<number>();
  const cp: number[] = [];
  const co: number[] = [];
  for (let slot = 0; slot < CORNERS.length; slot++) {
    const { indices } = CORNERS[slot];
    const actual = indices.map((i) => facelets[i]) as FaceLetter[];

    let matchIndex = -1;
    let matchOri = -1;
    for (let candidate = 0; candidate < CORNERS.length; candidate++) {
      if (usedCorners.has(candidate)) continue;
      const canonical = CORNERS[candidate].colors;
      if (!sameSet(actual, canonical)) continue;
      for (let ori = 0; ori < 3; ori++) {
        if ([0, 1, 2].every((n) => actual[(n + ori) % 3] === canonical[n])) {
          matchIndex = candidate;
          matchOri = ori;
          break;
        }
      }
      if (matchIndex !== -1) break;
    }

    if (matchIndex === -1) {
      return { valid: false, error: 'One of the corner pieces has an impossible color combination.' };
    }
    usedCorners.add(matchIndex);
    cp[slot] = matchIndex;
    co[slot] = matchOri;
  }

  const usedEdges = new Set<number>();
  const ep: number[] = [];
  const eo: number[] = [];
  for (let slot = 0; slot < EDGES.length; slot++) {
    const { indices } = EDGES[slot];
    const actual = indices.map((i) => facelets[i]) as FaceLetter[];

    let matchIndex = -1;
    let matchOri = -1;
    for (let candidate = 0; candidate < EDGES.length; candidate++) {
      if (usedEdges.has(candidate)) continue;
      const canonical = EDGES[candidate].colors;
      if (!sameSet(actual, canonical)) continue;
      if (actual[0] === canonical[0] && actual[1] === canonical[1]) {
        matchIndex = candidate;
        matchOri = 0;
      } else if (actual[0] === canonical[1] && actual[1] === canonical[0]) {
        matchIndex = candidate;
        matchOri = 1;
      }
      if (matchIndex !== -1) break;
    }

    if (matchIndex === -1) {
      return { valid: false, error: 'One of the edge pieces has an impossible color combination.' };
    }
    usedEdges.add(matchIndex);
    ep[slot] = matchIndex;
    eo[slot] = matchOri;
  }

  const cornerTwist = co.reduce((a, b) => a + b, 0) % 3;
  const edgeFlip = eo.reduce((a, b) => a + b, 0) % 2;
  if (cornerTwist !== 0) {
    return { valid: false, error: 'A corner piece looks twisted in a way that is not possible on a real cube.' };
  }
  if (edgeFlip !== 0) {
    return { valid: false, error: 'An edge piece looks flipped in a way that is not possible on a real cube — check for two swapped stickers.' };
  }
  if (permutationParity(cp) !== permutationParity(ep)) {
    return { valid: false, error: 'This color arrangement can\'t be reached by turning a real cube — check for two swapped stickers.' };
  }

  return { valid: true };
};

const SOLVED_FACELETS = 'U'.repeat(9) + 'R'.repeat(9) + 'F'.repeat(9) + 'D'.repeat(9) + 'L'.repeat(9) + 'B'.repeat(9);

let solverReadyPromise: Promise<void> | null = null;

// cubejs's pruning-table build is a one-time, CPU-heavy synchronous call.
// We defer it to a macrotask so callers can render a loading state first.
export const ensureSolverReady = (): Promise<void> => {
  if (!solverReadyPromise) {
    solverReadyPromise = new Promise((resolve) => {
      setTimeout(() => {
        Cube.initSolver();
        resolve();
      }, 0);
    });
  }
  return solverReadyPromise;
};

export const solveCubeState = async (state: CubeState): Promise<MoveName[]> => {
  const facelets = cubeStateToFacelets(state);
  const validation = validateFacelets(facelets);
  if (!validation.valid) {
    throw new SolverError(validation.error ?? 'This cube state cannot be solved.');
  }

  if (facelets === SOLVED_FACELETS) {
    return [];
  }

  await ensureSolverReady();

  const cube = Cube.fromString(facelets);
  const solution = cube.solve();
  if (typeof solution !== 'string') {
    throw new SolverError('Could not find a solution for this cube state.');
  }

  return solution.trim().split(/\s+/).filter(Boolean) as MoveName[];
};
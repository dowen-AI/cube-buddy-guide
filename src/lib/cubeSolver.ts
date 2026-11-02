import Cube from 'cubejs';
import { CubeState, CUBE_COLORS, MoveName } from '@/hooks/useCubeState';

type FaceLetter = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export class SolverError extends Error {
  constructor(message: string, readonly highlight: number[] = []) {
    super(message);
  }
}

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

const FACE_NAME: Record<FaceLetter, string> = {
  U: 'top', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back',
};

const colorName = (hex: string) =>
  Object.entries(CUBE_COLORS).find(([, value]) => value === hex)?.[0] ?? 'unknown';

// Names a sticker color by the face whose center currently shows it,
// e.g. "yellow" + "top", so errors never expose bare U/R/F/D/L/B letters.
const describeColor = (facelets: string, letter: FaceLetter) => {
  const face = (Object.keys(CENTER_INDEX) as FaceLetter[]).find((f) => facelets[CENTER_INDEX[f]] === letter) ?? letter;
  return { color: colorName(LETTER_TO_COLOR[letter]), face: FACE_NAME[face] };
};

const letterColor = (l: FaceLetter) => colorName(LETTER_TO_COLOR[l]);
const listColors = (ls: FaceLetter[]) => ls.map(letterColor).join(', ');
const OPPOSITE: Record<FaceLetter, FaceLetter> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

const CORNER_NAMES = ['top-front-right', 'top-front-left', 'top-back-left', 'top-back-right', 'bottom-front-right', 'bottom-front-left', 'bottom-back-left', 'bottom-back-right'];
const EDGE_NAMES = ['top-right', 'top-front', 'top-left', 'top-back', 'bottom-right', 'bottom-front', 'bottom-left', 'bottom-back', 'front-right', 'front-left', 'back-left', 'back-right'];
const cornerWhere = (slot: number) => `the ${CORNER_NAMES[slot]} corner (where the ${CORNER_NAMES[slot].split('-').join(', ').replace(/, ([^,]*)$/, ' and $1')} faces meet)`;
const edgeWhere = (slot: number) => `the ${EDGE_NAMES[slot]} edge (between the ${EDGE_NAMES[slot].replace('-', ' and ')} faces)`;

// Facelet index (0-53) -> which face/row/column of the net it is.
export const faceletToSticker = (i: number): { face: keyof CubeState; r: number; c: number } => ({
  face: FACE_ORDER[Math.floor(i / 9)].face,
  r: Math.floor((i % 9) / 3),
  c: i % 3,
});

const pieceProblem = (actual: FaceLetter[]): string | null => {
  const dup = actual.find((l, i) => actual.indexOf(l) !== i);
  if (dup) return `shows two ${letterColor(dup)} stickers, but no piece has the same color twice`;
  const opp = actual.find((l) => actual.includes(OPPOSITE[l]));
  if (opp) return `shows ${letterColor(opp)} and ${letterColor(OPPOSITE[opp])} together, but those colors are on opposite sides of the cube, so they're never on the same piece`;
  return null;
};

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
const capitalize = (t: string) => t[0].toUpperCase() + t.slice(1);

export const validateFacelets = (facelets: string): { valid: boolean; error?: string; highlight?: number[] } => {
  if (facelets.length !== 54 || /[^URFDLB]/.test(facelets)) {
    return { valid: false, error: 'Cube data is corrupted.' };
  }

  const letters = Object.keys(LETTER_BASE) as FaceLetter[];
  const counts = letters.map((l) => ({ l, n: facelets.split('').filter((ch) => ch === l).length }));
  const off = counts.filter((x) => x.n !== 9);
  if (off.length) {
    const describe = ({ l, n }: { l: FaceLetter; n: number }) => {
      const { color, face } = describeColor(facelets, l);
      return `${n} ${color} (the ${face} center's color)`;
    };
    const over = off.filter((x) => x.n > 9);
    const under = off.filter((x) => x.n < 9);
    const hint = over.length === 1 && under.length === 1 && over[0].n === 10 && under[0].n === 8
      ? ` Most likely one sticker you painted ${letterColor(over[0].l)} is really ${letterColor(under[0].l)} — look for it on your cube.`
      : ` Compare each face of the net with your cube and fix the stickers in those colors.`;
    return {
      valid: false,
      error: `Each color must appear exactly 9 times, but you have ${off.map(describe).join(' and ')}.${hint}`,
    };
  }
  for (const letter of letters) {
    if (facelets[CENTER_INDEX[letter]] !== letter) {
      return { valid: false, error: 'Center stickers must stay fixed — they define each face.' };
    }
  }

  const usedCorners = new Set<number>();
  const cornerUsedAt = new Map<number, number>();
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
      const where = cornerWhere(slot);
      const seen = `shows ${listColors(actual)}`;
      const problem = pieceProblem(actual);
      const twin = CORNERS.findIndex((k) => sameSet(actual, k.colors));
      const message = problem
        ? `${capitalize(where)} ${problem}. Re-check those three stickers on your cube.`
        : twin !== -1 && cornerUsedAt.has(twin)
          ? `You painted two corners with ${listColors(actual)}: ${cornerWhere(cornerUsedAt.get(twin)!)} and ${where}. A cube has only one of each — re-check both corners.`
          : twin !== -1
            ? `${capitalize(where)} ${seen} — real colors, but in mirror-image order, so two of its stickers are swapped. Re-check those three stickers.`
            : `${capitalize(where)} ${seen}, but no corner on a real cube has those three colors. Re-check those three stickers.`;
      const extra = twin !== -1 && cornerUsedAt.has(twin) ? CORNERS[cornerUsedAt.get(twin)!].indices : [];
      return { valid: false, error: message, highlight: [...indices, ...extra] };
    }
    usedCorners.add(matchIndex);
    cornerUsedAt.set(matchIndex, slot);
    cp[slot] = matchIndex;
    co[slot] = matchOri;
  }

  const usedEdges = new Set<number>();
  const edgeUsedAt = new Map<number, number>();
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
      const where = edgeWhere(slot);
      const problem = pieceProblem(actual);
      const twin = EDGES.findIndex((k) => sameSet(actual, k.colors));
      const message = problem
        ? `${capitalize(where)} ${problem}. Re-check those two stickers on your cube.`
        : twin !== -1 && edgeUsedAt.has(twin)
          ? `You painted two edges with ${listColors(actual)}: ${edgeWhere(edgeUsedAt.get(twin)!)} and ${where}. A cube has only one of each — re-check both edges.`
          : `${capitalize(where)} shows ${listColors(actual)}, but no edge on a real cube has those colors. Re-check those two stickers.`;
      const extra = twin !== -1 && edgeUsedAt.has(twin) ? EDGES[edgeUsedAt.get(twin)!].indices : [];
      return { valid: false, error: message, highlight: [...indices, ...extra] };
    }
    usedEdges.add(matchIndex);
    edgeUsedAt.set(matchIndex, slot);
    ep[slot] = matchIndex;
    eo[slot] = matchOri;
  }

  const cornerTwist = co.reduce((a, b) => a + b, 0) % 3;
  const edgeFlip = eo.reduce((a, b) => a + b, 0) % 2;
  if (cornerTwist !== 0) {
    return { valid: false, error: "Every piece has real colors, but one corner looks twisted in its spot, which can't happen on a real cube. One corner's stickers are probably painted in the wrong order (for example its top and front colors swapped). Re-check each corner's three stickers against your cube." };
  }
  if (edgeFlip !== 0) {
    return { valid: false, error: "Every piece has real colors, but one edge looks flipped in place, which can't happen on a real cube. Its two stickers are probably swapped. Re-check each edge's two stickers against your cube." };
  }
  if (permutationParity(cp) !== permutationParity(ep)) {
    return { valid: false, error: "Every piece has real colors, but two pieces look swapped, which can't happen on a real cube. Look for two stickers you may have painted in each other's spots." };
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
    throw new SolverError(validation.error ?? 'This cube state cannot be solved.', validation.highlight);
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
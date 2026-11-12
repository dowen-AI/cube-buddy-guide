// Getting SHORT solutions out of cubejs (Kociemba two-phase).
//
// cubejs returns the first solution it finds, up to 22 moves, and never notices
// a cube that is already solved after "phase 1" unless the depth limit is exact,
// so a 4-move scramble comes back as 11 moves. Three things fix that without
// leaving cubejs:
//   1. shortProbe: ask for exactly 1, 2, 3 … moves first (cheap up to about 9).
//   2. variants: solve the same cube turned on its side, and its mirror-in-time
//      (the inverse). Two-phase treats the up/down axis specially, so the six
//      variants give six different searches.
//   3. a lower depth limit (20) on each variant, run in background workers with
//      a time budget (see solverPool.ts), since a failed deep search is slow.
// Everything here is plain strings so it can be unit-tested.

export interface CubeLike {
  solve: (maxDepth?: number) => string | null;
  isSolved: () => boolean;
  move: (alg: string) => CubeLike;
}
export interface CubeClass {
  new (): CubeLike;
  fromString: (facelets: string) => CubeLike;
  inverse: (alg: string) => string;
}

export const moveCount = (alg: string) => alg.trim().split(/\s+/).filter(Boolean).length;

// solve() throws inside cubejs when nothing is found at that depth
export const trySolve = (cube: CubeLike, maxDepth?: number): string | null => {
  try {
    const r = maxDepth === undefined ? cube.solve() : cube.solve(maxDepth);
    return typeof r === 'string' ? r.trim() : null;
  } catch {
    return null;
  }
};

export const SHORT_PROBE_DEPTH = 9;
type FaceMap = Record<string, string>;
const TURNS: FaceMap[] = [
  { U: 'U', D: 'D', R: 'R', L: 'L', F: 'F', B: 'B' },
  { U: 'R', R: 'D', D: 'L', L: 'U', F: 'F', B: 'B' }, // whole cube rolled sideways
  { U: 'F', F: 'D', D: 'B', B: 'U', R: 'R', L: 'L' }, // whole cube tipped forward
];
const rename = (alg: string, map: FaceMap) => alg.split(/\s+/).filter(Boolean).map((m) => map[m[0]] + m.slice(1)).join(' ');
const reverseMap = (map: FaceMap): FaceMap => Object.fromEntries(Object.entries(map).map(([a, b]) => [b, a]));

export const VARIANT_COUNT = TURNS.length * 2;

// `scramble` is any sequence that produces the cube from solved. Returns a
// sequence that produces variant k of it (from solved).
export const variantScramble = (Cube: CubeClass, scramble: string, k: number): string => {
  const map = TURNS[Math.floor(k / 2)];
  const inverse = k % 2 === 1;
  return rename(inverse ? Cube.inverse(scramble) : scramble, map);
};
// Turns a solution of variant k back into a solution of the real cube.
export const fromVariant = (Cube: CubeClass, solution: string, k: number): string => {
  const back = rename(solution, reverseMap(TURNS[Math.floor(k / 2)]));
  return k % 2 === 1 ? Cube.inverse(back) : back;
};

// One search: variant k of the cube, limited to maxDepth moves. null = nothing found.
export const solveVariant = (Cube: CubeClass, scramble: string, k: number, maxDepth?: number): string | null => {
  const found = trySolve(new Cube().move(variantScramble(Cube, scramble, k)), maxDepth);
  if (found === null) return null;
  const solution = fromVariant(Cube, found, k);
  // never hand back anything that does not actually solve the cube
  return new Cube().move(scramble).move(solution).isSolved() ? solution : null;
};

// ---- exact answers for cubes that are only a few moves from solved ----
//
// cubejs only finds a solution of exactly d moves when that solution contains a
// quarter turn of a face that is "sideways" for its up/down axis. Looking along
// all three axes covers every solution with any quarter turn in it; solutions
// made only of half turns are found by the small search below.
const HALF = ['U2', 'D2', 'R2', 'L2', 'F2', 'B2'];
const OPPOSITE: Record<string, string> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
const FACE_ORDER = 'URFDLB';
const halfTurnsOnly = (facelets: string) =>
  [...facelets].every((c, i) => { const face = FACE_ORDER[Math.floor(i / 9)]; return c === face || c === OPPOSITE[face]; });
const HALF_DEPTH = 7;
const halfTurnSearch = (Cube: CubeClass, facelets: string): string | null => {
  if (!halfTurnsOnly(facelets)) return null;
  const cube = Cube.fromString(facelets);
  const path: string[] = [];
  const dfs = (left: number, last: number): boolean => {
    if (left === 0) return cube.isSolved();
    for (let i = 0; i < HALF.length; i++) {
      if (i === last) continue;
      if (last >= 0 && Math.floor(i / 2) === Math.floor(last / 2) && i < last) continue; // U2 D2 and D2 U2 are the same
      cube.move(HALF[i]); path.push(HALF[i]);
      if (dfs(left - 1, i)) return true;
      path.pop(); cube.move(HALF[i]);
    }
    return false;
  };
  for (let d = 1; d <= HALF_DEPTH; d++) if (dfs(d, -1)) return path.join(' ');
  return null;
};

// The shortest solution when the cube is at most SHORT_PROBE_DEPTH moves from
// solved; null when it is further away than that. `scramble` is any sequence
// that produces the cube.
export const shortProbe = (Cube: CubeClass, facelets: string, scramble: string): string | null => {
  const cube = Cube.fromString(facelets);
  if (cube.isSolved()) return '';
  const half = halfTurnSearch(Cube, facelets);
  for (let d = 1; d <= SHORT_PROBE_DEPTH; d++) {
    if (half !== null && moveCount(half) <= d) return half;
    for (let k = 0; k < VARIANT_COUNT; k += 2) {
      const r = solveVariant(Cube, scramble, k, d);
      if (r !== null) return r;
    }
  }
  return half;
};

export interface FirstPass { solution: string; exact: boolean }
// Quick first answer: the exact short one if there is one, else cubejs's first find (22 moves or fewer).
export const firstPass = (Cube: CubeClass, facelets: string): FirstPass | null => {
  const first = trySolve(Cube.fromString(facelets));
  if (first === null) return null;
  const short = shortProbe(Cube, facelets, Cube.inverse(first));
  return short !== null && moveCount(short) <= moveCount(first) ? { solution: short, exact: true } : { solution: first, exact: false };
};

// Without workers (old browsers, tests): the quick first answer, improved by
// the best of the six ordinary searches.
export const solveWithoutWorkers = (Cube: CubeClass, facelets: string): FirstPass | null => {
  const first = firstPass(Cube, facelets);
  if (first === null || first.exact) return first;
  const scramble = Cube.inverse(first.solution);
  let best = first.solution;
  for (let k = 1; k < VARIANT_COUNT; k++) {
    const s = solveVariant(Cube, scramble, k);
    if (s !== null && moveCount(s) < moveCount(best)) best = s;
  }
  return { solution: best, exact: false };
};

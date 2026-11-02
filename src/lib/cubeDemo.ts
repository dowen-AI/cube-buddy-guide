import { CUBE_COLORS as C, executeMove, getSolvedCube, type CubeState, type MoveName } from '@/hooks/useCubeState';
import { FACES, type Face } from '@/lib/cubeGeometry';

export type Hold = 'yellow-top' | 'white-top';

// A demo cube: real colors plus a parallel "visible" layer ('1' shown, '0' grey).
// The visible layer goes through the same moves, so the pieces that matter
// stay highlighted wherever they travel.
export interface Demo {
  colors: CubeState;
  vis: CubeState;
}

type Grid = string[][];
const grid = (f: (r: number, c: number) => string): Grid => [0, 1, 2].map((r) => [0, 1, 2].map((c) => f(r, c)));
const fill = (color: string) => grid(() => color);
const mapFaces = (f: (face: Face) => Grid): CubeState =>
  Object.fromEntries(FACES.map((face) => [face, f(face)])) as unknown as CubeState;

export const solvedFor = (hold: Hold): CubeState =>
  hold === 'yellow-top'
    ? getSolvedCube()
    : // Flipped upside down: white on top, yellow below, left and right swap.
      { front: fill(C.red), back: fill(C.orange), left: fill(C.green), right: fill(C.blue), top: fill(C.white), bottom: fill(C.yellow) };

export type VisRule = (face: Face, r: number, c: number) => boolean;
export type StickerRef = [Face, number, number];

export const isCenter = (r: number, c: number) => r === 1 && c === 1;
export const isEdgeSticker = (r: number, c: number) => (r + c) % 2 === 1;
const SIDES: Face[] = ['front', 'right', 'back', 'left'];
export const isSide = (face: Face) => SIDES.includes(face);

export const showAll: VisRule = () => true;

// Build a demo from the solved cube (for `hold`), mark visible stickers by a rule
// on solved positions plus specific target pieces, then apply the setup moves.
export const scenario = (hold: Hold, rule: VisRule, setup = '', targets: StickerRef[] = []): Demo => {
  const vis = mapFaces((face) =>
    grid((r, c) => (isCenter(r, c) || rule(face, r, c) || targets.some(([f, tr, tc]) => f === face && tr === r && tc === c) ? '1' : '0')),
  );
  return applyMoves({ colors: solvedFor(hold), vis }, setup);
};

const cw = (f: Grid): Grid => [[f[2][0], f[1][0], f[0][0]], [f[2][1], f[1][1], f[0][1]], [f[2][2], f[1][2], f[0][2]]];
const ccw = (f: Grid): Grid => cw(cw(cw(f)));
const copy = (f: Grid): Grid => f.map((row) => [...row]);

// Whole-cube turn, clockwise seen from above (same face stays on top).
const yRotate = (s: CubeState): CubeState => ({
  front: copy(s.right), right: copy(s.back), back: copy(s.left), left: copy(s.front), top: cw(s.top), bottom: ccw(s.bottom),
});

export type DemoStep = MoveName | 'y' | "y'" | 'y2';

export const applyStep = (d: Demo, step: DemoStep): Demo => {
  if (step === 'y' || step === "y'" || step === 'y2') {
    const times = step === 'y' ? 1 : step === 'y2' ? 2 : 3;
    let { colors, vis } = d;
    for (let i = 0; i < times; i++) { colors = yRotate(colors); vis = yRotate(vis); }
    return { colors, vis };
  }
  return { colors: executeMove(d.colors, step), vis: executeMove(d.vis, step) };
};

export const applyMoves = (d: Demo, seq: string): Demo =>
  seq.split(/\s+/).filter(Boolean).reduce((acc, s) => applyStep(acc, s as DemoStep), d);

// Twist one corner in place (by moving its three stickers around), for demos
// that need a corner turned the wrong way.
export const twistCorner = (d: Demo, refs: StickerRef[], dir: 1 | 2): Demo => {
  const colors = JSON.parse(JSON.stringify(d.colors)) as CubeState;
  const vals = refs.map(([f, r, c]) => colors[f][r][c]);
  refs.forEach(([f, r, c], i) => { colors[f][r][c] = vals[(i + dir) % 3]; });
  return { colors, vis: d.vis };
};

export const flipEdge = (d: Demo, a: StickerRef, b: StickerRef): Demo => {
  const colors = JSON.parse(JSON.stringify(d.colors)) as CubeState;
  const tmp = colors[a[0]][a[1]][a[2]];
  colors[a[0]][a[1]][a[2]] = colors[b[0]][b[1]][b[2]];
  colors[b[0]][b[1]][b[2]] = tmp;
  return { colors, vis: d.vis };
};

// Repeat `step` (up to 3 times) until `done` holds; used so the demo cube does
// the same "turn until it lines up" a beginner does on their real cube.
export const turnUntil = (d: Demo, step: DemoStep, done: (s: CubeState) => boolean): Demo => {
  let cur = d;
  for (let i = 0; i < 4 && !done(cur.colors); i++) cur = applyStep(cur, step);
  return cur;
};

const at = (s: CubeState, [f, r, c]: StickerRef) => s[f][r][c];
const center = (s: CubeState, f: Face) => s[f][1][1];

// ---- top-layer geometry (same in either hold) ----
export const TOP_EDGES: { top: StickerRef; side: StickerRef; face: Face }[] = [
  { top: ['top', 2, 1], side: ['front', 0, 1], face: 'front' },
  { top: ['top', 1, 2], side: ['right', 0, 1], face: 'right' },
  { top: ['top', 0, 1], side: ['back', 0, 1], face: 'back' },
  { top: ['top', 1, 0], side: ['left', 0, 1], face: 'left' },
];
export const BOTTOM_EDGES: { down: StickerRef; side: StickerRef; face: Face }[] = [
  { down: ['bottom', 0, 1], side: ['front', 2, 1], face: 'front' },
  { down: ['bottom', 1, 2], side: ['right', 2, 1], face: 'right' },
  { down: ['bottom', 2, 1], side: ['back', 2, 1], face: 'back' },
  { down: ['bottom', 1, 0], side: ['left', 2, 1], face: 'left' },
];
export const TOP_CORNERS: { top: StickerRef; a: StickerRef; b: StickerRef; faces: [Face, Face] }[] = [
  { top: ['top', 2, 2], a: ['front', 0, 2], b: ['right', 0, 0], faces: ['front', 'right'] },
  { top: ['top', 0, 2], a: ['right', 0, 2], b: ['back', 0, 0], faces: ['right', 'back'] },
  { top: ['top', 0, 0], a: ['back', 0, 2], b: ['left', 0, 0], faces: ['back', 'left'] },
  { top: ['top', 2, 0], a: ['left', 0, 2], b: ['front', 0, 0], faces: ['left', 'front'] },
];
export const FRONT_RIGHT_BOTTOM: StickerRef[] = [['bottom', 0, 2], ['front', 2, 2], ['right', 2, 0]];
export const FRONT_LEFT_BOTTOM: StickerRef[] = [['bottom', 0, 0], ['left', 2, 2], ['front', 2, 0]];

const sameSet = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join();

// Stage 1: a white edge on top with white facing up, side color over its center.
export const petalMatched = (s: CubeState) => TOP_EDGES.some((e) => at(s, e.top) === C.white && at(s, e.side) === center(s, e.face));
export const petalMatchedAtFront = (s: CubeState) => at(s, TOP_EDGES[0].top) === C.white && at(s, TOP_EDGES[0].side) === center(s, 'front');

// Stage 2: the white corner on top sits right above its home slot.
const cornerOverSlot = (s: CubeState, k: (typeof TOP_CORNERS)[number]) => {
  const colors = [at(s, k.top), at(s, k.a), at(s, k.b)];
  return colors.includes(C.white) && sameSet(colors.filter((x) => x !== C.white), [center(s, k.faces[0]), center(s, k.faces[1])]);
};
export const whiteCornerOverSlot = (s: CubeState) => TOP_CORNERS.some((k) => cornerOverSlot(s, k));
export const whiteCornerOverFrontRight = (s: CubeState) => cornerOverSlot(s, TOP_CORNERS[0]);

// Stage 3: a bottom edge without yellow whose side color matches the center above.
const bottomEdgeReady = (s: CubeState, e: (typeof BOTTOM_EDGES)[number]) =>
  at(s, e.down) !== C.yellow && at(s, e.side) !== C.yellow && at(s, e.side) === center(s, e.face);
export const bottomEdgeAligned = (s: CubeState) => BOTTOM_EDGES.some((e) => bottomEdgeReady(s, e));
export const bottomEdgeAlignedAtFront = (s: CubeState) => bottomEdgeReady(s, BOTTOM_EDGES[0]);

// Stage 4: which top edges show yellow.
export const yellowTopEdges = (s: CubeState) => TOP_EDGES.map((e) => at(s, e.top) === C.yellow); // [front,right,back,left]
export const lAtBackLeft = (s: CubeState) => { const [f, r, b, l] = yellowTopEdges(s); return b && l && !f && !r; };
export const lineLeftRight = (s: CubeState) => { const [f, r, b, l] = yellowTopEdges(s); return l && r && !f && !b; };

// Stage 5: top edges matching their side center.
export const edgeMatches = (s: CubeState) => TOP_EDGES.map((e) => at(s, e.side) === center(s, e.face)); // [front,right,back,left]
export const matchCount = (s: CubeState) => edgeMatches(s).filter(Boolean).length;
export const pairAtBackRight = (s: CubeState) => { const m = edgeMatches(s); return m[1] && m[2]; };
export const maxMatchTurn = (d: Demo): Demo => {
  let best = d;
  let cur = d;
  for (let i = 0; i < 3; i++) { cur = applyStep(cur, 'U'); if (matchCount(cur.colors) > matchCount(best.colors)) best = cur; }
  return best;
};

// Stage 6: top corner in its correct spot (twist ignored).
export const cornerInSpot = (s: CubeState, k: (typeof TOP_CORNERS)[number]) =>
  sameSet([at(s, k.top), at(s, k.a), at(s, k.b)], [center(s, 'top'), center(s, k.faces[0]), center(s, k.faces[1])]);
export const frontRightCornerInSpot = (s: CubeState) => cornerInSpot(s, TOP_CORNERS[0]);
export const cornersInSpot = (s: CubeState) => TOP_CORNERS.filter((k) => cornerInSpot(s, k)).length;

// Stage 7: yellow on the bottom; front-right-bottom corner orientation.
export const yellowDownAtFrontRight = (s: CubeState) => at(s, FRONT_RIGHT_BOTTOM[0]) === C.yellow;
export const sidesAligned = (s: CubeState) => (['front', 'right', 'back', 'left'] as Face[]).every((f) => s[f].flat().every((x) => x === center(s, f)));

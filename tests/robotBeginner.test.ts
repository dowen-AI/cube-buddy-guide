// A "robot beginner": takes randomly scrambled cubes and follows the guide's
// screens literally, one after another, using only what a person could see on
// their own cube (colors), and doing exactly the moves each screen shows.
// If the guide ever strands a beginner on a real cube, this fails.
import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CUBE_COLORS as C, executeMove, getSolvedCube, type CubeState, type MoveName } from '../src/hooks/useCubeState';
import { FOLLOW_ALONG, applyEffect, resolveTarget, sequenceMoves, type Counters } from '../src/data/followAlong';
import {
  applyStep, bottomEdgeAligned, bottomEdgeAlignedAtFront, cornersInSpot, edgeMatches, frontRightCornerInSpot,
  lAtBackLeft, lineLeftRight, matchCount, maxMatchTurn, pairAtBackRight, petalMatched, petalMatchedAtFront,
  sidesAligned, whiteCornerOverFrontRight, whiteCornerOverSlot, yellowDownAtFrontRight, yellowTopEdges,
  BOTTOM_EDGES, TOP_CORNERS, TOP_EDGES, type DemoStep, type StickerRef,
} from '../src/lib/cubeDemo';
import type { Face } from '../src/lib/cubeGeometry';

// ---------------------------------------------------------------- cube helpers
const W = C.white, Y = C.yellow;
const SIDES: Face[] = ['front', 'right', 'back', 'left'];
const at = (s: CubeState, [f, r, c]: StickerRef) => s[f][r][c];
const center = (s: CubeState, f: Face) => s[f][1][1];
const step = (s: CubeState, m: DemoStep): CubeState => applyStep({ colors: s, vis: s }, m).colors;
const until = (s: CubeState, m: DemoStep, done: (s: CubeState) => boolean, what: string): CubeState => {
  let cur = s;
  for (let i = 0; i < 4; i++) { if (done(cur)) return cur; cur = step(cur, m); }
  assert.fail(`could not "${what}" by turning ${m}`);
};
const rot180 = (g: string[][]) => [...g].reverse().map((row) => [...row].reverse());
// Turn the cube upside down, keeping the same face toward you.
const flip = (s: CubeState): CubeState => ({
  top: rot180(s.bottom), bottom: rot180(s.top), left: rot180(s.right), right: rot180(s.left), front: rot180(s.front), back: rot180(s.back),
});
const MIDDLE_EDGES: { a: StickerRef; b: StickerRef; faces: [Face, Face] }[] = [
  { a: ['front', 1, 2], b: ['right', 1, 0], faces: ['front', 'right'] },
  { a: ['right', 1, 2], b: ['back', 1, 0], faces: ['right', 'back'] },
  { a: ['back', 1, 2], b: ['left', 1, 0], faces: ['back', 'left'] },
  { a: ['left', 1, 2], b: ['front', 1, 0], faces: ['left', 'front'] },
];
const BOTTOM_CORNERS: { down: StickerRef; a: StickerRef; b: StickerRef; faces: [Face, Face] }[] = [
  { down: ['bottom', 0, 2], a: ['front', 2, 2], b: ['right', 2, 0], faces: ['front', 'right'] },
  { down: ['bottom', 2, 2], a: ['right', 2, 2], b: ['back', 2, 0], faces: ['right', 'back'] },
  { down: ['bottom', 2, 0], a: ['back', 2, 2], b: ['left', 2, 0], faces: ['back', 'left'] },
  { down: ['bottom', 0, 0], a: ['left', 2, 2], b: ['front', 2, 0], faces: ['left', 'front'] },
];
const bottomEdgePlaced = (s: CubeState, e: (typeof BOTTOM_EDGES)[number]) => at(s, e.down) === W && at(s, e.side) === center(s, e.face);
const bottomCornerSolved = (s: CubeState, k: (typeof BOTTOM_CORNERS)[number]) =>
  at(s, k.down) === W && at(s, k.a) === center(s, k.faces[0]) && at(s, k.b) === center(s, k.faces[1]);
const middleSolved = (s: CubeState, e: (typeof MIDDLE_EDGES)[number]) => at(s, e.a) === center(s, e.faces[0]) && at(s, e.b) === center(s, e.faces[1]);
const hasColor = (s: CubeState, refs: StickerRef[], color: string) => refs.some((r) => at(s, r) === color);
const solved = (s: CubeState) => (Object.keys(s) as Face[]).every((f) => s[f].flat().every((x) => x === s[f][1][1]));
const crossDone = (s: CubeState) => BOTTOM_EDGES.every((e) => bottomEdgePlaced(s, e));
const firstLayerDone = (s: CubeState) => crossDone(s) && BOTTOM_CORNERS.every((k) => bottomCornerSolved(s, k));

// ---------------------------------------------------------------- seeded randomness
const rng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ALL_MOVES: MoveName[] = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
const scramble = (rand: () => number) => {
  let s = getSolvedCube();
  for (let i = 0; i < 40; i++) s = executeMove(s, ALL_MOVES[Math.floor(rand() * ALL_MOVES.length)]);
  return s;
};

// ---------------------------------------------------------------- the robot's "eyes and hands"
// What the person does when a screen asks for a physical action (info / adjust screens).
type Act = (s: CubeState) => CubeState;
// What the person does and answers on a question screen.
type Answer = (s: CubeState, c: Counters, pick: <T>(xs: T[]) => T) => [CubeState, RegExp];
// Whether the person answers "Yes" on a checkpoint.
type Check = (s: CubeState) => boolean;

const ACT: Record<string, Act> = {
  // Stage 1
  's1-side-face': (s) => until(s, 'y', (x) => at(x, ['front', 0, 1]) === W, 'bring the white-facing-side top edge to the front'),
  's1-bottom-face': (s) => until(s, 'y', (x) => at(x, ['bottom', 0, 1]) === W && at(x, ['front', 2, 1]) !== center(x, 'front'), 'bring the misplaced bottom edge to the front'),
  's1-flipped-face': (s) => until(s, 'y', (x) => at(x, ['front', 2, 1]) === W, 'bring the flipped bottom edge to the front'),
  's1-align': (s) => until(s, 'U', petalMatched, 'match the white edge to its center'),
  's1-face': (s) => until(s, 'y', petalMatchedAtFront, 'face the matched white edge'),
  // Stage 2
  's2-wrong-face': (s) => until(s, 'y', (x) => hasColor(x, [BOTTOM_CORNERS[0].down, BOTTOM_CORNERS[0].a, BOTTOM_CORNERS[0].b], W) && !bottomCornerSolved(x, BOTTOM_CORNERS[0]), 'bring the wrong bottom corner to the front-right'),
  's2-align': (s) => until(s, 'U', whiteCornerOverSlot, 'put the white corner above its slot'),
  's2-face': (s) => until(s, 'y', whiteCornerOverFrontRight, 'bring that corner to the front-right'),
  // Stage 3
  's3-flip': flip,
  's3-stuck-face': (s) => until(s, 'y', (x) => !middleSolved(x, MIDDLE_EDGES[0]), 'bring the stuck edge to the front-right'),
  's3-align': (s) => until(s, 'D', bottomEdgeAligned, 'match the bottom edge to the center above'),
  's3-face': (s) => until(s, 'y', bottomEdgeAlignedAtFront, 'face the matched bottom edge'),
  // Stage 4
  's4-flip': flip,
  's4-align-l': (s) => until(s, 'U', lAtBackLeft, 'point the L to the back-left'),
  's4-align-line': (s) => until(s, 'U', lineLeftRight, 'make the line go left to right'),
  // Stage 5
  's5-align': (s) => maxMatchTurn({ colors: s, vis: s }).colors,
  's5-face': (s) => until(s, 'y', pairAtBackRight, 'put the matching pair at the back and right'),
  's5-final': (s) => until(s, 'U', (x) => edgeMatches(x).every(Boolean), 'line up all 4 top edges'),
  // Stage 6
  's6-face': (s) => until(s, 'y', frontRightCornerInSpot, 'bring the correct corner to the front-right'),
  // Stage 7
  's7-flip': flip,
  's7-next': (s) => step(s, 'D'),
  's7-final': (s) => until(s, 'D', sidesAligned, 'line up the last layer'),
};

const ANSWER: Record<string, Answer> = {
  's1-where': (s, c, pick) => {
    const options: RegExp[] = [];
    if (TOP_EDGES.some((e) => at(s, e.top) === W)) options.push(/Top layer — white facing UP/);
    if (TOP_EDGES.some((e) => at(s, e.side) === W)) options.push(/Top layer — white facing the side/);
    if (MIDDLE_EDGES.some((e) => hasColor(s, [e.a, e.b], W))) options.push(/Middle layer/);
    if (BOTTOM_EDGES.some((e) => at(s, e.down) === W && at(s, e.side) !== center(s, e.face))) options.push(/Bottom layer — white DOWN/);
    if (BOTTOM_EDGES.some((e) => at(s, e.side) === W)) options.push(/Bottom layer — white facing the side/);
    if (BOTTOM_EDGES.filter((e) => bottomEdgePlaced(s, e)).length > (c.petals ?? 0)) options.push(/already correct/);
    assert.ok(options.length, 'stage 1: a white edge is left but no option describes it');
    return [s, pick(options)];
  },
  's1-middle': (s) => {
    const t = until(s, 'y', (x) => hasColor(x, [MIDDLE_EDGES[0].a, MIDDLE_EDGES[0].b], W), 'bring the middle white edge to the front-right');
    return [t, at(t, MIDDLE_EDGES[0].a) === W ? /Toward me/ : /To the right/];
  },
  's2-where': (s, c, pick) => {
    const options: RegExp[] = [];
    if (TOP_CORNERS.some((k) => hasColor(s, [k.top, k.a, k.b], W))) options.push(/^Top layer/);
    if (BOTTOM_CORNERS.some((k) => hasColor(s, [k.down, k.a, k.b], W) && !bottomCornerSolved(s, k))) options.push(/wrong slot/);
    if (BOTTOM_CORNERS.filter((k) => bottomCornerSolved(s, k)).length > (c.corners ?? 0)) options.push(/Already solved/);
    assert.ok(options.length, 'stage 2: a white corner is left but no option describes it');
    return [s, pick(options)];
  },
  's3-where': (s, c, pick) => {
    const options: RegExp[] = [];
    const found = BOTTOM_EDGES.some((e) => !hasColor(s, [e.down, e.side], Y));
    if (found) options.push(/Found one/);
    if (!found && MIDDLE_EDGES.some((e) => !middleSolved(s, e))) options.push(/^None/);
    if (MIDDLE_EDGES.filter((e) => middleSolved(s, e)).length > (c.edges ?? 0)) options.push(/already correct/);
    assert.ok(options.length, 'stage 3: an edge is left but no option describes it');
    return [s, pick(options)];
  },
  's3-dir': (s) => {
    const down = at(s, ['bottom', 0, 1]);
    assert.ok(down === center(s, 'right') || down === center(s, 'left'), 'stage 3: the edge matches neither side center');
    return [s, down === center(s, 'right') ? /RIGHT center/ : /LEFT center/];
  },
  's4-pattern': (s) => {
    const [f, r, b, l] = yellowTopEdges(s);
    const n = [f, r, b, l].filter(Boolean).length;
    assert.ok(n === 0 || n === 2 || n === 4, `stage 4: ${n} yellow edges on top matches no picture`);
    return [s, n === 0 ? /^Dot/ : n === 4 ? /^Cross/ : (f && b) || (l && r) ? /^Line/ : /^L-shape/];
  },
  's5-count': (s) => {
    const m = edgeMatches(s);
    const n = matchCount(s);
    assert.ok(n === 4 || n === 2, `stage 5: best turn gives ${n} matching edges, which no option covers`);
    return [s, n === 4 ? /^All 4/ : (m[0] && m[2]) || (m[1] && m[3]) ? /opposite/ : /next to each other/];
  },
  's6-check': (s) => {
    const n = cornersInSpot(s);
    assert.ok(n === 4 || n === 1 || n === 0, `stage 6: ${n} corners in their spots, which no option covers`);
    return [s, n === 4 ? /^All 4/ : n === 1 ? /^Exactly 1/ : /^None/];
  },
  's7-start': (s) => {
    if (BOTTOM_CORNERS.every((k) => at(s, k.down) === Y)) return [s, /already has yellow facing down/];
    return [until(s, 'D', (x) => !yellowDownAtFrontRight(x), 'bring a twisted corner to the front-right'), /^Done/];
  },
  's7-next-check': (s) => [s, yellowDownAtFrontRight(s) ? /already solved/ : /fix it/],
};

// Checkpoints. For "should look like THIS" screens the robot asserts the claim;
// for "is it done yet?" screens it answers honestly from what it sees.
const topHasWhiteUp: Check = (s) => TOP_EDGES.some((e) => at(s, e.top) === W);
const CHECK: Record<string, Check> = {
  's1-side-seq': topHasWhiteUp, 's1-middle-facing': topHasWhiteUp, 's1-middle-right': topHasWhiteUp, 's1-bottom-seq': topHasWhiteUp, 's1-flipped-seq': topHasWhiteUp,
  's1-drop': (s) => bottomEdgePlaced(s, BOTTOM_EDGES[0]),
  's2-pop': (s) => TOP_CORNERS.some((k) => hasColor(s, [k.top, k.a, k.b], W)),
  's2-sledge': (s) => bottomCornerSolved(s, BOTTOM_CORNERS[0]),
  's3-pop': (s) => BOTTOM_EDGES.some((e) => !hasColor(s, [e.down, e.side], Y)),
  's3-right': (s) => middleSolved(s, MIDDLE_EDGES[0]),
  's3-left': (s) => middleSolved(s, MIDDLE_EDGES[3]),
  's4-dot': (s) => { const [f, r, b, l] = yellowTopEdges(s); return [f, r, b, l].filter(Boolean).length === 2 && !((f && b) || (l && r)); },
  's4-l': (s) => { const [f, r, b, l] = yellowTopEdges(s); return [f, r, b, l].filter(Boolean).length === 2 && ((f && b) || (l && r)); },
  's4-line': (s) => yellowTopEdges(s).every(Boolean),
  's5-sune': (s) => [0, 1, 2, 3].some((i) => { let t = s; for (let k = 0; k < i; k++) t = step(t, 'U'); return edgeMatches(t).every(Boolean); }),
  's5-opposite': () => true,
  's6-keep': (s) => cornersInSpot(s) === 4,
  's6-any': () => true,
  's7-twist': yellowDownAtFrontRight,
};

// What must be true when each stage's finish screen appears.
const STAGE_GOAL: Record<number, Check> = {
  1: crossDone,
  2: firstLayerDone,
  3: (s) => s.top.flat().every((x) => x === W) && SIDES.every((f) => s[f].slice(0, 2).flat().every((x) => x === center(s, f))),
  4: (s) => yellowTopEdges(s).every(Boolean),
  5: (s) => edgeMatches(s).every(Boolean),
  6: (s) => cornersInSpot(s) === 4,
  7: solved,
};

interface Stats { taps: number[]; maxRepeat: Record<string, number>; visited: Set<string>; known: Set<string>; shortcutTaps: number }

const runStage = (stageId: number, start: CubeState, rand: () => number, stats: Stats): CubeState => {
  const flow = FOLLOW_ALONG[stageId];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  let s = start;
  let counters: Counters = {};
  let id = flow.start;
  let taps = 0;
  for (let guard = 0; guard < 600; guard++) {
    const node = flow.nodes[id];
    stats.visited.add(id);
    if (node.kind === 'finish') {
      assert.ok(STAGE_GOAL[stageId](s), `stage ${stageId}: finish screen shown but the cube is not there yet`);
      stats.taps[stageId] = Math.max(stats.taps[stageId] ?? 0, taps);
      return s;
    }
    taps++;
    if (node.kind === 'info' || node.kind === 'adjust') {
      if (ACT[id]) s = ACT[id](s);
      counters = applyEffect(counters, node.kind === 'info' ? node.effect : undefined);
      id = resolveTarget(node.next, counters);
    } else if (node.kind === 'choice') {
      assert.ok(ANSWER[id], `no robot answer for question ${id}`);
      const [after, label] = ANSWER[id](s, counters, pick);
      s = after;
      const opt = node.options.find((o) => label.test(o.label));
      assert.ok(opt, `${id}: no option matching ${label}`);
      counters = applyEffect(counters, opt.effect);
      id = resolveTarget(opt.next, counters);
    } else {
      const moves = sequenceMoves(node);
      for (const m of moves) s = executeMove(s, m);
      taps += moves.length - 1;
      // With the "I know this one" shortcut, a move done before costs 2 taps instead of one per turn.
      const key = moves.join(' ');
      if (moves.length >= 3 && stats.known.has(key)) stats.shortcutTaps += 2 - moves.length;
      stats.known.add(key);
      counters = applyEffect(counters, node.onDone);
      taps++; // the checkpoint
      assert.ok(CHECK[id], `no robot check for checkpoint ${id}`);
      const yes = CHECK[id](s);
      if (node.checkpoint.notYet) {
        const reps = counters.repeats ?? counters.times ?? 0;
        stats.maxRepeat[id] = Math.max(stats.maxRepeat[id] ?? 0, reps);
        assert.ok(reps <= 6, `${id}: repeated ${reps} times without finishing`);
        const branch = yes ? node.checkpoint.yes : node.checkpoint.notYet;
        counters = applyEffect(counters, branch.effect);
        id = resolveTarget(branch.next, counters);
      } else {
        assert.ok(yes, `${id}: the checkpoint says "${node.checkpoint.title}" but the real cube doesn't`);
        counters = applyEffect(counters, node.checkpoint.yes.effect);
        id = resolveTarget(node.checkpoint.yes.next, counters);
      }
    }
  }
  assert.fail(`stage ${stageId}: still not finished after 600 screens (stuck at ${id})`);
};

describe('robot beginner: random scrambles, following the guide literally', () => {
  test('the flip helper really turns the cube upside down', () => {
    const s = executeMove(executeMove(getSolvedCube(), 'R'), 'U');
    assert.deepEqual(flip(flip(s)), s);
    // a right turn on the flipped cube is a left turn on the original
    assert.deepEqual(executeMove(flip(s), 'R'), flip(executeMove(s, 'L')));
    assert.equal(flip(getSolvedCube()).top[1][1], W);
  });

  const N = 500;
  test(`${N} scrambled cubes all end up solved`, () => {
    const stats: Stats = { taps: [], maxRepeat: {}, visited: new Set(), known: new Set(), shortcutTaps: 0 };
    let total = 0, worst = 0, saved = 0;
    for (let i = 0; i < N; i++) {
      const rand = rng(1000 + i);
      let s = scramble(rand);
      let taps = 0;
      for (let stage = 1; stage <= 7; stage++) {
        if (stage === 1) stats.known = new Set(); // every solve starts as a first-timer
        const one: Stats = { taps: [], maxRepeat: stats.maxRepeat, visited: stats.visited, known: stats.known, shortcutTaps: 0 };
        try {
          s = runStage(stage, s, rand, one);
        } catch (e) {
          throw new Error(`scramble #${i}, stage ${stage}: ${(e as Error).message}`);
        }
        taps += one.taps[stage];
        saved += one.shortcutTaps;
        stats.taps[stage] = Math.max(stats.taps[stage] ?? 0, one.taps[stage]);
      }
      assert.ok(solved(s), `scramble #${i}: all 7 stages finished but the cube is not solved`);
      total += taps; worst = Math.max(worst, taps);
    }
    // every screen in the guide is reachable from a real scramble (nothing is dead or untested)
    const all = Object.values(FOLLOW_ALONG).flatMap((f) => Object.keys(f.nodes));
    const never = all.filter((id) => !stats.visited.has(id));
    console.log(`robot: ${N}/${N} solved · average ${Math.round(total / N)} taps per solve, worst ${worst} · ${Math.round((total + saved) / N)} with the from-memory shortcut · worst taps per stage ${stats.taps.slice(1).join('/')} · most repeats ${JSON.stringify(stats.maxRepeat)}`);
    assert.deepEqual(never, [], 'screens no scramble ever reached');
  });
});

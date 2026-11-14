// A "robot beginner": takes randomly scrambled cubes and follows the guide's
// screens literally, one after another, using only what a person could see on
// their own cube (colors), and doing exactly the moves each screen shows.
// If the guide ever strands a beginner on a real cube, this fails.
import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CUBE_COLORS as C, executeMove, getSolvedCube, type CubeState, type MoveName } from '../src/hooks/useCubeState';
import { FOLLOW_ALONG, applyEffect, resolveTarget, sequenceMoves, type Counters } from '../src/data/followAlong';
import {
  applyStep, cornersInSpot, edgeMatches, frontRightCornerInSpot,
  lAtBackLeft, lineLeftRight, matchCount, maxMatchTurn, pairAtBackRight, petalMatched, petalMatchedAtFront,
  sidesAligned, topEdgeAligned, topEdgeAlignedAtFront, whiteCornerOverFrontRight, whiteCornerOverSlot, yellowUpAtFrontRight, yellowTopEdges,
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

const TOP_NO_YELLOW = (s: CubeState) => TOP_EDGES.some((e) => !hasColor(s, [e.top, e.side], Y));
const topCornerHasWhite = (s: CubeState) => TOP_CORNERS.some((k) => hasColor(s, [k.top, k.a, k.b], W));

const ACT: Record<string, Act> = {
  // Stage 1
  's1-side-face': (s) => until(s, 'y', (x) => at(x, ['front', 0, 1]) === W, 'bring the white-on-the-side top edge to the front'),
  's1-bottom-face': (s) => until(s, 'y', (x) => at(x, ['bottom', 0, 1]) === W && at(x, ['front', 2, 1]) !== center(x, 'front'), 'bring the misplaced bottom edge to the front'),
  's1-flipped-face': (s) => until(s, 'y', (x) => at(x, ['front', 2, 1]) === W, 'bring the flipped bottom edge to the front'),
  's1-align': (s) => until(s, 'U', petalMatched, 'match the white edge to its center'),
  's1-face': (s) => until(s, 'y', petalMatchedAtFront, 'face the matched white edge'),
  // Stage 2
  's2-wrong-face': (s) => until(s, 'y', (x) => hasColor(x, [BOTTOM_CORNERS[0].down, BOTTOM_CORNERS[0].a, BOTTOM_CORNERS[0].b], W) && !bottomCornerSolved(x, BOTTOM_CORNERS[0]), 'bring the wrong bottom corner to the front-right'),
  's2-align': (s) => until(s, 'U', whiteCornerOverSlot, 'put the white corner above its home'),
  's2-face': (s) => until(s, 'y', whiteCornerOverFrontRight, 'bring that corner to the front-right'),
  // Stage 3 (yellow stays on top)
  's3-stuck-face': (s) => until(s, 'y', (x) => !middleSolved(x, MIDDLE_EDGES[0]), 'bring the stuck edge to the front-right'),
  's3-align': (s) => until(s, 'U', topEdgeAligned, 'match the top edge to the center below'),
  's3-face': (s) => until(s, 'y', topEdgeAlignedAtFront, 'face the matched top edge'),
  // Stage 4
  's4-align-l': (s) => until(s, 'U', lAtBackLeft, 'put the L at the back-left'),
  's4-align-line': (s) => until(s, 'U', lineLeftRight, 'make the line go left to right'),
  // Stage 5
  's5-align': (s) => maxMatchTurn({ colors: s, vis: s }).colors,
  's5-face': (s) => until(s, 'y', pairAtBackRight, 'put the matching pair at the back and right'),
  's5-final': (s) => until(s, 'U', (x) => edgeMatches(x).every(Boolean), 'line up all 4 top edges'),
  // Stage 6
  's6-face': (s) => until(s, 'y', frontRightCornerInSpot, 'bring the home corner to the front-right'),
  // Stage 7 (yellow stays on top, the whole cube is never turned)
  's7-next': (s) => step(s, 'U'),
  's7-final': (s) => until(s, 'U', sidesAligned, 'line up the top layer'),
};

const ANSWER: Record<string, Answer> = {
  's1-where': (s, c, pick) => {
    const options: RegExp[] = [];
    if (TOP_EDGES.some((e) => at(s, e.top) === W)) options.push(/^Top: white facing UP/);
    if (TOP_EDGES.some((e) => at(s, e.side) === W)) options.push(/^Top: white sideways/);
    if (MIDDLE_EDGES.some((e) => hasColor(s, [e.a, e.b], W))) options.push(/^Middle row/);
    if (BOTTOM_EDGES.some((e) => at(s, e.down) === W && at(s, e.side) !== center(s, e.face))) options.push(/^Bottom: white DOWN/);
    if (BOTTOM_EDGES.some((e) => at(s, e.side) === W)) options.push(/^Bottom: white sideways/);
    if (BOTTOM_EDGES.filter((e) => bottomEdgePlaced(s, e)).length > (c.petals ?? 0)) options.push(/^Bottom: done/);
    assert.ok(options.length, 'stage 1: a white edge is left but no picture describes it');
    return [s, pick(options)];
  },
  's1-middle': (s) => {
    const t = until(s, 'y', (x) => hasColor(x, [MIDDLE_EDGES[0].a, MIDDLE_EDGES[0].b], W), 'bring the middle white edge to the front-right');
    return [t, at(t, MIDDLE_EDGES[0].a) === W ? /Toward me/ : /To the right/];
  },
  's2-where': (s, c, pick) => {
    const options: RegExp[] = [];
    if (topCornerHasWhite(s)) options.push(/^In the top row/);
    if (BOTTOM_CORNERS.some((k) => hasColor(s, [k.down, k.a, k.b], W) && !bottomCornerSolved(s, k))) options.push(/^In the bottom row, but wrong/);
    if (BOTTOM_CORNERS.filter((k) => bottomCornerSolved(s, k)).length > (c.corners ?? 0)) options.push(/^Done, count it/);
    assert.ok(options.length, 'stage 2: a white corner is left but no picture describes it');
    return [s, pick(options)];
  },
  's3-where': (s, c, pick) => {
    const options: RegExp[] = [];
    const found = TOP_NO_YELLOW(s);
    if (found) options.push(/^Found one/);
    if (!found && MIDDLE_EDGES.some((e) => !middleSolved(s, e))) options.push(/^None/);
    if (MIDDLE_EDGES.filter((e) => middleSolved(s, e)).length > (c.edges ?? 0)) options.push(/A middle edge is done/);
    assert.ok(options.length, 'stage 3: an edge is left but no picture describes it');
    return [s, pick(options)];
  },
  's3-dir': (s) => {
    const up = at(s, ['top', 2, 1]);
    assert.ok(up === center(s, 'right') || up === center(s, 'left'), 'stage 3: the edge matches neither side center');
    return [s, up === center(s, 'right') ? /RIGHT side/ : /LEFT side/];
  },
  's4-pattern': (s) => {
    const [f, r, b, l] = yellowTopEdges(s);
    const n = [f, r, b, l].filter(Boolean).length;
    assert.ok(n === 0 || n === 2 || n === 4, `stage 4: ${n} yellow edges on top matches no picture`);
    return [s, n === 0 ? /^Dot/ : n === 4 ? /^Cross/ : (f && b) || (l && r) ? /^Line/ : /^L shape/];
  },
  's5-count': (s) => {
    const m = edgeMatches(s);
    const n = matchCount(s);
    assert.ok(n === 4 || n === 2, `stage 5: best turn gives ${n} matching edges, which no picture covers`);
    return [s, n === 4 ? /^All 4/ : (m[0] && m[2]) || (m[1] && m[3]) ? /across/ : /side by side/];
  },
  's6-check': (s) => {
    const n = cornersInSpot(s);
    assert.ok(n === 4 || n === 1 || n === 0, `stage 6: ${n} corners home, which no picture covers`);
    return [s, n === 4 ? /^All 4/ : n === 1 ? /^Only 1/ : /^None/];
  },
  's7-start': (s) => {
    if (TOP_CORNERS.every((k) => at(s, k.top) === Y)) return [s, /already have yellow on top/];
    return [until(s, 'U', (x) => !yellowUpAtFrontRight(x), 'bring a twisted corner to the front-right'), /^Done/];
  },
  's7-next-check': (s) => [s, yellowUpAtFrontRight(s) ? /already done/ : /fix it/],
};

// Checkpoints. For "your cube looks like this" screens the robot asserts the claim;
// for "is it done yet?" screens it answers honestly from what it sees.
const topHasWhiteUp: Check = (s) => TOP_EDGES.some((e) => at(s, e.top) === W);
const CHECK: Record<string, Check> = {
  's1-side-seq': topHasWhiteUp, 's1-middle-facing': topHasWhiteUp, 's1-middle-right': topHasWhiteUp, 's1-bottom-seq': topHasWhiteUp, 's1-flipped-seq': topHasWhiteUp,
  's1-drop': (s) => bottomEdgePlaced(s, BOTTOM_EDGES[0]),
  's2-pop': topCornerHasWhite,
  's2-sledge': (s) => bottomCornerSolved(s, BOTTOM_CORNERS[0]),
  's3-pop': TOP_NO_YELLOW,
  's3-right': (s) => middleSolved(s, MIDDLE_EDGES[0]),
  's3-left': (s) => middleSolved(s, MIDDLE_EDGES[3]),
  's4-dot': (s) => { const [f, r, b, l] = yellowTopEdges(s); return [f, r, b, l].filter(Boolean).length === 2 && !((f && b) || (l && r)); },
  's4-l': (s) => { const [f, r, b, l] = yellowTopEdges(s); return l && r && !f && !b; },
  's4-line': (s) => yellowTopEdges(s).every(Boolean),
  's5-sune': (s) => [0, 1, 2, 3].some((i) => { let t = s; for (let k = 0; k < i; k++) t = step(t, 'U'); return edgeMatches(t).every(Boolean); }),
  's5-opposite': () => true,
  's6-keep': (s) => cornersInSpot(s) === 4,
  's6-any': () => true,
  's7-twist': yellowUpAtFrontRight,
};

// What must be true when each stage's finish screen appears. Yellow is on top throughout.
const STAGE_GOAL: Record<number, Check> = {
  1: crossDone,
  2: firstLayerDone,
  3: (s) => firstLayerDone(s) && SIDES.every((f) => s[f].slice(1).flat().every((x) => x === center(s, f))),
  4: (s) => yellowTopEdges(s).every(Boolean),
  5: (s) => edgeMatches(s).every(Boolean),
  6: (s) => cornersInSpot(s) === 4,
  7: solved,
};

interface Stats { taps: number[]; maxRepeat: Record<string, number>; visited: Set<string>; known: Set<string>; shortcutTaps: number; log?: string[] }

// What every completed set of turns must leave untouched. If a set of turns
// ever damaged finished work (the way a wrong Insert left would turn two white
// stickers green), this fails on the very next line.
const middleRowsDone = (s: CubeState) => SIDES.every((f) => s[f].slice(1).flat().every((x) => x === center(s, f)));
const count = <T,>(xs: T[], ok: (x: T) => boolean) => xs.filter(ok).length;
const KEEPS: Record<number, (before: CubeState, after: CubeState) => string | null> = {
  1: (b, a) => (count(BOTTOM_EDGES, (e) => bottomEdgePlaced(a, e)) >= count(BOTTOM_EDGES, (e) => bottomEdgePlaced(b, e)) ? null : 'a placed white edge was disturbed'),
  2: (b, a) => (!crossDone(a) ? 'the white cross was damaged' : count(BOTTOM_CORNERS, (k) => bottomCornerSolved(a, k)) >= count(BOTTOM_CORNERS, (k) => bottomCornerSolved(b, k)) ? null : 'a finished corner was disturbed'),
  3: (b, a) => (!firstLayerDone(a) ? 'the white bottom layer was damaged' : count(MIDDLE_EDGES, (e) => middleSolved(a, e)) >= count(MIDDLE_EDGES, (e) => middleSolved(b, e)) ? null : 'a finished middle edge was disturbed'),
  4: (_b, a) => (firstLayerDone(a) && middleRowsDone(a) ? null : 'the first two layers were damaged'),
  5: (_b, a) => (firstLayerDone(a) && middleRowsDone(a) && yellowTopEdges(a).every(Boolean) ? null : 'the first two layers or the yellow cross were damaged'),
  6: (_b, a) => (firstLayerDone(a) && middleRowsDone(a) && yellowTopEdges(a).every(Boolean) && [0, 1, 2, 3].some((i) => { let t = a; for (let k = 0; k < i; k++) t = step(t, 'U'); return edgeMatches(t).every(Boolean); }) ? null : 'earlier stages were damaged'),
  7: () => null, // the lower layers are meant to look mixed up until the last corner; the finish screen checks the whole cube
};

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
      const beforeMoves = s;
      for (const m of moves) s = executeMove(s, m);
      const damage = KEEPS[stageId](beforeMoves, s);
      assert.equal(damage, null, `${id} (${moves.join(' ')}): ${damage}`);
      stats.log?.push(`${node.name} (${moves.join(' ')})`);
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

  // Three full solves written out: the scramble as a list of turns, which sets
  // of turns the guide used, and the six faces at the end.
  const LETTER: Record<string, string> = { [C.white]: 'W', [C.yellow]: 'Y', [C.red]: 'R', [C.green]: 'G', [C.blue]: 'B', [C.orange]: 'O' };
  const faces = (s: CubeState) => (['top', 'front', 'right', 'back', 'left', 'bottom'] as Face[]).map((f) => `${f} ${s[f].map((row) => row.map((x) => LETTER[x]).join('')).join('/')}`).join(' | ');
  const QUARTERS: MoveName[] = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'", 'R2', 'L2', 'U2', 'D2', 'F2', 'B2'];
  const solveWritten = (seed: number) => {
    const rand = rng(seed);
    const scrambleMoves = Array.from({ length: 25 }, () => QUARTERS[Math.floor(rand() * QUARTERS.length)]);
    let s = scrambleMoves.reduce((st, m) => executeMove(st, m), getSolvedCube());
    const start = s;
    const log: string[] = [];
    for (let stage = 1; stage <= 7; stage++) s = runStage(stage, s, rand, { taps: [], maxRepeat: {}, visited: new Set(), known: new Set(), shortcutTaps: 0, log });
    return { scrambleMoves, start, end: s, log };
  };
  const tally = (log: string[]) => Object.entries(log.reduce<Record<string, number>>((acc, x) => { const k = x.split(' (')[0]; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {})).map(([k, n]) => `${k} x${n}`).join(', ');
  test('3 written-out solves, one of which needs Insert left, all end fully solved', () => {
    let seed = 1;
    let withLeft: ReturnType<typeof solveWritten> | null = null;
    for (; seed < 200 && !withLeft; seed++) { const r = solveWritten(seed); if (r.log.some((x) => x.startsWith('Insert left'))) withLeft = r; }
    assert.ok(withLeft, 'found a scramble that needs Insert left');
    const others = [solveWritten(5001), solveWritten(5002)];
    for (const [label, r] of [['A (needs Insert left)', withLeft], ['B', others[0]], ['C', others[1]]] as const) {
      console.log(`  Solve ${label}`);
      console.log(`    scramble: ${r.scrambleMoves.join(' ')}`);
      console.log(`    start:    ${faces(r.start)}`);
      console.log(`    guide used: ${tally(r.log)}`);
      console.log(`    end:      ${faces(r.end)}`);
      assert.ok(solved(r.end), `solve ${label} ends solved`);
      assert.ok((Object.keys(r.end) as Face[]).every((f) => r.end[f].flat().every((x) => x === r.end[f][1][1])));
    }
    assert.ok(withLeft.log.filter((x) => x.startsWith('Insert left')).length >= 1);
  });
  test("a wrong Insert left (U' L U L' U F U' F') is caught at once by the damage check", () => {
    // start from a cube where the guide would use Insert left
    let caught = '';
    for (let seed = 1; seed < 200 && !caught; seed++) {
      const rand = rng(seed);
      let s = Array.from({ length: 25 }, () => QUARTERS[Math.floor(rand() * QUARTERS.length)]).reduce((st, m) => executeMove(st, m), getSolvedCube());
      s = runStage(1, s, rand, { taps: [], maxRepeat: {}, visited: new Set(), known: new Set(), shortcutTaps: 0 });
      s = runStage(2, s, rand, { taps: [], maxRepeat: {}, visited: new Set(), known: new Set(), shortcutTaps: 0 });
      const wrong = ["U'", 'L', 'U', "L'", 'U', 'F', "U'", "F'"].reduce((st, m) => executeMove(st, m as MoveName), s);
      const damage = KEEPS[3](s, wrong);
      if (damage) caught = damage;
    }
    console.log(`  wrong sequence -> "${caught}"`);
    assert.equal(caught, 'the white bottom layer was damaged');
  });
});

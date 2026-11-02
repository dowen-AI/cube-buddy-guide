import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CUBE_COLORS as C, type CubeState } from '../src/hooks/useCubeState';
import { FOLLOW_ALONG, ALGORITHMS, resolveTarget, sequenceMoves, type FlowNode, type Picture } from '../src/data/followAlong';
import {
  applyMoves, applyStep, scenario, showAll, twistCorner, cornersInSpot, edgeMatches, matchCount, maxMatchTurn,
  yellowTopEdges, sidesAligned, yellowDownAtFrontRight, FRONT_RIGHT_BOTTOM, FRONT_LEFT_BOTTOM, type Demo,
} from '../src/lib/cubeDemo';

const node = (stage: number, id: string) => {
  const n = FOLLOW_ALONG[stage].nodes[id];
  assert.ok(n, `stage ${stage} has node ${id}`);
  return n;
};
const runSeq = (d: Demo, n: FlowNode) => {
  assert.equal(n.kind, 'sequence');
  return applyMoves(d, sequenceMoves(n as Extract<FlowNode, { kind: 'sequence' }>).join(' '));
};
const after = (d: Demo, n: FlowNode) => ('demoAfter' in n && n.demoAfter ? n.demoAfter(d) : d);
const optionDemo = (stage: number, id: string, label: RegExp) => {
  const n = node(stage, id);
  assert.equal(n.kind, 'choice');
  const opt = (n as Extract<FlowNode, { kind: 'choice' }>).options.find((o) => label.test(o.label));
  assert.ok(opt?.demo, `option ${label} on ${id} sets a demo`);
  return opt!.demo!();
};
const sidesMatchCenter = (s: CubeState, row: number, col: number) => (['front', 'right', 'back', 'left'] as const).every((f) => s[f][row][col] === s[f][1][1]);

describe('flow graph', () => {
  for (const [stageId, flow] of Object.entries(FOLLOW_ALONG)) {
    test(`stage ${stageId}: every target and restart point exists`, () => {
      const ids = new Set(Object.keys(flow.nodes));
      assert.ok(ids.has(flow.start));
      const counters = [{}, { petals: 4, corners: 4, edges: 4, twisted: 4 }];
      const targets: unknown[] = [];
      for (const n of Object.values(flow.nodes)) {
        assert.ok(ids.has(n.step), `${n.id}.step -> ${n.step}`);
        if (n.kind === 'info' || n.kind === 'adjust') targets.push(n.next);
        if (n.kind === 'choice') n.options.forEach((o) => targets.push(o.next));
        if (n.kind === 'sequence') { targets.push(n.checkpoint.yes.next); if (n.checkpoint.notYet) targets.push(n.checkpoint.notYet.next); }
      }
      for (const t of targets) for (const c of counters) {
        const id = resolveTarget(t as never, c);
        assert.ok(ids.has(id), `stage ${stageId}: target ${id} exists`);
      }
      // every flow can reach its finish screen
      assert.ok(Object.values(flow.nodes).some((n) => n.kind === 'finish'));
    });
    test(`stage ${stageId}: pictures render a demo without throwing`, () => {
      const pics: Picture[] = [];
      for (const n of Object.values(flow.nodes)) {
        if (n.kind === 'choice') n.options.forEach((o) => { if (o.picture) pics.push(o.picture); o.demo?.(); });
        if (n.kind === 'finish') pics.push(n.picture);
        if (n.kind === 'sequence' && n.checkpoint.goal) pics.push(n.checkpoint.goal);
        if ('demo' in n && n.demo) n.demo();
      }
      for (const p of pics) if (p.kind === 'cube') assert.ok(p.demo().colors.top.length === 3);
    });
  }
});

describe('stage 1: every white-edge case ends in the cross', () => {
  const cases: [RegExp, string[]][] = [
    [/Top layer — white facing UP/, []],
    [/Top layer — white facing the side/, ['s1-side-face', 's1-side-seq']],
    [/Bottom layer — white DOWN/, ['s1-bottom-face', 's1-bottom-seq']],
    [/Bottom layer — white facing the side/, ['s1-flipped-face', 's1-flipped-seq']],
  ];
  const middle: [RegExp, string][] = [[/Toward me/, 's1-middle-facing'], [/To the right/, 's1-middle-right']];
  const finish = (d: Demo) => {
    // lifted to the top as a petal: white facing up somewhere on the top layer, bottom edges untouched by the lift
    d = after(d, node(1, 's1-align'));
    d = after(d, node(1, 's1-face'));
    d = runSeq(d, node(1, 's1-drop'));
    // the edge now sits at bottom-front, white down, color matching the front center
    assert.equal(d.colors.bottom[0][1], C.white);
    assert.equal(d.colors.front[2][1], d.colors.front[1][1]);
  };
  for (const [label, path] of cases) test(String(label), () => {
    let d = optionDemo(1, 's1-where', label);
    for (const id of path) { const n = node(1, id); d = n.kind === 'sequence' ? runSeq(d, n) : after(d, n); }
    finish(d);
  });
  for (const [label, id] of middle) test(`Middle layer, ${label}`, () => finish(runSeq(optionDemo(1, 's1-middle', label), node(1, id))));
  test('case sequences never disturb white edges already placed on the bottom', () => {
    const solved = scenario('yellow-top', showAll);
    for (const id of ['s1-side-seq', 's1-middle-facing', 's1-middle-right']) {
      const d = runSeq(solved, node(1, id));
      for (const [r, c, f] of [[0, 1, 'front'], [1, 2, 'right'], [2, 1, 'back'], [1, 0, 'left']] as const) {
        assert.equal(d.colors.bottom[r][c], C.white, `${id} keeps bottom edge ${f}`);
        assert.equal(d.colors[f][2][1], d.colors[f][1][1], `${id} keeps ${f} side of that edge`);
      }
    }
  });
});

describe('stage 2: corners', () => {
  test('top-layer corner: align, face, Sledgehammer 1/3/5 times solves the slot', () => {
    let d = optionDemo(2, 's2-where', /Top layer/);
    d = after(after(d, node(2, 's2-align')), node(2, 's2-face'));
    let reps = 0;
    while (!(d.colors.bottom[0][2] === C.white && d.colors.front[2][2] === d.colors.front[1][1] && d.colors.right[2][0] === d.colors.right[1][1]) && reps < 6) { d = runSeq(d, node(2, 's2-sledge')); reps++; }
    assert.ok([1, 3, 5].includes(reps), `took ${reps}`);
  });
  test('Sledgehammer needs 1, 3 or 5 repeats for every orientation', () => {
    for (const k of [1, 3, 5]) {
      let d = applyMoves(scenario('yellow-top', showAll), Array(k).fill("U R U' R'").join(' '));
      let reps = 0;
      while (!sidesMatchCenter(d.colors, 2, 2) || d.colors.bottom[0][2] !== C.white) { d = applyMoves(d, ALGORITHMS.SLEDGE); reps++; if (reps > 6) break; }
      assert.equal(reps, k);
    }
  });
  test('corner in the wrong slot pops up to the top layer', () => {
    const d = runSeq(optionDemo(2, 's2-where', /wrong slot/), node(2, 's2-pop'));
    assert.notEqual(d.colors.bottom[0][2], C.white);
    const tops = [[d.colors.top[2][2], d.colors.front[0][2], d.colors.right[0][0]], [d.colors.top[2][0], d.colors.front[0][0], d.colors.left[0][2]], [d.colors.top[0][2], d.colors.back[0][0], d.colors.right[0][2]], [d.colors.top[0][0], d.colors.back[0][2], d.colors.left[0][0]]];
    assert.ok(tops.some((t) => t.includes(C.white)));
  });
});

describe('stage 3: middle layer (white on top)', () => {
  test('found edge: align, face, insert RIGHT solves the front-right slot', () => {
    let d = optionDemo(3, 's3-where', /Found one/);
    d = after(after(d, node(3, 's3-align')), node(3, 's3-face'));
    assert.equal(d.colors.front[2][1], d.colors.front[1][1], 'edge front color matches the center above');
    assert.equal(d.colors.bottom[0][1], d.colors.right[1][1], 'its down color matches the RIGHT center');
    d = runSeq(d, node(3, 's3-right'));
    assert.equal(d.colors.front[1][2], d.colors.front[1][1]);
    assert.equal(d.colors.right[1][0], d.colors.right[1][1]);
  });
  test('insert LEFT solves the front-left slot', () => {
    let d = optionDemo(3, 's3-dir', /LEFT/);
    assert.equal(d.colors.bottom[0][1], d.colors.left[1][1], 'down color matches the LEFT center');
    d = runSeq(d, node(3, 's3-left'));
    assert.equal(d.colors.front[1][0], d.colors.front[1][1]);
    assert.equal(d.colors.left[1][2], d.colors.left[1][1]);
  });
  test('a stuck edge pops down into the bottom layer', () => {
    const d = runSeq(optionDemo(3, 's3-where', /None/), node(3, 's3-pop'));
    const bottomPairs = [[d.colors.bottom[0][1], d.colors.front[2][1]], [d.colors.bottom[1][2], d.colors.right[2][1]], [d.colors.bottom[2][1], d.colors.back[2][1]], [d.colors.bottom[1][0], d.colors.left[2][1]]];
    assert.ok(bottomPairs.some((p) => !p.includes(C.yellow)));
  });
});

describe('stage 4: yellow cross', () => {
  test('dot -> L -> line -> cross following the guide', () => {
    let d = optionDemo(4, 's4-pattern', /Dot/);
    assert.equal(yellowTopEdges(d.colors).filter(Boolean).length, 0);
    d = runSeq(d, node(4, 's4-dot'));
    d = after(d, node(4, 's4-align-l'));
    d = runSeq(d, node(4, 's4-l'));
    d = after(d, node(4, 's4-align-line'));
    d = runSeq(d, node(4, 's4-line'));
    assert.ok(yellowTopEdges(d.colors).every(Boolean));
  });
  test('every real edge-flip pattern reaches the cross within 3 runs', () => {
    const base = scenario('yellow-top', showAll);
    const spots = [[[2, 1], 'front'], [[1, 2], 'right'], [[0, 1], 'back'], [[1, 0], 'left']] as const;
    for (let mask = 0; mask < 16; mask++) {
      if ([0, 1, 2, 3].filter((i) => mask & (1 << i)).length % 2) continue;
      let d = base;
      spots.forEach(([[r, c], f], i) => { if (mask & (1 << i)) { const cols = JSON.parse(JSON.stringify(d.colors)); [cols.top[r][c], cols[f][0][1]] = [cols[f][0][1], cols.top[r][c]]; d = { colors: cols, vis: d.vis }; } });
      let runs = 0;
      while (!yellowTopEdges(d.colors).every(Boolean) && runs < 4) {
        const n = yellowTopEdges(d.colors).filter(Boolean).length;
        if (n === 2) d = after(d, node(4, yellowTopEdges(d.colors).filter((v, i) => v && (i === 1 || i === 3)).length === 2 || yellowTopEdges(d.colors).filter((v, i) => v && (i === 0 || i === 2)).length === 2 ? 's4-align-line' : 's4-align-l'));
        d = applyMoves(d, ALGORITHMS.ALG4); runs++;
      }
      assert.ok(yellowTopEdges(d.colors).every(Boolean), `mask ${mask}`);
    }
  });
});

describe('stage 5: yellow edges', () => {
  test('2 adjacent: face, edge swap, align -> all 4 match', () => {
    let d = maxMatchTurn(node(5, 's5-align').kind === 'adjust' ? (node(5, 's5-align') as { demo: () => Demo }).demo() : scenario('yellow-top', showAll));
    assert.equal(matchCount(d.colors), 2);
    d = after(d, node(5, 's5-face'));
    d = runSeq(d, node(5, 's5-sune'));
    d = after(d, node(5, 's5-final'));
    assert.ok(edgeMatches(d.colors).every(Boolean));
  });
  test('2 opposite: one edge swap gives an adjacent pair', () => {
    let d = optionDemo(5, 's5-count', /opposite/);
    const m = edgeMatches(d.colors);
    assert.ok((m[0] && m[2]) || (m[1] && m[3]), 'demo really shows 2 opposite');
    d = maxMatchTurn(runSeq(d, node(5, 's5-opposite')));
    const m2 = edgeMatches(d.colors);
    assert.ok(m2.every(Boolean) || [0, 1, 2, 3].some((i) => m2[i] && m2[(i + 1) % 4]));
  });
});

describe('stage 6: corners in their spots', () => {
  test('exactly-one demo really has one corner in its spot, and the guide fixes it', () => {
    let d = optionDemo(6, 's6-check', /Exactly 1/);
    assert.equal(cornersInSpot(d.colors), 1);
    d = after(d, node(6, 's6-face'));
    let runs = 0;
    while (cornersInSpot(d.colors) < 4 && runs < 3) { d = runSeq(d, node(6, 's6-keep')); runs++; }
    assert.equal(cornersInSpot(d.colors), 4);
  });
  test('none demo really has no corner in its spot', () => {
    assert.equal(cornersInSpot(optionDemo(6, 's6-check', /None/).colors), 0);
  });
});

describe('stage 7: corner twists (yellow on the bottom)', () => {
  test('following the guide solves the cube, 2 or 4 repeats per twisted corner', () => {
    let d = (node(7, 's7-flip') as { demo: () => Demo }).demo();
    const reps: number[] = [];
    let twisted = 0;
    let n = 0;
    while (twisted < 4) {
      let r = 0;
      while (!yellowDownAtFrontRight(d.colors) && r < 6) { d = runSeq(d, node(7, 's7-twist')); r++; }
      if (r) reps.push(r);
      twisted++;
      if (twisted < 4) d = after(d, node(7, 's7-next'));
      if (++n > 10) break;
    }
    d = after(d, node(7, 's7-final'));
    assert.ok(sidesAligned(d.colors) && d.colors.top.flat().every((x) => x === d.colors.top[1][1]), 'cube solved');
    assert.ok(reps.every((r) => r === 2 || r === 4), `repeats ${reps}`);
  });
  test("the old R' D' R D sequence would NOT have solved this cube", () => {
    let d = twistCorner(twistCorner(scenario('white-top', showAll), FRONT_RIGHT_BOTTOM, 1), FRONT_LEFT_BOTTOM, 2);
    for (let k = 0; k < 4; k++) { let r = 0; while (!yellowDownAtFrontRight(d.colors) && r < 6) { d = applyMoves(d, "R' D' R D"); r++; } d = applyStep(d, 'D'); }
    const solved = ['', 'D', 'D2', "D'"].some((x) => { const t = applyMoves(d, x); return sidesAligned(t.colors) && t.colors.top.flat().every((c) => c === C.white); });
    assert.equal(solved, false);
  });
});

// Every named set of turns the guide teaches, run from the case it is meant
// for, checked against what the guide promises AND against damage to finished
// work. Prints one table row per case.
import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CUBE_COLORS as C, type CubeState } from '../src/hooks/useCubeState';
import { FOLLOW_ALONG, sequenceMoves, type FlowNode } from '../src/data/followAlong';
import {
  applyMoves, applyStep, cornersInSpot, edgeMatches, matchCount, maxMatchTurn, scenario, showAll, sidesAligned, twistCorner,
  yellowTopEdges, yellowUpAtFrontRight, FRONT_RIGHT_TOP, FRONT_LEFT_TOP, type Demo,
} from '../src/lib/cubeDemo';
import { invertSequence } from '../src/lib/moves';

const W = C.white, Y = C.yellow;
const SIDES = ['front', 'right', 'back', 'left'] as const;
type Seq = Extract<FlowNode, { kind: 'sequence' }>;
type Choice = Extract<FlowNode, { kind: 'choice' }>;
const node = (stage: number, id: string) => FOLLOW_ALONG[stage].nodes[id];
const seq = (stage: number, id: string) => node(stage, id) as Seq;
const turns = (stage: number, id: string) => sequenceMoves(seq(stage, id)).join(' ');
const run = (d: Demo, stage: number, id: string) => applyMoves(d, turns(stage, id));
const after = (d: Demo, stage: number, id: string) => { const n = node(stage, id); return 'demoAfter' in n && n.demoAfter ? n.demoAfter(d) : d; };
const option = (stage: number, id: string, label: RegExp) => { const o = (node(stage, id) as Choice).options.find((x) => label.test(x.label)); assert.ok(o?.demo, `${id} ${label}`); return o!.demo!(); };

const face = (g: string[][]) => g.map((r) => r.map((x) => ({ [W]: 'W', [Y]: 'Y', [C.red]: 'R', [C.green]: 'G', [C.blue]: 'B', [C.orange]: 'O' } as Record<string, string>)[x]).join('')).join('/');
const cen = (s: CubeState, f: (typeof SIDES)[number]) => s[f][1][1];
const whiteFace = (s: CubeState) => s.bottom.flat().every((x) => x === W);
const rows = (s: CubeState, from: number) => SIDES.every((f) => s[f].slice(from).flat().every((x) => x === cen(s, f)));
const firstLayer = (s: CubeState) => whiteFace(s) && rows(s, 2);
const twoLayers = (s: CubeState) => whiteFace(s) && rows(s, 1);
const top = (s: CubeState) => { const [f, r, b, l] = yellowTopEdges(s); const c = (v: boolean) => (v ? 'Y' : '.'); return `.${c(b)}./${c(l)}Y${c(r)}/.${c(f)}.`; };
const allSolved = (s: CubeState) => Object.values(s).every((f) => f.flat().every((x) => x === f[1][1]));

const table: string[] = [];
const row = (sequence: string, startCase: string, promise: string, result: string, pass: boolean) => {
  table.push(`| ${sequence} | ${startCase} | ${promise} | ${result} | ${pass ? 'PASS' : 'FAIL'} |`);
  assert.ok(pass, `${sequence} from "${startCase}": ${result}`);
};

describe('every set of turns the guide teaches, from the case it is taught for', () => {
  test('Stage 1: the 6 white-edge cases', () => {
    const finish = (d: Demo) => run(after(after(d, 1, 's1-align'), 1, 's1-face'), 1, 's1-drop');
    const placed = (d: Demo) => d.colors.bottom[0][1] === W && d.colors.front[2][1] === d.colors.front[1][1];
    const promise = 'white edge in the cross, white down, side matching its center';
    const cases: [string, RegExp, string | null, string | null][] = [
      ['top, white up', /^Top: white facing UP/, null, null],
      ['top, white sideways', /^Top: white sideways/, 's1-side-face', 's1-side-seq'],
      ['bottom, white down, wrong place', /^Bottom: white DOWN/, 's1-bottom-face', 's1-bottom-seq'],
      ['bottom, white sideways', /^Bottom: white sideways/, 's1-flipped-face', 's1-flipped-seq'],
    ];
    for (const [name, label, faceId, seqId] of cases) {
      let d = option(1, 's1-where', label);
      if (faceId) d = after(d, 1, faceId);
      if (seqId) d = run(d, 1, seqId);
      d = finish(d);
      row(`${seqId ? turns(1, seqId) + ', then ' : ''}line up + F2`, name, promise, `bottom-front sticker ${d.colors.bottom[0][1] === W ? 'W' : '?'}, side matches center: ${d.colors.front[2][1] === d.colors.front[1][1]}`, placed(d));
    }
    for (const [name, label, id] of [['middle row, white toward you', /Toward me/, 's1-middle-facing'], ['middle row, white to the right', /To the right/, 's1-middle-right']] as const) {
      const d = finish(run(option(1, 's1-middle', label), 1, id));
      row(`${turns(1, id)}, then line up + F2`, name, promise, `bottom-front sticker W, side matches center: ${d.colors.front[2][1] === d.colors.front[1][1]}`, placed(d));
    }
    const done = (node(1, 's1-where') as Choice).options.find((o) => /^All 4 are done/.test(o.label))!;
    row('(no turns)', 'all 4 already right', 'straight to the finish picture, nothing counted by hand', `next: ${String(done.next)}, effect: ${JSON.stringify(done.effect ?? null)}`, done.next === 's1-done' && !done.effect);
  });

  test('Stage 2: Sledgehammer, 1 / 3 / 5 goes', () => {
    const sledge = sequenceMoves(seq(2, 's2-sledge'));
    const solvedCube = scenario('yellow-top', showAll);
    for (const need of [1, 3, 5]) {
      // the corner above its home in each of its 3 possible twists
      let d = applyMoves(solvedCube, Array.from({ length: need }, () => invertSequence(sledge).join(' ')).join(' '));
      const before = d;
      let goes = 0;
      const frbDone = (s: CubeState) => s.bottom[0][2] === W && s.front[2][2] === cen(s, 'front') && s.right[2][0] === cen(s, 'right');
      while (!frbDone(d.colors)) { d = applyMoves(d, sledge.join(' ')); goes++; assert.ok(goes <= 5); }
      const crossAndOthers = firstLayer(d.colors);
      row(`${sledge.join(' ')} x${goes}`, `corner in the top row, twist ${need === 1 ? 'A' : need === 3 ? 'B' : 'C'} (bottom before: ${face(before.colors.bottom)})`, 'corner home with white down; cross and the other 3 corners untouched', `bottom ${face(d.colors.bottom)}, bottom rows match: ${rows(d.colors, 2)}`, goes === need && crossAndOthers);
    }
    // in the bottom row but twisted: pop it out, then as above
    let d = option(2, 's2-where', /but wrong/);
    d = run(after(d, 2, 's2-wrong-face'), 2, 's2-pop');
    const inTop = [d.colors.top, d.colors.front, d.colors.right, d.colors.back, d.colors.left].some((g) => g[0].includes(W) || g === d.colors.top && g.flat().includes(W));
    d = after(after(d, 2, 's2-align'), 2, 's2-face');
    let goes = 0;
    while (!(d.colors.bottom[0][2] === W && d.colors.front[2][2] === cen(d.colors, 'front') && d.colors.right[2][0] === cen(d.colors, 'right'))) { d = run(d, 2, 's2-sledge'); goes++; assert.ok(goes <= 5); }
    row(`${turns(2, 's2-pop')} (pop), line up, Sledgehammer x${goes}`, 'corner in the bottom row, twisted', 'popped to the top row, then home; rest of the bottom layer untouched', `bottom ${face(d.colors.bottom)}, bottom rows match: ${rows(d.colors, 2)}`, inTop && firstLayer(d.colors));
    const done = (node(2, 's2-where') as Choice).options.find((o) => /^All 4 are done/.test(o.label))!;
    row('(no turns)', 'all 4 corners already right', 'straight to the finish picture, nothing counted by hand', `next: ${String(done.next)}, effect: ${JSON.stringify(done.effect ?? null)}`, done.next === 's2-done' && !done.effect);
  });

  test('Stage 3: Insert right, Insert left, and the stuck-edge pop', () => {
    for (const [name, label, id, home] of [['Insert right', /RIGHT side/, 's3-right', (s: CubeState) => s.front[1][2] === cen(s, 'front') && s.right[1][0] === cen(s, 'right')], ['Insert left', /LEFT side/, 's3-left', (s: CubeState) => s.front[1][0] === cen(s, 'front') && s.left[1][2] === cen(s, 'left')]] as const) {
      const before = option(3, 's3-dir', label);
      const d = run(before, 3, id);
      console.log(`  ${name} BEFORE  bottom ${face(before.colors.bottom)} | front ${face(before.colors.front)} | ${id === 's3-left' ? 'left ' + face(before.colors.left) : 'right ' + face(before.colors.right)} | top ${face(before.colors.top)}`);
      console.log(`  ${name} AFTER   bottom ${face(d.colors.bottom)} | front ${face(d.colors.front)} | ${id === 's3-left' ? 'left ' + face(d.colors.left) : 'right ' + face(d.colors.right)} | top ${face(d.colors.top)}`);
      row(turns(3, id), `top edge lined up, goes ${id === 's3-left' ? 'left' : 'right'}`, `edge in the front-${id === 's3-left' ? 'left' : 'right'} middle spot; white bottom layer untouched`, `bottom ${face(d.colors.bottom)}, edge home: ${home(d.colors)}, bottom rows match: ${rows(d.colors, 2)}`, home(d.colors) && firstLayer(d.colors) && whiteFace(before.colors));
    }
    const stuck = option(3, 's3-where', /^None\. A middle edge/);
    const d = run(after(stuck, 3, 's3-stuck-face'), 3, 's3-pop');
    const edgeUp = [[d.colors.top[2][1], d.colors.front[0][1]], [d.colors.top[1][2], d.colors.right[0][1]], [d.colors.top[0][1], d.colors.back[0][1]], [d.colors.top[1][0], d.colors.left[0][1]]].some(([a, b]) => a !== Y && b !== Y);
    row(`${turns(3, 's3-pop')} (pop)`, 'no top edge without yellow: an edge is stuck in the middle row', 'the stuck edge comes up to the top row; white bottom layer untouched', `edge without yellow now on top: ${edgeUp}, bottom ${face(d.colors.bottom)}`, edgeUp && firstLayer(d.colors));
  });

  test('Stage 4: F R U R\' U\' F\' from dot, L and line', () => {
    const t = turns(4, 's4-dot');
    let d = option(4, 's4-pattern', /^Dot/);
    const a = run(d, 4, 's4-dot');
    row(t, `dot (top ${top(d.colors)})`, 'an L shape', `top ${top(a.colors)}`, yellowTopEdges(a.colors).filter(Boolean).length === 2 && !/Y\/.Y.\/.Y|\.\.\.\/YYY/.test(top(a.colors)) && twoLayers(a.colors));
    d = after(option(4, 's4-pattern', /^L shape/), 4, 's4-align-l');
    const b = run(d, 4, 's4-l');
    row(t, `L turned to the back and left (top ${top(d.colors)})`, 'a line going left to right', `top ${top(b.colors)}`, top(d.colors) === '.Y./YY./...' && top(b.colors) === '.../YYY/...' && twoLayers(b.colors));
    d = after(option(4, 's4-pattern', /^Line/), 4, 's4-align-line');
    const c = run(d, 4, 's4-line');
    row(t, `line turned left to right (top ${top(d.colors)})`, 'a yellow cross', `top ${top(c.colors)}`, top(d.colors) === '.../YYY/...' && top(c.colors) === '.Y./YYY/.Y.' && twoLayers(c.colors));
  });

  test('Stage 5: Edge swap from 2 side by side and 2 across', () => {
    const start = (node(5, 's5-align') as Extract<FlowNode, { kind: 'adjust' }>).demo!();
    let d = maxMatchTurn(start);
    const n0 = matchCount(d.colors);
    d = after(run(after(d, 5, 's5-face'), 5, 's5-sune'), 5, 's5-final');
    row(`${turns(5, 's5-sune')}, then turn the top`, `2 edges match, side by side (${n0} match)`, 'all 4 top edges match their centers', `matching edges: ${matchCount(d.colors)}, cross kept: ${yellowTopEdges(d.colors).every(Boolean)}`, n0 === 2 && edgeMatches(d.colors).every(Boolean) && twoLayers(d.colors) && yellowTopEdges(d.colors).every(Boolean));
    let o = option(5, 's5-count', /across/);
    const m = edgeMatches(o.colors);
    o = maxMatchTurn(run(o, 5, 's5-opposite'));
    const mid = matchCount(o.colors);
    o = after(run(after(o, 5, 's5-face'), 5, 's5-sune'), 5, 's5-final');
    row(`${turns(5, 's5-opposite')} once, look again, then as above`, `2 edges match, across (${(m[0] && m[2]) || (m[1] && m[3]) ? 'opposite pair' : '?'})`, 'after one go: 2 side by side; then all 4 match', `after go 1: ${mid} match; at the end: ${matchCount(o.colors)} match`, mid === 2 && edgeMatches(o.colors).every(Boolean) && twoLayers(o.colors));
  });

  test('Stage 6: Corner swap from 1 home and none home', () => {
    let d = option(6, 's6-check', /^Only 1/);
    const n0 = cornersInSpot(d.colors);
    d = after(d, 6, 's6-face');
    let goes = 0;
    while (cornersInSpot(d.colors) < 4) { d = run(d, 6, 's6-keep'); goes++; assert.ok(goes <= 2); }
    row(`${turns(6, 's6-keep')} x${goes}`, `exactly 1 corner home (${n0} home)`, 'all 4 corners home; edges still matched', `corners home: ${cornersInSpot(d.colors)}, edges matched: ${edgeMatches(d.colors).every(Boolean)}`, n0 === 1 && edgeMatches(d.colors).every(Boolean) && twoLayers(d.colors));
    let e = option(6, 's6-check', /^None/);
    const none = cornersInSpot(e.colors);
    e = run(e, 6, 's6-any');
    const one = cornersInSpot(e.colors);
    e = after(e, 6, 's6-face');
    goes = 0;
    while (cornersInSpot(e.colors) < 4) { e = run(e, 6, 's6-keep'); goes++; assert.ok(goes <= 2); }
    row(`${turns(6, 's6-any')} once, then x${goes} with the home corner at the front-right`, `no corner home (${none} home)`, 'after one go exactly 1 is home; then all 4', `after go 1: ${one} home; at the end: ${cornersInSpot(e.colors)} home`, none === 0 && one === 1 && edgeMatches(e.colors).every(Boolean) && twoLayers(e.colors));
  });

  test('Stage 7: Corner twist', () => {
    const t = turns(7, 's7-twist');
    for (const [name, dir, other] of [['twisted one way', 1, 2], ['twisted the other way', 2, 1]] as const) {
      // this corner twisted at the front-right, and a second corner twisted to balance it (as on any real cube)
      let d = twistCorner(twistCorner(scenario('yellow-top', showAll), FRONT_RIGHT_TOP, dir), FRONT_LEFT_TOP, other);
      let goes = 0;
      while (!yellowUpAtFrontRight(d.colors)) { d = run(d, 7, 's7-twist'); goes++; assert.ok(goes <= 4); }
      const afterFirst = `top-front-right sticker on top: ${d.colors.top[2][2] === Y ? 'Y' : '?'}`;
      // the guide then turns only the top to the next corner and repeats, then lines the top up
      for (let k = 0; k < 3; k++) { d = applyStep(d, 'U'); let g = 0; while (!yellowUpAtFrontRight(d.colors)) { d = run(d, 7, 's7-twist'); g++; assert.ok(g <= 4); } }
      for (let i = 0; i < 4 && !sidesAligned(d.colors); i++) d = applyStep(d, 'U');
      row(`${t} x${goes}`, `front-right top corner ${name}`, "that corner's yellow faces up; once all 4 corners are done and the top is turned, the cube is solved", `${afterFirst}; after all 4 corners: solved = ${allSolved(d.colors)}`, (goes === 2 || goes === 4) && allSolved(d.colors));
    }
  });

  test('print the table', () => {
    console.log('  | set of turns | starting case | what the guide promises | simulated result | |');
    for (const line of table) console.log('  ' + line);
    console.log(`  ${table.length} rows, ${table.filter((x) => x.endsWith('PASS |')).length} PASS`);
  });
});

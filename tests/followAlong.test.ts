import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CUBE_COLORS as C, type CubeState } from '../src/hooks/useCubeState';
import { FOLLOW_ALONG, ALGORITHMS, CHEAT_SHEET, resolveTarget, sequenceMoves, type FlowNode, type Picture } from '../src/data/followAlong';
import {
  applyMoves, applyStep, scenario, showAll, twistCorner, cornersInSpot, edgeMatches, matchCount, maxMatchTurn,
  yellowTopEdges, sidesAligned, yellowUpAtFrontRight, FRONT_RIGHT_TOP, FRONT_LEFT_TOP, type Demo,
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


const W = C.white, Y = C.yellow;
const grid = (g: string[][]) => g.map((row) => row.map((x) => (x === Y ? 'Y' : x === W ? 'W' : x === C.red ? 'r' : x === C.green ? 'g' : x === C.blue ? 'b' : 'o')).join(' ')).join(' / ');

describe('stage 1: every white-edge picture ends with the edge placed', () => {
  const cases: [RegExp, string[]][] = [
    [/^Top: white facing UP/, []],
    [/^Top: white sideways/, ['s1-side-face', 's1-side-seq']],
    [/^Bottom: white DOWN/, ['s1-bottom-face', 's1-bottom-seq']],
    [/^Bottom: white sideways/, ['s1-flipped-face', 's1-flipped-seq']],
  ];
  const middle: [RegExp, string][] = [[/Toward me/, 's1-middle-facing'], [/To the right/, 's1-middle-right']];
  const finish = (d: Demo) => {
    d = after(d, node(1, 's1-align'));
    d = after(d, node(1, 's1-face'));
    d = runSeq(d, node(1, 's1-drop'));
    // the edge now sits at bottom-front, white down, side color matching the front center
    assert.equal(d.colors.bottom[0][1], W);
    assert.equal(d.colors.front[2][1], d.colors.front[1][1]);
    // and the check picture shows those two stickers in their real colors, not greyed out
    assert.equal(d.vis.bottom[0][1], '1', 'the white sticker is drawn in its real color on the check picture');
    assert.equal(d.vis.front[2][1], '1');
  };
  for (const [label, path] of cases) test(String(label), () => {
    let d = optionDemo(1, 's1-where', label);
    for (const id of path) { const n = node(1, id); d = n.kind === 'sequence' ? runSeq(d, n) : after(d, n); }
    finish(d);
  });
  for (const [label, id] of middle) test(`Middle row, ${label}`, () => finish(runSeq(optionDemo(1, 's1-middle', label), node(1, id))));
  test('the sixth picture ("already right") counts the edge without any turns', () => {
    const n = node(1, 's1-where');
    assert.equal(n.kind, 'choice');
    const opt = (n as Extract<FlowNode, { kind: 'choice' }>).options.find((o) => /done, count it/.test(o.label))!;
    assert.deepEqual(opt.effect, { add: ['petals'] });
  });
});

describe('the turns changed in this build, shown before and after (yellow on top, never flipped)', () => {
  test('Stage 3 "Insert right": U R U\' R\' U\' F\' U F', () => {
    const before = optionDemo(3, 's3-dir', /RIGHT side/);
    const afterD = runSeq(before, node(3, 's3-right'));
    console.log(`  Insert right  BEFORE front: ${grid(before.colors.front)} | right: ${grid(before.colors.right)} | top: ${grid(before.colors.top)}`);
    console.log(`  Insert right  AFTER  front: ${grid(afterD.colors.front)} | right: ${grid(afterD.colors.right)} | top: ${grid(afterD.colors.top)}`);
    assert.equal(before.colors.front[0][1], before.colors.front[1][1], 'before: the edge sits on top, front color matching');
    assert.equal(afterD.colors.front[1][2], afterD.colors.front[1][1]);
    assert.equal(afterD.colors.right[1][0], afterD.colors.right[1][1]);
    // the finished bottom layer is untouched
    assert.ok(afterD.colors.bottom.flat().every((x) => x === W) && sidesMatchCenter(afterD.colors, 2, 0) && sidesMatchCenter(afterD.colors, 2, 1) && sidesMatchCenter(afterD.colors, 2, 2));
  });
  test('Stage 3 "Insert left": U\' L\' U L U F U\' F\'', () => {
    const before = optionDemo(3, 's3-dir', /LEFT side/);
    const afterD = runSeq(before, node(3, 's3-left'));
    console.log(`  Insert left   BEFORE front: ${grid(before.colors.front)} | left: ${grid(before.colors.left)}`);
    console.log(`  Insert left   AFTER  front: ${grid(afterD.colors.front)} | left: ${grid(afterD.colors.left)}`);
    assert.equal(afterD.colors.front[1][0], afterD.colors.front[1][1]);
    assert.equal(afterD.colors.left[1][2], afterD.colors.left[1][1]);
    assert.ok(afterD.colors.bottom.flat().every((x) => x === W));
  });
  test('Stage 3: a stuck middle edge pops up to the top row', () => {
    const d = runSeq(optionDemo(3, 's3-where', /^None/), node(3, 's3-pop'));
    const tops: [string, string][] = [[d.colors.top[2][1], d.colors.front[0][1]], [d.colors.top[1][2], d.colors.right[0][1]], [d.colors.top[0][1], d.colors.back[0][1]], [d.colors.top[1][0], d.colors.left[0][1]]];
    assert.ok(tops.some(([a, b]) => a !== Y && b !== Y), 'an edge without yellow is now in the top row');
  });
  test('Stage 7 "Corner twist": R\' D\' R D, 2 or 4 goes per corner, top layer turned between corners', () => {
    const start = twistCorner(twistCorner(scenario('yellow-top', showAll), FRONT_RIGHT_TOP, 1), FRONT_LEFT_TOP, 2);
    console.log(`  Corner twist  BEFORE top: ${grid(start.colors.top)}`);
    let d = start;
    const goes: number[] = [];
    for (let corner = 0; corner < 4; corner++) {
      let n = 0;
      while (!yellowUpAtFrontRight(d.colors)) { d = runSeq(d, node(7, 's7-twist')); n++; assert.ok(n <= 4); }
      goes.push(n);
      d = applyStep(d, 'U');
    }
    for (let i = 0; i < 4 && !sidesAligned(d.colors); i++) d = applyStep(d, 'U');
    console.log(`  Corner twist  AFTER  top: ${grid(d.colors.top)} | goes per corner: ${goes.join(', ')}`);
    assert.ok(goes.every((n) => n === 0 || n === 2 || n === 4));
    assert.deepEqual(d.colors, scenario('yellow-top', showAll).colors, 'the whole cube is solved');
  });
});

describe('stage 4: pictures, words and the simulated top face agree', () => {
  const top = (d: Demo) => { const [f, r, b, l] = yellowTopEdges(d.colors); return { f, r, b, l }; };
  const draw = (d: Demo) => { const t = top(d); const c = (v: boolean) => (v ? 'Y' : '.'); return `[. ${c(t.b)} .] [${c(t.l)} Y ${c(t.r)}] [. ${c(t.f)} .]  (rows: back, middle, front)`; };
  test('dot -> L -> line -> cross, one go of F R U R\' U\' F\' each time', () => {
    let d = optionDemo(4, 's4-pattern', /^Dot/);
    console.log(`  dot            ${draw(d)}`);
    assert.deepEqual(top(d), { f: false, r: false, b: false, l: false });
    d = runSeq(d, node(4, 's4-dot'));
    console.log(`  after go 1     ${draw(d)}`);
    assert.equal(Object.values(top(d)).filter(Boolean).length, 2, 'an L: two yellow edges that touch');
    assert.ok(!((top(d).f && top(d).b) || (top(d).l && top(d).r)));
    d = after(d, node(4, 's4-align-l'));
    console.log(`  L turned       ${draw(d)}   <- text says BACK and LEFT`);
    assert.deepEqual(top(d), { f: false, r: false, b: true, l: true }, 'L sits at the back and the left, as the text and the picture say');
    d = runSeq(d, node(4, 's4-l'));
    console.log(`  after go 2     ${draw(d)}   <- line, left to right`);
    assert.deepEqual(top(d), { f: false, r: true, b: false, l: true }, 'a line going left to right');
    d = after(d, node(4, 's4-align-line'));
    d = runSeq(d, node(4, 's4-line'));
    console.log(`  after go 3     ${draw(d)}`);
    assert.deepEqual(top(d), { f: true, r: true, b: true, l: true });
  });
  test('Stage 4 pictures are drawn from simulated cubes, top face only, with nothing but yellow showing', () => {
    const flow = FOLLOW_ALONG[4];
    assert.ok(flow.display, 'Stage 4 has a display filter');
    for (const id of ['s4-dot', 's4-l', 's4-line']) {
      const n = node(4, id) as Extract<FlowNode, { kind: 'sequence' }>;
      assert.equal(n.checkpoint.flat, true, `${id}: the check draws the simulated cube flat`);
      assert.equal(n.checkpoint.goal, undefined, `${id}: no hand-made goal picture`);
    }
    for (const id of ['s4-align-l', 's4-align-line']) assert.equal((node(4, id) as Extract<FlowNode, { kind: 'adjust' }>).flat, true);
    // the filter hides every top-layer sticker that is not a yellow edge or the center
    const d = flow.display!(optionDemo(4, 's4-pattern', /^L shape/));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (d.vis.top[r][c] === '1') assert.equal(d.colors.top[r][c], Y, `top[${r}][${c}] shown but not yellow`);
    }
    for (const f of ['front', 'right', 'back', 'left'] as const) assert.deepEqual(d.vis[f][0], ['0', '0', '0'], `${f} top row is "any color"`);
  });
  test('the L line-up picture IS the simulated L: back-middle + center + middle-left yellow, nothing else', () => {
    const flow = FOLLOW_ALONG[4];
    const start = optionDemo(4, 's4-pattern', /^L shape/);
    const goal = flow.display!(after(start, node(4, 's4-align-l')));
    const drawn = goal.colors.top.map((row, r) => row.map((x, c) => (x === Y && goal.vis.top[r][c] === '1' ? 'Y' : '.')).join(' '));
    console.log(`  L line-up picture (rows back -> front): [${drawn.join('] [')}]`);
    assert.deepEqual(drawn, ['. Y .', 'Y Y .', '. . .']);
    assert.deepEqual(yellowTopEdges(goal.colors), [false, false, true, true], 'simulated top edges: back and left yellow');
  });
  test('starting from the dot, the picture drawn at every Stage 4 step equals the simulated top face', () => {
    const flow = FOLLOW_ALONG[4];
    const drawn = (d: Demo) => { const v = flow.display!(d); return v.colors.top.map((row, r) => row.map((x, c) => (x === Y && v.vis.top[r][c] === '1' ? 'Y' : '.')).join('')).join('/'); };
    const truth = (d: Demo) => { const [f, r, b, l] = yellowTopEdges(d.colors); const c = (x: boolean) => (x ? 'Y' : '.'); return `.${c(b)}./${c(l)}Y${c(r)}/.${c(f)}.`; };
    let d = optionDemo(4, 's4-pattern', /^Dot/);
    const steps: [string, Demo][] = [['dot', d]];
    d = runSeq(d, node(4, 's4-dot')); steps.push(['check after go 1 (L)', d]);
    d = after(d, node(4, 's4-align-l')); steps.push(['L line-up target', d]);
    d = runSeq(d, node(4, 's4-l')); steps.push(['check after go 2 (line)', d]);
    d = after(d, node(4, 's4-align-line')); steps.push(['line line-up target', d]);
    d = runSeq(d, node(4, 's4-line')); steps.push(['check after go 3 (cross)', d]);
    for (const [name, st] of steps) {
      console.log(`  ${name.padEnd(26)} picture ${drawn(st)}   simulated ${truth(st)}`);
      assert.equal(drawn(st), truth(st), name);
    }
    assert.equal(drawn(steps[2][1]), '.Y./YY./...', 'L line-up: back-middle + center + middle-left');
  });
  test('every real pattern of yellow edges reaches the cross within 3 goes', () => {
    const alg = ALGORITHMS.ALG4;
    for (let mask = 0; mask < 16; mask++) {
      const bits = [0, 1, 2, 3].filter((i) => mask & (1 << i));
      if (bits.length % 2) continue; // an odd number of flipped edges cannot happen on a real cube
      let d = scenario('yellow-top', showAll);
      // flip the chosen top edges
      const tops: [string, number, number][] = [['top', 2, 1], ['top', 1, 2], ['top', 0, 1], ['top', 1, 0]];
      const sides: [string, number, number][] = [['front', 0, 1], ['right', 0, 1], ['back', 0, 1], ['left', 0, 1]];
      const colors = JSON.parse(JSON.stringify(d.colors));
      for (const i of bits) { const [tf, tr, tc] = tops[i]; const [sf, sr, sc] = sides[i]; const tmp = colors[tf][tr][tc]; colors[tf][tr][tc] = colors[sf][sr][sc]; colors[sf][sr][sc] = tmp; }
      d = { colors, vis: d.vis };
      let goes = 0;
      while (!yellowTopEdges(d.colors).every(Boolean)) {
        const [f, r, b, l] = yellowTopEdges(d.colors);
        const n = [f, r, b, l].filter(Boolean).length;
        if (n === 2 && ((f && b) || (l && r))) d = after(d, node(4, 's4-align-line'));
        else if (n === 2) d = after(d, node(4, 's4-align-l'));
        d = applyMoves(d, alg);
        assert.ok(++goes <= 3);
      }
    }
  });
});

describe('stages 5 and 6', () => {
  test('2 side by side: face, edge swap, turn the top -> all 4 match', () => {
    let d = maxMatchTurn(node(5, 's5-align').kind === 'adjust' ? (node(5, 's5-align') as Extract<FlowNode, { kind: 'adjust' }>).demo!() : scenario('yellow-top', showAll));
    assert.equal(matchCount(d.colors), 2);
    d = after(d, node(5, 's5-face'));
    d = runSeq(d, node(5, 's5-sune'));
    d = after(d, node(5, 's5-final'));
    assert.ok(edgeMatches(d.colors).every(Boolean));
  });
  test('2 across: one edge swap gives a side-by-side pair', () => {
    let d = optionDemo(5, 's5-count', /across/);
    const m = edgeMatches(d.colors);
    assert.ok((m[0] && m[2]) || (m[1] && m[3]));
    d = maxMatchTurn(runSeq(d, node(5, 's5-opposite')));
    const m2 = edgeMatches(d.colors);
    assert.equal(matchCount(d.colors), 2);
    assert.ok(!((m2[0] && m2[2]) || (m2[1] && m2[3])));
  });
  test('"only 1 home" picture really has one corner home, and the guide fixes it within 2 goes', () => {
    let d = optionDemo(6, 's6-check', /^Only 1/);
    assert.equal(cornersInSpot(d.colors), 1);
    d = after(d, node(6, 's6-face'));
    let goes = 0;
    while (cornersInSpot(d.colors) < 4) { d = runSeq(d, node(6, 's6-keep')); assert.ok(++goes <= 2); }
  });
  test('"none home" picture really has no corner home', () => {
    assert.equal(cornersInSpot(optionDemo(6, 's6-check', /^None/).colors), 0);
  });
});

describe('plain-language rules of the guide', () => {
  test('every picture question has a "not sure" help with exactly 3 checks', () => {
    for (const flow of Object.values(FOLLOW_ALONG)) for (const n of Object.values(flow.nodes)) {
      if (n.kind === 'choice') assert.equal(n.help.length, 3, `${n.id} needs 3 help checks`);
    }
  });
  test('every option on every picture question has a picture', () => {
    for (const flow of Object.values(FOLLOW_ALONG)) for (const n of Object.values(flow.nodes)) {
      if (n.kind === 'choice') for (const o of n.options) assert.ok(o.picture, `${n.id} / ${o.label}`);
    }
  });
  test('the cube is never flipped: every screen of every stage holds yellow on top', () => {
    for (const flow of Object.values(FOLLOW_ALONG)) for (const n of Object.values(flow.nodes)) assert.equal(n.hold, 'yellow-top', n.id);
  });
  test('each chant has exactly one phrase per turn (so the current word can be highlighted)', () => {
    for (const flow of Object.values(FOLLOW_ALONG)) for (const n of Object.values(flow.nodes)) {
      if (n.kind !== 'sequence') continue;
      for (const ch of n.chunks) assert.equal(ch.phrase.split(', ').length, ch.moves.length, `${n.id} / ${ch.name}: "${ch.phrase}" vs ${ch.moves.join(' ')}`);
    }
  });
  test('the cheat sheet has one rule per stage and its letters match what the guide teaches', () => {
    assert.deepEqual(CHEAT_SHEET.map((x) => x.stage), [1, 2, 3, 4, 5, 6, 7]);
    const taught = new Set(Object.values(ALGORITHMS));
    for (const x of CHEAT_SHEET) if (x.move) assert.ok(taught.has(x.move.notation), `stage ${x.stage}: ${x.move.notation}`);
  });
  test('first turn within 3 taps of "Start Learning": Stage 1 opens straight on the picture question', () => {
    const flow = FOLLOW_ALONG[1];
    assert.equal(flow.nodes[flow.start].kind, 'choice');
    // tap 1 = Start Learning (opens this screen), tap 2 = a picture, tap 3 at most one "it's in front of me"
    const start = flow.nodes[flow.start] as Extract<FlowNode, { kind: 'choice' }>;
    for (const o of start.options) {
      let id = resolveTarget(o.next, {});
      let taps = 2;
      while (flow.nodes[id].kind === 'info') { id = resolveTarget((flow.nodes[id] as Extract<FlowNode, { kind: 'info' }>).next, {}); taps++; }
      if (flow.nodes[id].kind === 'sequence' || flow.nodes[id].kind === 'adjust') assert.ok(taps <= 3, `${o.label}: ${taps} taps`);
    }
  });
});

// Words = letter = arrow = animation = move engine, for every move and every
// guide screen. Nothing here is "read off the screen": each table entry is
// checked against what the move engine does to the stickers.
import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import Cube from 'cubejs';
import { executeMove, getSolvedCube, type CubeState, type MoveName } from '../src/hooks/useCubeState';
import { cubeStateToFacelets } from '../src/lib/cubeSolver';
import { MOVE_TEXT, MOVE_WORDS, chantFor, inverseMove, invertSequence } from '../src/lib/moves';
import { moveArrow, moveRotation, FACES } from '../src/lib/cubeGeometry';
import { FOLLOW_ALONG, sequenceMoves } from '../src/data/followAlong';

const MOVES: MoveName[] = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
const run = (seq: MoveName[], from: CubeState = getSolvedCube()) => seq.reduce((s, m) => executeMove(s, m), from);
const labelled = (): CubeState => Object.fromEntries(FACES.map((f) => [f, [0, 1, 2].map((r) => [0, 1, 2].map((c) => `${f}${r}${c}`))])) as unknown as CubeState;
const same = (a: CubeState, b: CubeState) => JSON.stringify(FACES.map((f) => a[f])) === JSON.stringify(FACES.map((f) => b[f]));

describe('the move engine itself is right', () => {
  test('every move gives the same cube as the independent cubejs library', () => {
    for (const m of MOVES) assert.equal(cubeStateToFacelets(run([m])), new Cube().move(m).asString(), m);
  });
  test("solved + R U R' U' gives the known state, and six of them return to solved", () => {
    const sexy: MoveName[] = ['R', 'U', "R'", "U'"];
    assert.equal(cubeStateToFacelets(run(sexy)), new Cube().move("R U R' U'").asString());
    assert.ok(same(run([...sexy, ...sexy, ...sexy, ...sexy, ...sexy, ...sexy]), getSolvedCube()));
  });
  test('300 random sequences match cubejs, and each followed by its inverse returns to solved', () => {
    let seed = 42; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 300; i++) {
      const seq = Array.from({ length: 1 + Math.floor(rand() * 30) }, () => MOVES[Math.floor(rand() * MOVES.length)]);
      assert.equal(cubeStateToFacelets(run(seq)), new Cube().move(seq.join(' ')).asString());
      assert.ok(same(run([...seq, ...invertSequence(seq)]), getSolvedCube()));
    }
  });
});

// For each quarter turn: one sticker on the front of the cube, and where the words say it goes.
const TRAVEL: Partial<Record<MoveName, [from: [string, number, number], to: [string, number, number], words: string]>> = {
  R: [['front', 1, 2], ['top', 1, 2], 'right column goes UP onto the top'],
  "R'": [['front', 1, 2], ['bottom', 1, 2], 'right column goes DOWN onto the bottom'],
  L: [['front', 1, 0], ['bottom', 1, 0], 'left column goes DOWN onto the bottom'],
  "L'": [['front', 1, 0], ['top', 1, 0], 'left column goes UP onto the top'],
  U: [['front', 0, 1], ['left', 0, 1], 'top row slides to the LEFT side'],
  "U'": [['front', 0, 1], ['right', 0, 1], 'top row slides to the RIGHT side'],
  D: [['front', 2, 1], ['right', 2, 1], 'bottom row slides to the RIGHT side'],
  "D'": [['front', 2, 1], ['left', 2, 1], 'bottom row slides to the LEFT side'],
  F: [['front', 0, 1], ['front', 1, 2], 'top of the front goes to the right (clockwise)'],
  "F'": [['front', 0, 1], ['front', 1, 0], 'top of the front goes to the left (counter-clockwise)'],
  B: [['top', 0, 1], ['left', 1, 0], 'seen from behind, clockwise'],
  "B'": [['top', 0, 1], ['right', 1, 2], 'seen from behind, counter-clockwise'],
};
// the direction word each short phrase must carry
const DIRECTION: Record<string, string> = {
  R: 'up', "R'": 'down', L: 'down', "L'": 'up', U: 'left', "U'": 'right', D: 'right', "D'": 'left',
  F: 'clockwise', "F'": 'counter-clockwise', B: 'clockwise', "B'": 'counter-clockwise',
};
const FACE_WORD: Record<string, string> = { R: 'right', L: 'left', U: 'top', D: 'bottom', F: 'front', B: 'back' };

describe('words, letters and arrows all mean what the engine does', () => {
  for (const [move, [from, to, why]] of Object.entries(TRAVEL) as [MoveName, NonNullable<(typeof TRAVEL)[MoveName]>][]) {
    test(`${move.padEnd(2)} "${MOVE_WORDS[move]}" / "${MOVE_TEXT[move]}": ${why}`, () => {
      const before = labelled();
      const after = executeMove(before, move);
      assert.equal((after as never)[to[0]][to[1]][to[2]], (before as never)[from[0]][from[1]][from[2]], 'the sticker travels where the words say');
      // both wordings name the same face and direction
      for (const text of [MOVE_WORDS[move], MOVE_TEXT[move]]) {
        const t = text.toLowerCase();
        assert.ok(t.includes(FACE_WORD[move[0]]), `"${text}" names the ${FACE_WORD[move[0]]}`);
        const dir = DIRECTION[move];
        assert.ok(dir === 'clockwise' ? t.includes('clockwise') && !t.includes('counter') : t.includes(dir), `"${text}" says ${dir}`);
      }
    });
  }
  test('half turns say "twice" and equal the quarter turn done twice', () => {
    for (const m of MOVES.filter((x) => x.endsWith('2'))) {
      assert.ok(MOVE_WORDS[m].toLowerCase().includes('twice') && MOVE_TEXT[m].toLowerCase().includes('twice'));
      assert.ok(same(run([m]), run([m[0] as MoveName, m[0] as MoveName])));
    }
  });
  test('each arrow points the way the layer turns on screen (and the turn on screen matches the engine: see cubeGeometry.test.ts)', () => {
    const rot = (p: number[], axis: 'x' | 'y' | 'z', quarters: number) => {
      let [x, y, z] = p;
      for (let i = 0; i < ((quarters % 4) + 4) % 4; i++) { if (axis === 'x') [y, z] = [-z, y]; else if (axis === 'y') [x, z] = [z, -x]; else [x, y] = [-y, x]; }
      return [x, y, z];
    };
    for (const m of MOVES) {
      const arrow = moveArrow(m);
      const { axis, quarters } = moveRotation(m);
      const one = Math.sign(quarters); // direction of the turn
      if (arrow.kind === 'arc') { assert.equal(arrow.clockwise, one < 0, `${m}: curved arrow`); continue; }
      const moved = rot(arrow.at, axis, one);
      const travel = moved.map((v, i) => v - arrow.at[i]);
      const along = travel[0] * arrow.dir[0] + travel[1] * arrow.dir[1] + travel[2] * arrow.dir[2];
      assert.ok(along > 0, `${m}: the sticker under the arrow moves along the arrow`);
    }
  });
});

describe('audit of every move screen in the guide', () => {
  test('words = letter on every forward and every undo screen', () => {
    let forward = 0, undo = 0, adjust = 0;
    for (const flow of Object.values(FOLLOW_ALONG)) for (const n of Object.values(flow.nodes)) {
      if (n.kind === 'adjust') {
        // "Turn the TOP layer until…" screens: the layer named in the words is the layer the letter turns
        assert.ok(n.title.toLowerCase().includes(FACE_WORD[n.move[0]]), `${n.id}: "${n.title}" vs ${n.move}`);
        adjust++;
      }
      if (n.kind !== 'sequence') continue;
      for (const ch of n.chunks) {
        assert.equal(ch.phrase, chantFor(ch.moves), `${n.id} / ${ch.name}: chant is generated from the moves`);
        const words = ch.phrase.split(', ');
        ch.moves.forEach((m, i) => { assert.equal(words[i].toLowerCase(), MOVE_WORDS[m].toLowerCase(), `${n.id} move ${i + 1}`); forward++; });
      }
      // the "I messed up" walk-back is the exact inverse, read from the same table
      const moves = sequenceMoves(n);
      const back = invertSequence(moves);
      assert.ok(same(run([...moves, ...back]), getSolvedCube()), `${n.id}: undo returns the cube`);
      back.forEach((m, i) => { assert.equal(m, inverseMove(moves[moves.length - 1 - i])); assert.ok(MOVE_TEXT[m]); undo++; });
    }
    console.log(`  audited ${forward} forward move screens + ${undo} undo screens + ${adjust} "turn until" screens = ${forward + undo + adjust} screens, 0 disagreements`);
  });
  test('Insert left, line by line', () => {
    const n = FOLLOW_ALONG[3].nodes['s3-left'];
    assert.equal(n.kind, 'sequence');
    const moves = sequenceMoves(n as never);
    assert.equal(moves.join(' '), "U' L' U L U F U' F'");
    moves.forEach((m, i) => {
      const a = moveArrow(m);
      const arrow = a.kind === 'arc' ? `curved arrow on the front, ${a.clockwise ? 'clockwise' : 'counter-clockwise'}`
        : `straight arrow on the front ${a.at[0] === -1 ? 'left column' : a.at[0] === 1 ? 'right column' : a.at[1] === 1 ? 'top row' : 'bottom row'}, pointing ${a.dir[1] > 0 ? 'UP' : a.dir[1] < 0 ? 'DOWN' : a.dir[0] > 0 ? 'RIGHT' : 'LEFT'}`;
      console.log(`  ${i + 1}. ${m.padEnd(2)} -> "${MOVE_TEXT[m]}" -> ${arrow}`);
    });
  });
});

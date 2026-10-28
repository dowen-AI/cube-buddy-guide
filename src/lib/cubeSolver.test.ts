import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import Cube from 'cubejs';
import { cubeStateToFacelets, validateFacelets, solveCubeState } from './cubeSolver';
import { getSolvedCube, executeMove, type MoveName } from '../hooks/useCubeState';

describe('cube solver rules', () => {
  test('a solved cube needs no moves', async () => {
    assert.deepEqual(await solveCubeState(getSolvedCube()), []);
  });

  test('each color requires nine stickers', () => {
    const state = getSolvedCube();
    state.top[0][0] = state.front[1][1];
    assert.equal(validateFacelets(cubeStateToFacelets(state)).valid, false);
  });

  test('center stickers remain fixed', () => {
    const state = getSolvedCube();
    [state.top[1][1], state.front[1][1]] = [state.front[1][1], state.top[1][1]];
    assert.equal(validateFacelets(cubeStateToFacelets(state)).valid, false);
  });

  test('single flipped edge cannot be solved', () => {
    const state = getSolvedCube();
    [state.top[2][1], state.front[0][1]] = [state.front[0][1], state.top[2][1]];
    assert.equal(validateFacelets(cubeStateToFacelets(state)).valid, false);
  });

  test('solutions round-trip through both move engines', { timeout: 120000 }, async () => {
    const moves: MoveName[] = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
    let seed = 41;
    for (let sample = 0; sample < 100; sample++) {
      let state = getSolvedCube();
      const scramble: MoveName[] = [];
      for (let i = 0; i < 20; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const move = moves[seed % moves.length];
        scramble.push(move);
        state = executeMove(state, move);
      }
      const cube = new Cube().move(scramble.join(' '));
      assert.equal(cubeStateToFacelets(state), cube.asString());
      assert.equal(validateFacelets(cube.asString()).valid, true);
      const solution = await solveCubeState(state);
      for (const move of solution) state = executeMove(state, move);
      assert.deepEqual(state, getSolvedCube());
      assert.equal(cube.move(solution.join(' ')).isSolved(), true);
    }
  });
});
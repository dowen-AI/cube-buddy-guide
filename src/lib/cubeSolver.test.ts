import { describe, test, expect } from 'bun:test';
import Cube from 'cubejs';
import { cubeStateToFacelets, validateFacelets, solveCubeState } from './cubeSolver';
import { getSolvedCube, executeMove, type MoveName } from '../hooks/useCubeState';

describe('cube solver rules', () => {
  test('a solved cube needs no moves', async () => {
    expect(await solveCubeState(getSolvedCube())).toEqual([]);
  });

  test('each color requires nine stickers', () => {
    const state = getSolvedCube();
    state.top[0][0] = state.front[1][1];
    expect(validateFacelets(cubeStateToFacelets(state)).valid).toBe(false);
  });

  test('center stickers remain fixed', () => {
    const state = getSolvedCube();
    [state.top[1][1], state.front[1][1]] = [state.front[1][1], state.top[1][1]];
    expect(validateFacelets(cubeStateToFacelets(state)).valid).toBe(false);
  });

  test('single flipped edge cannot be solved', () => {
    const state = getSolvedCube();
    [state.top[2][1], state.front[0][1]] = [state.front[0][1], state.top[2][1]];
    expect(validateFacelets(cubeStateToFacelets(state)).valid).toBe(false);
  });

  test('solutions round-trip through both move engines', async () => {
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
      expect(cubeStateToFacelets(state)).toBe(cube.asString());
      expect(validateFacelets(cube.asString()).valid).toBe(true);
      const solution = await solveCubeState(state);
      for (const move of solution) state = executeMove(state, move);
      expect(state).toEqual(getSolvedCube());
      expect(cube.move(solution.join(' ')).isSolved()).toBe(true);
    }
  }, 120000);
});
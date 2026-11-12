import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import Cube from 'cubejs';
import { cubeStateToFacelets, validateFacelets, solveCubeState } from '../src/lib/cubeSolver';
import { getSolvedCube, executeMove, type MoveName } from '../src/hooks/useCubeState';

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
// ---- short solutions (the "R U R' U' comes back as 11 moves" bug) ----
import { solveVariant, solveWithoutWorkers, moveCount, VARIANT_COUNT, type CubeClass } from '../src/lib/solverSearch';
import { solveCube } from '../src/lib/cubeSolver';

const K = Cube as unknown as CubeClass & { initSolver: () => void; random: () => { solve: () => string } };

describe('short solutions', () => {
  const apply = (moves: string) => moves.split(' ').reduce((s, m) => executeMove(s, m as MoveName), getSolvedCube());
  const isSolved = (s: ReturnType<typeof getSolvedCube>) => Object.values(s).every((f) => f.flat().every((x) => x === f[1][1]));

  test("R U R' U' is solved in 4 moves (it used to take 11)", { timeout: 120000 }, async () => {
    const scrambled = apply("R U R' U'");
    K.initSolver();
    assert.equal(moveCount(new Cube().move("R U R' U'").solve()), 11, 'plain cubejs really does return 11');
    const { moves, exact } = await solveCube(scrambled);
    console.log(`  R U R' U'  ->  ${moves.join(' ')}  (${moves.length} moves)`);
    assert.ok(moves.length <= 4);
    assert.equal(exact, true);
    assert.ok(isSolved(moves.reduce((s, m) => executeMove(s, m), scrambled)));
  });

  test('scrambles of 1 to 8 moves come back no longer than the scramble', { timeout: 120000 }, async () => {
    const pool: MoveName[] = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'", 'R2', 'U2', 'F2'];
    let seed = 7; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const cases: MoveName[][] = [['U'], ['D2'], ['R2'], ['R2', 'F2'], ['U2', 'D2', 'R2', 'L2'], ['U', 'D'], ['F2', 'U']];
    for (let n = 1; n <= 8; n++) for (let rep = 0; rep < 4; rep++) cases.push(Array.from({ length: n }, () => pool[Math.floor(rand() * pool.length)]));
    for (const scr of cases) {
      const n = scr.length;
      const state = scr.reduce((s, m) => executeMove(s, m), getSolvedCube());
      const { moves } = await solveCube(state);
      assert.ok(moves.length <= n, `${scr.join(' ')} -> ${moves.join(' ')}`);
      assert.ok(isSolved(moves.reduce((s, m) => executeMove(s, m), state)));
    }
  });

  test('every one of the 6 search variants returns a real solution of the same cube', { timeout: 120000 }, () => {
    K.initSolver();
    for (let i = 0; i < 5; i++) {
      const scramble = Cube.inverse(K.random().solve());
      for (let k = 0; k < VARIANT_COUNT; k++) {
        const sol = solveVariant(K, scramble, k);
        assert.ok(sol !== null, `variant ${k} found nothing`);
        assert.ok(new Cube().move(scramble).move(sol!).isSolved(), `variant ${k} does not solve the cube`);
      }
    }
  });

  test('the no-worker fallback always returns a correct solution of 22 moves or fewer', { timeout: 120000 }, () => {
    K.initSolver();
    const lengths: number[] = [];
    for (let i = 0; i < 20; i++) {
      const cube = K.random() as unknown as { asString: () => string };
      const sol = solveWithoutWorkers(K, cube.asString());
      assert.ok(sol !== null);
      assert.ok(Cube.fromString(cube.asString()).move(sol!.solution).isSolved());
      lengths.push(moveCount(sol!.solution));
    }
    console.log(`  fallback (no background search) lengths over 20 random cubes: ${lengths.sort((a, b) => a - b).join(' ')}`);
    assert.ok(Math.max(...lengths) <= 22);
  });
});

// The on-screen animation must turn each layer the same way the move engine
// does, or the guide would show one thing and mean another.
import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { executeMove, type CubeState, type MoveName } from '../src/hooks/useCubeState';
import { FACES, cubeletFaces, isInMoveLayer, moveRotation, stickerIndex, type Face } from '../src/lib/cubeGeometry';

const NORMAL: Record<Face, [number, number, number]> = { right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0], front: [0, 0, 1], back: [0, 0, -1] };
const faceOf = (n: number[]): Face => FACES.find((f) => NORMAL[f].every((v, i) => v === n[i]))!;
// rotate by k quarter turns (right-hand rule) about an axis
const rot = (p: number[], axis: 'x' | 'y' | 'z', quarters: number): number[] => {
  let [x, y, z] = p;
  for (let i = 0; i < ((quarters % 4) + 4) % 4; i++) {
    if (axis === 'x') [y, z] = [-z, y];
    else if (axis === 'y') [x, z] = [z, -x];
    else [x, y] = [-y, x];
  }
  return [x, y, z];
};
// a cube whose every sticker has a unique label
const labelled = (): CubeState => Object.fromEntries(FACES.map((f) => [f, [0, 1, 2].map((r) => [0, 1, 2].map((c) => `${f}${r}${c}`))])) as unknown as CubeState;

const MOVES: MoveName[] = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

describe('animation matches the move engine', () => {
  for (const move of MOVES) test(move, () => {
    const before = labelled();
    const after = executeMove(before, move);
    const { axis, quarters } = moveRotation(move);
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      for (const face of cubeletFaces(x, y, z)) {
        const [r, c] = stickerIndex(face, x, y, z);
        const moving = isInMoveLayer(move, x, y, z);
        const p = moving ? rot([x, y, z], axis, quarters) : [x, y, z];
        const n = moving ? rot(NORMAL[face], axis, quarters) : NORMAL[face];
        const toFace = faceOf(n);
        const [r2, c2] = stickerIndex(toFace, p[0], p[1], p[2]);
        assert.equal(after[toFace][r2][c2], before[face][r][c], `${move}: sticker ${face}[${r}][${c}] should land on ${toFace}[${r2}][${c2}]`);
      }
    }
  });
});

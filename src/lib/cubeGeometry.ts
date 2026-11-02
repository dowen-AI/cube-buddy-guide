import type { CubeState, MoveName } from '@/hooks/useCubeState';

export type Face = keyof CubeState;
export const FACES: Face[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

// Grid [row, col] of the sticker on `face` of the cubelet at (x, y, z), with
// x = right, y = up, z = toward the viewer, each in -1..1. This matches the
// move engine's layout (verified against cubejs): the top face's row 2 and the
// bottom face's row 0 touch the front; the right face's column 0 and the left
// face's column 2 touch the front; the back face's column 0 touches the right.
export const stickerIndex = (face: Face, x: number, y: number, z: number): [number, number] => {
  switch (face) {
    case 'front': return [1 - y, x + 1];
    case 'back': return [1 - y, 1 - x];
    case 'left': return [1 - y, z + 1];
    case 'right': return [1 - y, 1 - z];
    case 'top': return [z + 1, x + 1];
    case 'bottom': return [1 - z, x + 1];
  }
};

// Which outward faces a cubelet at (x, y, z) shows.
export const cubeletFaces = (x: number, y: number, z: number): Face[] => {
  const faces: Face[] = [];
  if (z === 1) faces.push('front');
  if (z === -1) faces.push('back');
  if (x === -1) faces.push('left');
  if (x === 1) faces.push('right');
  if (y === 1) faces.push('top');
  if (y === -1) faces.push('bottom');
  return faces;
};

const LAYER: Record<string, ['x' | 'y' | 'z', number]> = {
  R: ['x', 1], L: ['x', -1], U: ['y', 1], D: ['y', -1], F: ['z', 1], B: ['z', -1],
};

export const isInMoveLayer = (move: MoveName, x: number, y: number, z: number) => {
  const [axis, value] = LAYER[move[0]];
  return (axis === 'x' ? x : axis === 'y' ? y : z) === value;
};

export const MOVE_FACE: Record<string, Face> = {
  R: 'right', L: 'left', U: 'top', D: 'bottom', F: 'front', B: 'back',
};

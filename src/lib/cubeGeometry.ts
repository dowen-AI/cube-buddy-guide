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

// "Any color" stickers in teaching pictures: a dark slate that can't be mistaken for white.
export const ANY_COLOR = '#4b5563';

// How the turning layer spins on screen: rotation axis and signed quarter turns
// (right-hand rule about +x / +y / +z). A clockwise turn of a face, seen from
// outside that face, is a negative rotation about the axis pointing out of it.
// tests/cubeGeometry.test.ts checks every move against the move engine.
export const moveRotation = (move: MoveName): { axis: 'x' | 'y' | 'z'; quarters: number } => {
  const [axis, side] = LAYER[move[0]];
  const amount = move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1;
  return { axis, quarters: -side * amount };
};

// Which extra camera shows the face a move turns, when the main view can't see it.
export type CubeView = 'top' | 'bottom' | 'left' | 'back';
export const hiddenFaceView = (move: MoveName): Exclude<CubeView, 'top'> | null =>
  move[0] === 'D' ? 'bottom' : move[0] === 'L' ? 'left' : move[0] === 'B' ? 'back' : null;

// Where the arrow for a move is drawn and which way it points, in cube
// coordinates (x right, y up, z toward the viewer). Straight arrows lie on the
// front face (or, for the back face, along the back row of the top); the front
// face gets a curved arrow. tests/moveWords.test.ts checks every arrow against
// the direction the layer really turns.
export type ArrowSpec =
  | { kind: 'arc'; clockwise: boolean }
  | { kind: 'straight'; on: 'front' | 'top'; at: [number, number, number]; dir: [number, number, number] };
export const moveArrow = (move: MoveName): ArrowSpec => {
  const prime = move.endsWith("'");
  switch (move[0]) {
    case 'F': return { kind: 'arc', clockwise: !prime };
    case 'R': return { kind: 'straight', on: 'front', at: [1, 0, 1], dir: [0, prime ? -1 : 1, 0] };
    case 'L': return { kind: 'straight', on: 'front', at: [-1, 0, 1], dir: [0, prime ? 1 : -1, 0] };
    case 'U': return { kind: 'straight', on: 'front', at: [0, 1, 1], dir: [prime ? 1 : -1, 0, 0] };
    case 'D': return { kind: 'straight', on: 'front', at: [0, -1, 1], dir: [prime ? -1 : 1, 0, 0] };
    default: return { kind: 'straight', on: 'top', at: [0, 1, -1], dir: [prime ? 1 : -1, 0, 0] }; // B
  }
};

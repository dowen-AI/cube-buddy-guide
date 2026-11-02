import type { MoveName } from '@/hooks/useCubeState';

// Plain-English wording for every move, as seen by someone holding the cube
// with the front face toward them. Directions verified against the move engine.
export const MOVE_TEXT: Record<MoveName, string> = {
  R: 'Turn the RIGHT side UP',
  "R'": 'Turn the RIGHT side DOWN',
  R2: 'Turn the RIGHT side twice',
  L: 'Turn the LEFT side DOWN',
  "L'": 'Turn the LEFT side UP',
  L2: 'Turn the LEFT side twice',
  U: 'Turn the TOP layer to the LEFT',
  "U'": 'Turn the TOP layer to the RIGHT',
  U2: 'Turn the TOP layer twice',
  D: 'Turn the BOTTOM layer to the RIGHT',
  "D'": 'Turn the BOTTOM layer to the LEFT',
  D2: 'Turn the BOTTOM layer twice',
  F: 'Turn the FRONT face clockwise',
  "F'": 'Turn the FRONT face counter-clockwise',
  F2: 'Turn the FRONT face twice',
  B: 'Turn the BACK face clockwise (as seen from behind)',
  "B'": 'Turn the BACK face counter-clockwise (as seen from behind)',
  B2: 'Turn the BACK face twice',
};

export const MOVE_HINT: Partial<Record<MoveName, string>> = {
  R: 'The column under your right thumb rolls away from you.',
  "R'": 'The column under your right thumb rolls toward you.',
  L: 'The column under your left thumb rolls toward you.',
  "L'": 'The column under your left thumb rolls away from you.',
  U: 'The front row of the top layer slides to your left.',
  "U'": 'The front row of the top layer slides to your right.',
  D: 'The front row of the bottom layer slides to your right.',
  "D'": 'The front row of the bottom layer slides to your left.',
  F: 'Like turning a steering wheel to the right.',
  "F'": 'Like turning a steering wheel to the left.',
  B: "From the front, the back face's top edge moves to your left.",
  "B'": "From the front, the back face's top edge moves to your right.",
};

export const isDoubleMove = (m: MoveName) => m.endsWith('2');

export const inverseMove = (m: MoveName): MoveName =>
  (isDoubleMove(m) ? m : m.endsWith("'") ? m[0] : `${m}'`) as MoveName;

export const invertSequence = (moves: MoveName[]): MoveName[] => [...moves].reverse().map(inverseMove);

export const parseMoves = (seq: string): MoveName[] => seq.split(/\s+/).filter(Boolean) as MoveName[];

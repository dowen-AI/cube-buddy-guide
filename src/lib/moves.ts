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

// The short words for each move, used in the chant line ("Right up, top left…").
// This table and MOVE_TEXT above are the only places direction words are written:
// every screen's words are looked up from the move itself, never typed by hand.
// tests/moveWords.test.ts checks each entry against the move engine.
export const MOVE_WORDS: Record<MoveName, string> = {
  R: 'Right up',
  "R'": 'Right down',
  R2: 'Right twice',
  L: 'Left down',
  "L'": 'Left up',
  L2: 'Left twice',
  U: 'Top left',
  "U'": 'Top right',
  U2: 'Top twice',
  D: 'Bottom right',
  "D'": 'Bottom left',
  D2: 'Bottom twice',
  F: 'Front clockwise',
  "F'": 'Front counter-clockwise',
  F2: 'Front twice',
  B: 'Back clockwise',
  "B'": 'Back counter-clockwise',
  B2: 'Back twice',
};
// "Right up, top left, right down, top right"
export const chantFor = (moves: MoveName[]) => moves.map((m, i) => (i === 0 ? MOVE_WORDS[m] : MOVE_WORDS[m].toLowerCase())).join(', ');

export const isDoubleMove = (m: MoveName) => m.endsWith('2');

export const inverseMove = (m: MoveName): MoveName =>
  (isDoubleMove(m) ? m : m.endsWith("'") ? m[0] : `${m}'`) as MoveName;

export const invertSequence = (moves: MoveName[]): MoveName[] => [...moves].reverse().map(inverseMove);

export const parseMoves = (seq: string): MoveName[] => seq.split(/\s+/).filter(Boolean) as MoveName[];

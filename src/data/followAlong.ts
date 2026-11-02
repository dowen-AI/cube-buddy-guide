import type { MoveName } from '@/hooks/useCubeState';
import {
  applyStep, bottomEdgeAligned, bottomEdgeAlignedAtFront, flipEdge, frontRightCornerInSpot, isEdgeSticker,
  isSide, lAtBackLeft, lineLeftRight, maxMatchTurn, pairAtBackRight, petalMatched, petalMatchedAtFront, scenario,
  showAll, sidesAligned, turnUntil, twistCorner, whiteCornerOverFrontRight, whiteCornerOverSlot, edgeMatches,
  FRONT_RIGHT_BOTTOM, FRONT_LEFT_BOTTOM, type Demo, type Hold, type VisRule, type StickerRef,
} from '@/lib/cubeDemo';
import { invertSequence, parseMoves } from '@/lib/moves';

export type CounterKey = 'petals' | 'corners' | 'edges' | 'times' | 'repeats' | 'twisted';
export type Counters = Partial<Record<CounterKey, number>>;

export interface CounterDisplay {
  key: CounterKey;
  label: string;
  of?: number; // shows "X of N" with dots
  until?: string; // "keep going until …"
}

export interface Effect { add?: CounterKey[]; reset?: CounterKey[] }
export type Target = string | ((c: Counters) => string);

export type TopPattern = 'dot' | 'l' | 'line' | 'cross';
export type Picture =
  | { kind: 'cube'; demo: () => Demo; view?: 'top' | 'bottom' }
  | { kind: 'pattern'; pattern: TopPattern };

export interface Chunk { name: string; phrase: string; moves: MoveName[] }

interface Base {
  id: string;
  hold: Hold;
  step: string; // node a "Restart this step" returns to
  counters?: CounterDisplay[];
  view?: 'top' | 'bottom';
  loudFlip?: string; // shown on the step where the cube is flipped
}

export interface ChoiceOption {
  label: string;
  detail?: string;
  picture?: Picture;
  next: Target;
  effect?: Effect;
  demo?: () => Demo; // replace the demo cube when this option is picked
}

export interface Checkpoint {
  title: string;
  body?: string;
  goal?: Picture; // a fixed goal picture; otherwise the demo after the moves
  yes: { label: string; next: Target; effect?: Effect };
  notYet?: { label: string; next: Target; effect?: Effect };
}

export type FlowNode =
  | (Base & { kind: 'info'; title: string; body?: string; picture?: Picture; demo?: () => Demo; button: string; next: Target; effect?: Effect; demoAfter?: (d: Demo) => Demo })
  | (Base & { kind: 'choice'; title: string; body?: string; options: ChoiceOption[] })
  | (Base & { kind: 'adjust'; title: string; body?: string; move: MoveName; demo?: () => Demo; button: string; next: Target; demoAfter: (d: Demo) => Demo })
  | (Base & { kind: 'sequence'; name: string; intro?: string; chunks: Chunk[]; demo?: () => Demo; onDone?: Effect; reassure?: (c: Counters) => string | undefined; checkpoint: Checkpoint })
  | (Base & { kind: 'finish'; title: string; body: string; picture: Picture });

export interface StageFlow { stageId: number; start: string; nodes: Record<string, FlowNode> }

const m = parseMoves;
const inv = (seq: string) => invertSequence(parseMoves(seq)).join(' ');
const chunk = (name: string, phrase: string, moves: string): Chunk => ({ name, phrase, moves: m(moves) });
const flow = (stageId: number, start: string, list: FlowNode[]): StageFlow => ({
  stageId, start, nodes: Object.fromEntries(list.map((n) => [n.id, n])),
});
const cube = (demo: () => Demo, view?: 'top' | 'bottom'): Picture => ({ kind: 'cube', demo, view });

// ============================================================ Stage 1
const S1_HOLD: Hold = 'yellow-top';
const s1 = (setup: string) => () => scenario(S1_HOLD, () => false, setup, [['bottom', 0, 1], ['front', 2, 1]]);
const S1_CASES = {
  petalUp: s1("F2 U'"),
  sideTop: s1("F2 U' F R' F' R"),
  middleFacing: s1("F2 R U' R'"),
  middleRight: s1("F2 U F' U' F"),
  bottomDown: () => scenario(S1_HOLD, () => false, "R2 U F2 U' R2", [['bottom', 1, 2], ['right', 2, 1]]),
  flipped: s1("F2 U' R' F R"),
  correct: s1(''),
};
const petals: CounterDisplay = { key: 'petals', label: 'Petals done', of: 4 };
const afterPetal = (c: Counters) => ((c.petals ?? 0) >= 4 ? 's1-done' : 's1-where');
const liftCheckpoint = (next = 's1-align'): Checkpoint => ({
  title: 'Your white edge should now be on TOP, white facing UP',
  body: 'Like the picture: the white sticker is on the top face, next to the yellow center. (Grey = any color.)',
  yes: { label: 'Yes, it matches', next },
});

const stage1 = flow(1, 's1-hold', [
  { kind: 'info', id: 's1-hold', hold: S1_HOLD, step: 's1-hold', title: 'Hold your cube with the YELLOW center on top and the WHITE center on the bottom.', body: 'Center pieces never move, so this tells you which way is up for the whole stage. You will place the 4 white edges one at a time.', demo: S1_CASES.correct, button: "I'm holding it like this", next: 's1-where' },
  {
    kind: 'choice', id: 's1-where', hold: S1_HOLD, step: 's1-where', counters: [petals],
    title: 'Find a white EDGE you haven\'t placed yet (2 colors, one is white). Where is it?',
    options: [
      { label: 'Top layer — white facing UP', picture: cube(S1_CASES.petalUp), demo: S1_CASES.petalUp, next: 's1-align' },
      { label: 'Top layer — white facing the side', picture: cube(S1_CASES.sideTop), demo: S1_CASES.sideTop, next: 's1-side-face' },
      { label: 'Middle layer', picture: cube(S1_CASES.middleFacing), demo: S1_CASES.middleFacing, next: 's1-middle' },
      { label: 'Bottom layer — white DOWN, wrong spot', detail: "Its other color doesn't match the center above", picture: cube(S1_CASES.bottomDown, 'bottom'), demo: S1_CASES.bottomDown, next: 's1-bottom-face' },
      { label: 'Bottom layer — white facing the side', detail: 'Flipped the wrong way', picture: cube(S1_CASES.flipped), demo: S1_CASES.flipped, next: 's1-flipped-face' },
      { label: 'Bottom layer, already correct — count it', detail: 'White down, other color matches the center above', picture: cube(S1_CASES.correct, 'bottom'), next: afterPetal, effect: { add: ['petals'] } },
    ],
  },
  // (a) top layer, white facing the side
  { kind: 'info', id: 's1-side-face', hold: S1_HOLD, step: 's1-where', counters: [petals], title: 'Turn the whole cube (yellow stays on top) so this edge is at the top, right in front of you.', body: 'The white sticker should face you.', button: "It's in front of me", next: 's1-side-seq' },
  { kind: 'sequence', id: 's1-side-seq', hold: S1_HOLD, step: 's1-where', counters: [petals], name: 'Flip it up', chunks: [chunk('Flip it up', 'Right down, front turn, right up, front back', "R' F R F'")], checkpoint: liftCheckpoint() },
  // (c) middle layer
  {
    kind: 'choice', id: 's1-middle', hold: S1_HOLD, step: 's1-where', counters: [petals],
    title: 'Turn the whole cube so the edge is in the middle layer at the FRONT-RIGHT. Which way does its white sticker face?',
    options: [
      { label: 'Toward me', picture: cube(S1_CASES.middleFacing), demo: S1_CASES.middleFacing, next: 's1-middle-facing' },
      { label: 'To the right', picture: cube(S1_CASES.middleRight), demo: S1_CASES.middleRight, next: 's1-middle-right' },
    ],
  },
  { kind: 'sequence', id: 's1-middle-facing', hold: S1_HOLD, step: 's1-where', counters: [petals], name: 'Lift it out', chunks: [chunk('Lift it out', 'Right up, top left, right down', "R U R'")], checkpoint: liftCheckpoint() },
  { kind: 'sequence', id: 's1-middle-right', hold: S1_HOLD, step: 's1-where', counters: [petals], name: 'Lift it out', chunks: [chunk('Lift it out', 'Front back, top left, front forward', "F' U F")], checkpoint: liftCheckpoint() },
  // (b) bottom layer, white down but wrong color
  { kind: 'info', id: 's1-bottom-face', hold: S1_HOLD, step: 's1-where', counters: [petals], title: 'Turn the whole cube (yellow stays on top) so this edge is at the bottom, right in front of you.', button: "It's in front of me", next: 's1-bottom-seq' },
  { kind: 'sequence', id: 's1-bottom-seq', hold: S1_HOLD, step: 's1-where', counters: [petals], name: 'Bring it up', chunks: [chunk('Bring it up', 'Front face twice', 'F2')], checkpoint: liftCheckpoint() },
  // (d) flipped in the cross
  { kind: 'info', id: 's1-flipped-face', hold: S1_HOLD, step: 's1-where', counters: [petals], title: 'Turn the whole cube (yellow stays on top) so this edge is at the bottom, right in front of you.', body: 'Its white sticker should face you.', button: "It's in front of me", next: 's1-flipped-seq' },
  { kind: 'sequence', id: 's1-flipped-seq', hold: S1_HOLD, step: 's1-where', counters: [petals], name: 'Flip it up', chunks: [chunk('Flip it up', 'Right down, front back, right up', "R' F' R")], checkpoint: liftCheckpoint() },
  // shared: align the petal, face it, drop it
  { kind: 'adjust', id: 's1-align', hold: S1_HOLD, step: 's1-where', counters: [petals], move: 'U', title: "Turn the TOP layer until the white edge's other color matches the center below it.", body: 'Turn one click at a time, either direction. Only the top layer moves.', button: 'It matches now', next: 's1-face', demoAfter: (d) => turnUntil(d, 'U', petalMatched) },
  { kind: 'info', id: 's1-face', hold: S1_HOLD, step: 's1-where', counters: [petals], title: 'Turn the whole cube (yellow stays on top) so that white edge is right in front of you.', body: 'Skip this if it already is.', button: "It's in front of me", next: 's1-drop', demoAfter: (d) => turnUntil(d, 'y', petalMatchedAtFront) },
  {
    kind: 'sequence', id: 's1-drop', hold: S1_HOLD, step: 's1-where', counters: [petals], view: 'bottom', name: 'Drop it in', chunks: [chunk('Drop it in', 'Front face twice', 'F2')],
    checkpoint: { title: 'The white edge should now be on the BOTTOM, white facing down', body: 'Its other color matches the center above it. (View from below; grey = any color.)', yes: { label: 'Yes, it matches', next: afterPetal, effect: { add: ['petals'] } } },
  },
  { kind: 'finish', id: 's1-done', hold: S1_HOLD, step: 's1-where', counters: [petals], view: 'bottom', title: 'White cross complete!', body: 'All 4 white edges are on the bottom, each matching the center above it.', picture: cube(() => scenario(S1_HOLD, (f, r, c) => f === 'bottom' ? isEdgeSticker(r, c) : isSide(f) && r === 2 && c === 1), 'bottom') },
]);

// ============================================================ Stage 2
const S2_HOLD: Hold = 'yellow-top';
const whiteCross: VisRule = (f, r, c) => (f === 'bottom' && isEdgeSticker(r, c)) || (isSide(f) && r === 2 && c === 1);
const FRB_TARGET: StickerRef[] = [['bottom', 0, 2], ['front', 2, 2], ['right', 2, 0]];
const SLEDGE = "R U R' U'";
const s2Top = () => scenario(S2_HOLD, whiteCross, `${inv(SLEDGE)} U`, FRB_TARGET);
const s2Wrong = () => twistCorner(scenario(S2_HOLD, whiteCross, '', FRB_TARGET), FRONT_RIGHT_BOTTOM, 1);
const s2Goal = () => scenario(S2_HOLD, whiteCross, '', FRB_TARGET);
const corners: CounterDisplay = { key: 'corners', label: 'Corners done', of: 4 };
const sledgeRepeats: CounterDisplay = { key: 'repeats', label: 'Sledgehammers on this corner', until: 'usually 1, 3 or 5' };
const afterCorner = (c: Counters) => ((c.corners ?? 0) >= 4 ? 's2-done' : 's2-where');

const stage2 = flow(2, 's2-hold', [
  { kind: 'info', id: 's2-hold', hold: S2_HOLD, step: 's2-hold', title: 'Keep YELLOW on top and WHITE on the bottom.', body: 'Your white cross is on the bottom. Now you will fill in the 4 white corners, one at a time.', demo: s2Goal, button: 'Ready', next: 's2-where' },
  {
    kind: 'choice', id: 's2-where', hold: S2_HOLD, step: 's2-where', counters: [corners],
    title: 'Find a corner with WHITE on it (3 colors) that isn\'t solved yet. Where is it?',
    options: [
      { label: 'Top layer', picture: cube(s2Top), demo: s2Top, next: 's2-align' },
      { label: 'Bottom layer, in the wrong slot or twisted', detail: "White isn't facing down, or its colors don't match the centers next to it.", picture: cube(s2Wrong), demo: s2Wrong, next: 's2-wrong-face' },
      { label: 'Already solved — count it', detail: 'White faces down and both side colors match their centers.', picture: cube(s2Goal), next: afterCorner, effect: { add: ['corners'] } },
    ],
  },
  { kind: 'info', id: 's2-wrong-face', hold: S2_HOLD, step: 's2-where', counters: [corners], title: 'Turn the whole cube (yellow stays on top) so that corner is at the FRONT-RIGHT, on the bottom.', button: "It's at the front-right", next: 's2-pop' },
  { kind: 'sequence', id: 's2-pop', hold: S2_HOLD, step: 's2-where', counters: [corners], name: 'Pop it out', intro: 'One Sledgehammer lifts the corner up to the top layer.', chunks: [chunk('Sledgehammer', 'Right up, top left, right down, top right', SLEDGE)], checkpoint: { title: 'That corner should now be in the TOP layer', body: 'Grey = any color.', yes: { label: 'Yes, it matches', next: 's2-align' } } },
  { kind: 'adjust', id: 's2-align', hold: S2_HOLD, step: 's2-where', counters: [corners], move: 'U', title: 'Turn the TOP layer until the white corner sits right above its home slot.', body: "Its home is between the two centers that match its two other colors.", button: "It's above its slot", next: 's2-face', demoAfter: (d) => turnUntil(d, 'U', whiteCornerOverSlot) },
  { kind: 'info', id: 's2-face', hold: S2_HOLD, step: 's2-where', counters: [corners], title: 'Turn the whole cube (yellow stays on top) so that corner is at the FRONT-RIGHT, on top.', body: 'Skip this if it already is.', button: "It's at the front-right", next: 's2-sledge', demoAfter: (d) => turnUntil(d, 'y', whiteCornerOverFrontRight) },
  {
    kind: 'sequence', id: 's2-sledge', hold: S2_HOLD, step: 's2-where', counters: [corners, sledgeRepeats], name: 'Sledgehammer', chunks: [chunk('Sledgehammer', 'Right up, top left, right down, top right', SLEDGE)], onDone: { add: ['repeats'] },
    checkpoint: {
      title: 'Is your corner solved like THIS yet?', body: 'White facing down, both side colors matching their centers.', goal: cube(s2Goal),
      yes: { label: 'Yes, it matches', next: afterCorner, effect: { add: ['corners'], reset: ['repeats'] } },
      notYet: { label: 'Not yet — do another Sledgehammer', next: 's2-sledge' },
    },
  },
  { kind: 'finish', id: 's2-done', hold: S2_HOLD, step: 's2-where', counters: [corners], view: 'bottom', title: 'First layer complete!', body: 'The whole white face is done, and the bottom row of every side matches its center.', picture: cube(() => scenario(S2_HOLD, (f, r) => f === 'bottom' || (isSide(f) && r === 2)), 'bottom') },
]);

// ============================================================ Stage 3 (flipped: white on top)
const S3_HOLD: Hold = 'white-top';
const whiteLayer: VisRule = (f, r) => f === 'top' || (isSide(f) && r === 0);
const INSERT_RIGHT = "D' R' D R D F D' F'";
const INSERT_LEFT = "D L D' L' D' F' D F";
const FR_EDGE: StickerRef[] = [['front', 1, 2], ['right', 1, 0]];
const FL_EDGE: StickerRef[] = [['front', 1, 0], ['left', 1, 2]];
const s3Right = () => scenario(S3_HOLD, whiteLayer, inv(INSERT_RIGHT), FR_EDGE);
const s3Left = () => scenario(S3_HOLD, whiteLayer, inv(INSERT_LEFT), FL_EDGE);
const s3Found = () => applyStep(s3Right(), 'D');
const s3Stuck = () => flipEdge(scenario(S3_HOLD, whiteLayer, '', FR_EDGE), FR_EDGE[0], FR_EDGE[1]);
const s3Solved = () => scenario(S3_HOLD, whiteLayer, '', FR_EDGE);
const edges: CounterDisplay = { key: 'edges', label: 'Edges done', of: 4 };
const afterEdge = (c: Counters) => ((c.edges ?? 0) >= 4 ? 's3-done' : 's3-where');
const flip3 = 'FLIP YOUR CUBE NOW: white goes on TOP, yellow on the bottom.';
const insertChecks: Checkpoint = { title: 'The edge should now be in the middle layer, matching both centers', body: 'Like the picture. (Grey = any color.)', yes: { label: 'Yes, it matches', next: afterEdge, effect: { add: ['edges'] } } };

const stage3 = flow(3, 's3-flip', [
  { kind: 'info', id: 's3-flip', hold: S3_HOLD, step: 's3-flip', loudFlip: flip3, title: 'Flip the cube upside down: WHITE on top, YELLOW on the bottom.', body: 'The finished white layer is now on top. You will fill the 4 middle-layer edges from below.', demo: s3Solved, button: "I've flipped it", next: 's3-where' },
  {
    kind: 'choice', id: 's3-where', hold: S3_HOLD, step: 's3-where', counters: [edges],
    title: 'Look at the BOTTOM layer for an edge (2 colors) with NO yellow on it.',
    options: [
      { label: 'Found one', picture: cube(s3Found), demo: s3Found, next: 's3-align' },
      { label: 'None — every bottom edge has yellow', detail: 'Then an edge is stuck in the middle layer (wrong slot or flipped).', picture: cube(s3Stuck), demo: s3Stuck, next: 's3-stuck-face' },
      { label: 'A middle edge is already correct — count it', detail: 'Both its colors match the centers next to it.', picture: cube(s3Solved), next: afterEdge, effect: { add: ['edges'] } },
    ],
  },
  { kind: 'info', id: 's3-stuck-face', hold: S3_HOLD, step: 's3-where', counters: [edges], title: 'Turn the whole cube (white stays on top) so the stuck edge is in the middle layer at the FRONT-RIGHT.', button: "It's at the front-right", next: 's3-pop' },
  { kind: 'sequence', id: 's3-pop', hold: S3_HOLD, step: 's3-where', counters: [edges], name: 'Pop it out', intro: 'This pushes the stuck edge down so you can insert it properly.', chunks: [chunk('Push it down', 'Bottom left, right down, bottom right, right up', "D' R' D R"), chunk('Close it with the front', 'Bottom right, front clockwise, bottom left, front back', "D F D' F'")], checkpoint: { title: 'The stuck edge should now be in the BOTTOM layer', body: 'Grey = any color.', yes: { label: 'Yes, it matches', next: 's3-where' } } },
  { kind: 'adjust', id: 's3-align', hold: S3_HOLD, step: 's3-where', counters: [edges], move: 'D', title: "Turn the BOTTOM layer until the edge's side color matches the center ABOVE it.", body: 'One click at a time, either direction. Only the bottom layer moves.', button: 'It matches now', next: 's3-face', demoAfter: (d) => turnUntil(d, 'D', bottomEdgeAligned) },
  { kind: 'info', id: 's3-face', hold: S3_HOLD, step: 's3-where', counters: [edges], title: 'Turn the whole cube (white stays on top) so that edge is right in front of you, at the bottom.', body: 'Skip this if it already is.', button: "It's in front of me", next: 's3-dir', demoAfter: (d) => turnUntil(d, 'y', bottomEdgeAlignedAtFront) },
  {
    kind: 'choice', id: 's3-dir', hold: S3_HOLD, step: 's3-where', counters: [edges],
    title: "Look at the edge's OTHER color (the one facing down). Which center does it match?",
    options: [
      { label: 'The RIGHT center', detail: 'The edge goes up and to the right.', picture: cube(s3Right, 'bottom'), demo: s3Right, next: 's3-right' },
      { label: 'The LEFT center', detail: 'The edge goes up and to the left.', picture: cube(s3Left, 'bottom'), demo: s3Left, next: 's3-left' },
    ],
  },
  { kind: 'sequence', id: 's3-right', hold: S3_HOLD, step: 's3-where', counters: [edges], name: 'Insert right', chunks: [chunk('Open the right slot', 'Bottom left, right down, bottom right, right up', "D' R' D R"), chunk('Close it with the front', 'Bottom right, front clockwise, bottom left, front back', "D F D' F'")], checkpoint: insertChecks },
  { kind: 'sequence', id: 's3-left', hold: S3_HOLD, step: 's3-where', counters: [edges], name: 'Insert left', chunks: [chunk('Open the left slot', 'Bottom right, left down, bottom left, left up', "D L D' L'"), chunk('Close it with the front', 'Bottom left, front back, bottom right, front clockwise', "D' F' D F")], checkpoint: insertChecks },
  { kind: 'finish', id: 's3-done', hold: S3_HOLD, step: 's3-where', counters: [edges], title: 'First two layers complete!', body: 'The white layer and the middle layer are solved. Only the yellow side is left.', picture: cube(() => scenario(S3_HOLD, (f, r) => f === 'top' || (isSide(f) && r <= 1))) },
]);

// ============================================================ Stage 4 (yellow back on top)
const S4_HOLD: Hold = 'yellow-top';
const f2l: VisRule = (f, r) => f === 'bottom' || (isSide(f) && r >= 1);
const s4Rule: VisRule = (f, r, c) => f2l(f, r, c) || (f === 'top' && isEdgeSticker(r, c));
const flipTop = (d: Demo, sides: number[]) =>
  sides.reduce((acc, i) => flipEdge(acc, ([['top', 2, 1], ['top', 1, 2], ['top', 0, 1], ['top', 1, 0]] as StickerRef[])[i], ([['front', 0, 1], ['right', 0, 1], ['back', 0, 1], ['left', 0, 1]] as StickerRef[])[i]), d);
const s4Dot = () => flipTop(scenario(S4_HOLD, s4Rule), [0, 1, 2, 3]);
const s4L = () => applyStep(flipTop(scenario(S4_HOLD, s4Rule), [0, 1]), 'U'); // L, turned away from back-left
const s4Line = () => applyStep(flipTop(scenario(S4_HOLD, s4Rule), [0, 2]), 'U'); // line, front-back
const s4Cross = () => scenario(S4_HOLD, s4Rule);
const times4: CounterDisplay = { key: 'times', label: 'Times done', until: 'keep going until you see a yellow cross' };
const ALG4 = [chunk('Open', 'Front clockwise', 'F'), chunk('Sledgehammer', 'Right up, top left, right down, top right', "R U R' U'"), chunk('Close', 'Front back', "F'")];
const seq4 = (id: string, expected: string, next: string): FlowNode => ({
  kind: 'sequence', id, hold: S4_HOLD, step: 's4-pattern', counters: [times4], name: 'Yellow cross move', chunks: ALG4, onDone: { add: ['times'] },
  checkpoint: { title: `Your top should now show ${expected}`, body: 'Like the picture — look only at the yellow edges (grey = any color).', yes: { label: 'Yes, it matches', next } },
});
const flip4 = 'FLIP YOUR CUBE BACK: yellow goes on TOP again.';

const stage4 = flow(4, 's4-flip', [
  { kind: 'info', id: 's4-flip', hold: S4_HOLD, step: 's4-flip', loudFlip: flip4, title: 'Flip the cube back over: YELLOW on top, WHITE on the bottom.', body: 'The first two layers are now on the bottom. Everything in this stage happens on the yellow top.', demo: s4Dot, button: "I've flipped it", next: 's4-pattern' },
  {
    kind: 'choice', id: 's4-pattern', hold: S4_HOLD, step: 's4-pattern', counters: [times4],
    title: 'Look at the yellow top. Ignore the corners. Which picture matches?',
    options: [
      { label: 'Dot', detail: 'Only the yellow center', picture: { kind: 'pattern', pattern: 'dot' }, demo: s4Dot, next: 's4-dot' },
      { label: 'L-shape', detail: '2 yellow edges next to each other', picture: { kind: 'pattern', pattern: 'l' }, demo: s4L, next: 's4-align-l' },
      { label: 'Line', detail: '2 yellow edges on opposite sides', picture: { kind: 'pattern', pattern: 'line' }, demo: s4Line, next: 's4-align-line' },
      { label: 'Cross', detail: 'All 4 yellow edges', picture: { kind: 'pattern', pattern: 'cross' }, demo: s4Cross, next: 's4-done' },
    ],
  },
  seq4('s4-dot', 'an L-shape', 's4-align-l'),
  { kind: 'adjust', id: 's4-align-l', hold: S4_HOLD, step: 's4-pattern', counters: [times4], move: 'U', title: 'Turn the TOP layer until the L points to the BACK and the LEFT.', body: 'Like a backwards L: yellow at the back edge and the left edge.', button: "It's like the picture", next: 's4-l', demoAfter: (d) => turnUntil(d, 'U', (s) => lAtBackLeft(s)) },
  seq4('s4-l', 'a LINE going left to right', 's4-align-line'),
  { kind: 'adjust', id: 's4-align-line', hold: S4_HOLD, step: 's4-pattern', counters: [times4], move: 'U', title: 'Turn the TOP layer until the line goes LEFT to RIGHT.', button: 'It goes left to right', next: 's4-line', demoAfter: (d) => turnUntil(d, 'U', (s) => lineLeftRight(s)) },
  seq4('s4-line', 'a yellow CROSS', 's4-done'),
  { kind: 'finish', id: 's4-done', hold: S4_HOLD, step: 's4-pattern', counters: [times4], title: 'Yellow cross complete!', body: 'All 4 yellow edges face up. The corners can still be any color.', picture: { kind: 'pattern', pattern: 'cross' } },
]);

// ============================================================ Stage 5
const S5_HOLD: Hold = 'yellow-top';
const s5Rule: VisRule = (f, r, c) => s4Rule(f, r, c) || (isSide(f) && r === 0 && c === 1);
const SUNE = "R U R' U R U2 R'";
const s5Adjacent = () => applyStep(scenario(S5_HOLD, s5Rule, inv(`${SUNE} U`)), 'U');
const s5Opposite = () => scenario(S5_HOLD, s5Rule, inv(`${SUNE} U`) + ' ' + inv(`${SUNE} U`));
const times5: CounterDisplay = { key: 'times', label: 'Times done', until: 'keep going until all 4 edges match' };
const SUNE_CHUNKS = [chunk('Lift', 'Right up, top left, right down', "R U R'"), chunk('Turn', 'Top left', 'U'), chunk('Lift twice', 'Right up, top twice, right down', "R U2 R'")];

const stage5 = flow(5, 's5-align', [
  { kind: 'adjust', id: 's5-align', hold: S5_HOLD, step: 's5-align', counters: [times5], move: 'U', demo: s5Adjacent, title: 'Turn the TOP layer until as many yellow edges as possible match the side center below them.', body: 'You can always get at least 2 to match.', button: 'Done turning', next: 's5-count', demoAfter: maxMatchTurn },
  {
    kind: 'choice', id: 's5-count', hold: S5_HOLD, step: 's5-align', counters: [times5],
    title: 'How many top edges match their side center now?',
    options: [
      { label: 'All 4', picture: cube(() => scenario(S5_HOLD, s5Rule)), next: 's5-done' },
      { label: '2, next to each other', picture: cube(() => maxMatchTurn(s5Adjacent())), next: 's5-face' },
      { label: '2, opposite each other', picture: cube(() => maxMatchTurn(s5Opposite())), demo: () => maxMatchTurn(s5Opposite()), next: 's5-opposite' },
      { label: 'Fewer than 2', detail: 'Keep turning the top — one of the 4 positions always gives at least 2.', next: 's5-align' },
    ],
  },
  { kind: 'info', id: 's5-face', hold: S5_HOLD, step: 's5-align', counters: [times5], title: 'Turn the whole cube (yellow stays on top) so the 2 matching edges are at the BACK and on the RIGHT.', button: "They're at the back and right", next: 's5-sune', demoAfter: (d) => turnUntil(d, 'y', pairAtBackRight) },
  { kind: 'sequence', id: 's5-sune', hold: S5_HOLD, step: 's5-align', counters: [times5], name: 'Edge swap', chunks: SUNE_CHUNKS, onDone: { add: ['times'] }, checkpoint: { title: 'Your top edges should look like THIS now', body: "They don't line up yet — that's the next step. (Grey = any color.)", yes: { label: 'Yes, it matches', next: 's5-final' } } },
  { kind: 'sequence', id: 's5-opposite', hold: S5_HOLD, step: 's5-align', counters: [times5], name: 'Edge swap', intro: 'With 2 opposite edges matching, do the move once from here, then look again.', chunks: SUNE_CHUNKS, onDone: { add: ['times'] }, checkpoint: { title: 'Your top edges should look like THIS now', body: '(Grey = any color.)', yes: { label: 'Yes — look again', next: 's5-align' } } },
  { kind: 'adjust', id: 's5-final', hold: S5_HOLD, step: 's5-align', counters: [times5], move: 'U', title: 'Turn the TOP layer until all 4 edges match their side centers.', button: 'All 4 match', next: 's5-done', demoAfter: (d) => turnUntil(d, 'U', (s) => edgeMatches(s).every(Boolean)) },
  { kind: 'finish', id: 's5-done', hold: S5_HOLD, step: 's5-align', counters: [times5], title: 'Yellow edges matched!', body: 'Every top edge matches the side center below it.', picture: cube(() => scenario(S5_HOLD, s5Rule)) },
]);

// ============================================================ Stage 6
const S6_HOLD: Hold = 'yellow-top';
const ALG6 = "U R U' L' U R' U' L";
const s6One = () => applyStep(scenario(S6_HOLD, showAll, inv(ALG6)), 'y');
const s6None = () => scenario(S6_HOLD, showAll, `${inv(ALG6)} y ${inv(ALG6)}`);
const times6: CounterDisplay = { key: 'times', label: 'Times done', until: 'keep going until all 4 corners are in their spots' };
const ALG6_CHUNKS = [chunk('First half', 'Top left, right up, top right, left up', "U R U' L'"), chunk('Second half', 'Top left, right down, top right, left down', "U R' U' L")];

const stage6 = flow(6, 's6-check', [
  {
    kind: 'choice', id: 's6-check', hold: S6_HOLD, step: 's6-check', counters: [times6],
    title: "Look at the 4 top corners. A corner is in its spot if its 3 colors match the 3 centers around it (it's OK if it's twisted). How many are in their spots?",
    options: [
      { label: 'All 4', picture: cube(() => scenario(S6_HOLD, showAll)), next: 's6-done' },
      { label: 'Exactly 1', picture: cube(s6One), demo: s6One, next: 's6-face' },
      { label: 'None', picture: cube(s6None), demo: s6None, next: 's6-any' },
    ],
  },
  { kind: 'info', id: 's6-face', hold: S6_HOLD, step: 's6-check', counters: [times6], title: 'Turn the whole cube (yellow stays on top) so the correct corner is at the FRONT-RIGHT, on top.', button: "It's at the front-right", next: 's6-keep', demoAfter: (d) => turnUntil(d, 'y', frontRightCornerInSpot) },
  {
    kind: 'sequence', id: 's6-keep', hold: S6_HOLD, step: 's6-check', counters: [times6], name: 'Corner swap', intro: 'Keep the correct corner at the front-right the whole time.', chunks: ALG6_CHUNKS, onDone: { add: ['times'] },
    checkpoint: {
      title: 'Are all 4 top corners in their spots now?', body: 'Each corner\'s 3 colors match the 3 centers around it (twisted is OK).', goal: cube(() => scenario(S6_HOLD, showAll)),
      yes: { label: 'Yes, all 4', next: 's6-done' },
      notYet: { label: 'Not yet — do it again', next: 's6-keep' },
    },
  },
  { kind: 'sequence', id: 's6-any', hold: S6_HOLD, step: 's6-check', counters: [times6], name: 'Corner swap', intro: 'No corner is in its spot yet, so do this once from any position.', chunks: ALG6_CHUNKS, onDone: { add: ['times'] }, checkpoint: { title: 'Now check your corners again', body: 'At least one corner will usually be in its spot now.', yes: { label: 'Check my corners', next: 's6-check' } } },
  { kind: 'finish', id: 's6-done', hold: S6_HOLD, step: 's6-check', counters: [times6], title: 'Corners in place!', body: 'All 4 top corners are in their spots. Some may still be twisted — that is the last stage.', picture: cube(() => scenario(S6_HOLD, showAll)) },
]);

// ============================================================ Stage 7 (flipped: yellow on the bottom)
const S7_HOLD: Hold = 'white-top';
const TWIST = "R U R' U'";
const s7Start = () => twistCorner(twistCorner(scenario(S7_HOLD, showAll), FRONT_RIGHT_BOTTOM, 1), FRONT_LEFT_BOTTOM, 2);
const s7Goal = () => scenario(S7_HOLD, () => false, '', FRONT_RIGHT_BOTTOM);
const twisted: CounterDisplay = { key: 'twisted', label: 'Corners done', of: 4 };
const twistRepeats: CounterDisplay = { key: 'repeats', label: 'Repeats on THIS corner', until: 'usually 2 or 4' };
const afterTwist = (c: Counters) => ((c.twisted ?? 0) >= 4 ? 's7-final' : 's7-next');
const flip7 = 'FLIP YOUR CUBE NOW: yellow goes on the BOTTOM, white on top.';
const MIXED = "Cube looks mixed up? That's normal — keep going, it fixes itself.";

const stage7 = flow(7, 's7-flip', [
  { kind: 'info', id: 's7-flip', hold: S7_HOLD, step: 's7-flip', loudFlip: flip7, view: 'bottom', title: 'Flip the cube upside down: YELLOW on the bottom, WHITE on top.', body: "From now on, don't turn the whole cube — only the layers the guide shows.", demo: s7Start, button: "I've flipped it", next: 's7-start' },
  {
    kind: 'choice', id: 's7-start', hold: S7_HOLD, step: 's7-start', counters: [twisted], view: 'bottom',
    title: 'Turn ONLY the bottom layer until a corner whose yellow is NOT facing down is at the FRONT-RIGHT, bottom.',
    options: [
      { label: "Done — it's at the front-right", picture: cube(s7Start, 'bottom'), next: 's7-twist' },
      { label: 'Every bottom corner already has yellow facing down', next: 's7-final' },
    ],
  },
  {
    kind: 'sequence', id: 's7-twist', hold: S7_HOLD, step: 's7-start', counters: [twisted, twistRepeats], view: 'bottom', name: 'Corner twist', chunks: [chunk('Corner twist', 'Right up, top left, right down, top right', TWIST)], onDone: { add: ['repeats'] },
    reassure: (c) => ((c.repeats ?? 0) >= 1 ? MIXED : undefined),
    checkpoint: {
      title: "Is the FRONT-RIGHT-BOTTOM corner's yellow facing DOWN now?", body: 'Only this corner matters. The rest looking mixed up is normal.', goal: cube(s7Goal, 'bottom'),
      yes: { label: 'Yes, yellow faces down', next: afterTwist, effect: { add: ['twisted'], reset: ['repeats'] } },
      notYet: { label: 'Not yet — repeat the twist', next: 's7-twist' },
    },
  },
  { kind: 'adjust', id: 's7-next', hold: S7_HOLD, step: 's7-next', counters: [twisted], view: 'bottom', move: 'D', title: 'Turn ONLY the BOTTOM layer one click to bring the next corner to the front-right.', body: "Don't turn the whole cube, and don't fix the top — it will sort itself out.", button: 'Done', next: 's7-next-check', demoAfter: (d) => applyStep(d, 'D') },
  {
    kind: 'choice', id: 's7-next-check', hold: S7_HOLD, step: 's7-next', counters: [twisted], view: 'bottom',
    title: "Is this front-right-bottom corner's yellow already facing DOWN?",
    options: [
      { label: "No — twist it", picture: cube(s7Start, 'bottom'), next: 's7-twist' },
      { label: 'Yes — already solved, skip it', picture: cube(s7Goal, 'bottom'), next: afterTwist, effect: { add: ['twisted'] } },
    ],
  },
  { kind: 'adjust', id: 's7-final', hold: S7_HOLD, step: 's7-final', counters: [twisted], view: 'bottom', move: 'D', title: 'Turn the BOTTOM layer until every side lines up.', button: "It's solved!", next: 's7-done', demoAfter: (d) => turnUntil(d, 'D', sidesAligned) },
  { kind: 'finish', id: 's7-done', hold: S7_HOLD, step: 's7-final', counters: [twisted], title: 'You solved the Rubik\'s Cube!', body: 'Every face is one color. Congratulations!', picture: cube(() => scenario(S7_HOLD, showAll)) },
]);

export const FOLLOW_ALONG: Record<number, StageFlow> = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7 };

// The algorithms the guide teaches, exported for tests.
export const ALGORITHMS = { SLEDGE, INSERT_RIGHT, INSERT_LEFT, SUNE, ALG6, TWIST, ALG4: "F R U R' U' F'" };

export const resolveTarget = (t: Target, c: Counters) => (typeof t === 'function' ? t(c) : t);

export const sequenceMoves = (node: Extract<FlowNode, { kind: 'sequence' }>) => node.chunks.flatMap((ch) => ch.moves);

export const applyEffect = (c: Counters, e?: Effect): Counters => {
  if (!e) return c;
  const next = { ...c };
  e.add?.forEach((k) => { next[k] = (next[k] ?? 0) + 1; });
  e.reset?.forEach((k) => { next[k] = 0; });
  return next;
};

export const startDemo = (flowDef: StageFlow): Demo => {
  const first = flowDef.nodes[flowDef.start];
  if ('demo' in first && first.demo) return first.demo();
  return scenario(first.hold, showAll);
};


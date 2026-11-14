import type { MoveName } from '@/hooks/useCubeState';
import {
  applyStep, flipEdge, frontRightCornerInSpot, isEdgeSticker, isSide, lAtBackLeft, lineLeftRight, maxMatchTurn,
  pairAtBackRight, petalMatched, petalMatchedAtFront, scenario, showAll, sidesAligned, turnUntil, twistCorner,
  whiteCornerOverFrontRight, whiteCornerOverSlot, edgeMatches, topEdgeAligned, topEdgeAlignedAtFront, yellowTopOnly,
  FRONT_RIGHT_BOTTOM, FRONT_RIGHT_TOP, FRONT_LEFT_TOP, type Demo, type Hold, type VisRule, type StickerRef,
} from '@/lib/cubeDemo';
import { chantFor, invertSequence, parseMoves } from '@/lib/moves';

// Bump when screens change shape, so a place saved under an older guide is not restored into this one.
export const FLOW_VERSION = 4;

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

export type Picture =
  | { kind: 'cube'; demo: () => Demo; view?: 'top' | 'bottom' }
  // the top face only, flat, drawn from a simulated cube (Stage 4: which top stickers are yellow)
  | { kind: 'topface'; demo: () => Demo }
  // looking straight down at the top, with the side colors around it; ticks mark what matches
  | { kind: 'top'; demo: () => Demo; marks: 'edges' | 'corners' };

export interface Chunk { name: string; phrase: string; moves: MoveName[] }

interface Base {
  id: string;
  hold: Hold;
  step: string; // node a "Restart this step" returns to
  counters?: CounterDisplay[];
  view?: 'top' | 'bottom';
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
  goal?: Picture; // a fixed goal picture; otherwise the simulated cube after the moves
  flat?: boolean; // draw that simulated cube as a flat top face (when only the top matters)
  alsoBelow?: boolean; // add a second view from underneath, so the bottom face can be checked too
  yes: { label: string; next: Target; effect?: Effect };
  notYet?: { label: string; next: Target; effect?: Effect };
}

export type FlowNode =
  | (Base & { kind: 'info'; title: string; body?: string; demo?: () => Demo; button: string; next: Target; effect?: Effect; demoAfter?: (d: Demo) => Demo })
  // "tap the picture that looks like yours"; `help` is the 3 checks shown for "None of these / I'm not sure"
  | (Base & { kind: 'choice'; title: string; body?: string; options: ChoiceOption[]; help: string[] })
  // "turn until it lines up". The picture shows the finished position (demoAfter), still, unless
  // showGoal is false (a single click of a layer, shown as an ordinary move). `flat` draws it as a flat top face.
  | (Base & { kind: 'adjust'; title: string; body?: string; move: MoveName; demo?: () => Demo; flat?: boolean; showGoal?: boolean; button: string; next: Target; demoAfter: (d: Demo) => Demo })
  | (Base & { kind: 'sequence'; name: string; intro?: string; chunks: Chunk[]; demo?: () => Demo; onDone?: Effect; repeat?: CounterKey; reassure?: (c: Counters) => string | undefined; checkpoint: Checkpoint })
  | (Base & { kind: 'finish'; title: string; body: string; picture: Picture });

// One line per stage: the whole method in seven sentences, plus the named set of turns it uses.
export interface StageSummary { stage: number; rule: string; move?: { name: string; chant: string; notation: string; note?: string } }

// `display` is applied to every cube picture of the stage just before it is drawn.
export interface StageFlow { stageId: number; start: string; nodes: Record<string, FlowNode>; display?: (d: Demo) => Demo }

const m = parseMoves;
const inv = (seq: string) => invertSequence(parseMoves(seq)).join(' ');
// The chant words come from the move table, so words and letters cannot disagree.
const chunk = (name: string, moves: string): Chunk => ({ name, phrase: chantFor(m(moves)), moves: m(moves) });
const flow = (stageId: number, start: string, list: FlowNode[], display?: (d: Demo) => Demo): StageFlow => ({
  stageId, start, nodes: Object.fromEntries(list.map((n) => [n.id, n])), display,
});
const cube = (demo: () => Demo, view?: 'top' | 'bottom'): Picture => ({ kind: 'cube', demo, view });
const topFace = (demo: () => Demo): Picture => ({ kind: 'topface', demo });
const topView = (demo: () => Demo, marks: 'edges' | 'corners'): Picture => ({ kind: 'top', demo, marks });

// Yellow stays on top and white on the bottom for the whole solve: the cube is never flipped.
const HOLD: Hold = 'yellow-top';
const GREY_RULE = 'Dark grey stickers can be any color. Only check the colored ones.';

// ============================================================ Stage 1
const s1 = (setup: string) => () => scenario(HOLD, () => false, setup, [['bottom', 0, 1], ['front', 2, 1]]);
const S1_CASES = {
  petalUp: s1("F2 U'"),
  sideTop: s1("F2 U' F R' F' R"),
  middleFacing: s1("F2 R U' R'"),
  middleRight: s1("F2 U F' U' F"),
  bottomDown: () => scenario(HOLD, () => false, "R2 U F2 U' R2", [['bottom', 1, 2], ['right', 2, 1]]),
  flipped: s1("F2 U' R' F R"),
  correct: s1(''),
};
const petals: CounterDisplay = { key: 'petals', label: 'White edges done', of: 4 };
const afterPetal = (c: Counters) => ((c.petals ?? 0) >= 4 ? 's1-done' : 's1-where');
const liftCheckpoint = (next = 's1-align'): Checkpoint => ({
  title: 'Your white edge should now be on TOP, white facing UP',
  body: `The white sticker is on the top, next to the yellow center. ${GREY_RULE}`,
  yes: { label: 'Yes, it matches', next },
});

const stage1 = flow(1, 's1-where', [
  {
    kind: 'choice', id: 's1-where', hold: HOLD, step: 's1-where', counters: [petals],
    title: 'Find a white EDGE piece (2 colors) that is not done. Tap the picture like yours.',
    options: [
      { label: 'Top: white facing UP', picture: cube(S1_CASES.petalUp), demo: S1_CASES.petalUp, next: 's1-align' },
      { label: 'Top: white sideways', picture: cube(S1_CASES.sideTop), demo: S1_CASES.sideTop, next: 's1-side-face' },
      { label: 'Middle row', picture: cube(S1_CASES.middleFacing), demo: S1_CASES.middleFacing, next: 's1-middle' },
      { label: 'Bottom: white DOWN, wrong place', picture: cube(S1_CASES.bottomDown, 'bottom'), demo: S1_CASES.bottomDown, next: 's1-bottom-face' },
      { label: 'Bottom: white sideways', picture: cube(S1_CASES.flipped), demo: S1_CASES.flipped, next: 's1-flipped-face' },
      { label: 'Bottom: done, count it', picture: cube(S1_CASES.correct, 'bottom'), next: afterPetal, effect: { add: ['petals'] } },
    ],
    help: [
      'Hold your cube with the YELLOW center on top and the WHITE center on the bottom. Centers are the middle sticker of each side and never move.',
      'An EDGE piece has 2 colors and sits between two corners. Find one that has a white sticker and is not finished yet.',
      'Is it in the top row, the middle row or the bottom row? Then: which way does its white sticker face? Tap the picture that shows the same.',
    ],
  },
  // top row, white facing the side
  { kind: 'info', id: 's1-side-face', hold: HOLD, step: 's1-where', counters: [petals], title: 'Turn your whole cube (yellow stays on top) so this edge is at the top, right in front of you.', body: 'Its white sticker should face you.', button: "It's in front of me", next: 's1-side-seq' },
  { kind: 'sequence', id: 's1-side-seq', hold: HOLD, step: 's1-where', counters: [petals], name: 'Flip it up', chunks: [chunk('Flip it up', "R' F R F'")], checkpoint: liftCheckpoint() },
  // middle row
  {
    kind: 'choice', id: 's1-middle', hold: HOLD, step: 's1-where', counters: [petals],
    title: 'Turn your whole cube so the edge is in the middle row at the FRONT-RIGHT. Which way does its white sticker face?',
    options: [
      { label: 'Toward me', picture: cube(S1_CASES.middleFacing), demo: S1_CASES.middleFacing, next: 's1-middle-facing' },
      { label: 'To the right', picture: cube(S1_CASES.middleRight), demo: S1_CASES.middleRight, next: 's1-middle-right' },
    ],
    help: [
      'Keep yellow on top. Turn your whole cube like a spinning top until the white edge is on the right-hand side of the face looking at you.',
      'The edge has two stickers: one on the front face and one on the right face.',
      'Which of those two stickers is white? Front = "Toward me". Right face = "To the right".',
    ],
  },
  { kind: 'sequence', id: 's1-middle-facing', hold: HOLD, step: 's1-where', counters: [petals], name: 'Lift it out', chunks: [chunk('Lift it out', "R U R'")], checkpoint: liftCheckpoint() },
  { kind: 'sequence', id: 's1-middle-right', hold: HOLD, step: 's1-where', counters: [petals], name: 'Lift it out', chunks: [chunk('Lift it out', "F' U F")], checkpoint: liftCheckpoint() },
  // bottom row, white down but wrong side color
  { kind: 'info', id: 's1-bottom-face', hold: HOLD, step: 's1-where', counters: [petals], title: 'Turn your whole cube (yellow stays on top) so this edge is at the bottom, right in front of you.', button: "It's in front of me", next: 's1-bottom-seq' },
  { kind: 'sequence', id: 's1-bottom-seq', hold: HOLD, step: 's1-where', counters: [petals], name: 'Bring it up', chunks: [chunk('Bring it up', 'F2')], checkpoint: liftCheckpoint() },
  // bottom row, white on the side
  { kind: 'info', id: 's1-flipped-face', hold: HOLD, step: 's1-where', counters: [petals], title: 'Turn your whole cube (yellow stays on top) so this edge is at the bottom, right in front of you.', body: 'Its white sticker should face you.', button: "It's in front of me", next: 's1-flipped-seq' },
  { kind: 'sequence', id: 's1-flipped-seq', hold: HOLD, step: 's1-where', counters: [petals], name: 'Flip it up', chunks: [chunk('Flip it up', "R' F' R")], checkpoint: liftCheckpoint() },
  // shared: line it up, face it, drop it
  { kind: 'adjust', id: 's1-align', hold: HOLD, step: 's1-where', counters: [petals], move: 'U', title: "Turn the TOP layer until the white edge's side color sits above the center of the same color.", body: 'One click at a time. Only the top layer moves.', button: 'It matches now', next: 's1-face', demoAfter: (d) => turnUntil(d, 'U', petalMatched) },
  { kind: 'info', id: 's1-face', hold: HOLD, step: 's1-where', counters: [petals], title: 'Turn your whole cube (yellow stays on top) so that white edge is right in front of you.', body: 'Skip this if it already is.', button: "It's in front of me", next: 's1-drop', demoAfter: (d) => turnUntil(d, 'y', petalMatchedAtFront) },
  {
    kind: 'sequence', id: 's1-drop', hold: HOLD, step: 's1-where', counters: [petals], view: 'bottom', name: 'Drop it in', chunks: [chunk('Drop it in', 'F2')],
    checkpoint: { title: 'The white edge is now on the BOTTOM, white facing down', body: 'Seen from below. Its side color matches the center above it.', yes: { label: 'Yes, it matches', next: afterPetal, effect: { add: ['petals'] } } },
  },
  { kind: 'finish', id: 's1-done', hold: HOLD, step: 's1-where', counters: [petals], view: 'bottom', title: 'White cross complete!', body: 'All 4 white edges are on the bottom, each matching the center above it.', picture: cube(() => scenario(HOLD, (f, r, c) => f === 'bottom' ? isEdgeSticker(r, c) : isSide(f) && r === 2 && c === 1), 'bottom') },
]);

// ============================================================ Stage 2
const whiteCross: VisRule = (f, r, c) => (f === 'bottom' && isEdgeSticker(r, c)) || (isSide(f) && r === 2 && c === 1);
const FRB_TARGET: StickerRef[] = [['bottom', 0, 2], ['front', 2, 2], ['right', 2, 0]];
const SLEDGE = "R U R' U'";
const s2Top = () => scenario(HOLD, whiteCross, `${inv(SLEDGE)} U`, FRB_TARGET);
const s2Wrong = () => twistCorner(scenario(HOLD, whiteCross, '', FRB_TARGET), FRONT_RIGHT_BOTTOM, 1);
const s2Goal = () => scenario(HOLD, whiteCross, '', FRB_TARGET);
const corners: CounterDisplay = { key: 'corners', label: 'Corners done', of: 4 };
const afterCorner = (c: Counters) => ((c.corners ?? 0) >= 4 ? 's2-done' : 's2-where');

const stage2 = flow(2, 's2-where', [
  {
    kind: 'choice', id: 's2-where', hold: HOLD, step: 's2-where', counters: [corners],
    title: 'Find a white CORNER piece (3 colors) that is not done. Tap the picture like yours.',
    options: [
      { label: 'In the top row', picture: cube(s2Top), demo: s2Top, next: 's2-align' },
      { label: 'In the bottom row, but wrong', picture: cube(s2Wrong), demo: s2Wrong, next: 's2-wrong-face' },
      { label: 'Done, count it', detail: 'White down, sides match', picture: cube(s2Goal), next: afterCorner, effect: { add: ['corners'] } },
    ],
    help: [
      'Hold yellow on top and white on the bottom. Your white cross is on the bottom.',
      'A CORNER piece has 3 colors. Look around the top row and the bottom row for a corner with a white sticker.',
      'A corner is finished only when its white faces DOWN and its two side colors match the centers next to them. If it is not finished, is it in the top row or the bottom row?',
    ],
  },
  { kind: 'info', id: 's2-wrong-face', hold: HOLD, step: 's2-where', counters: [corners], title: 'Turn your whole cube (yellow stays on top) so that corner is at the FRONT-RIGHT, on the bottom.', button: "It's at the front-right", next: 's2-pop' },
  { kind: 'sequence', id: 's2-pop', hold: HOLD, step: 's2-where', counters: [corners], name: 'Pop it out', intro: 'These 4 turns lift the corner up to the top row.', chunks: [chunk('Pop it out', SLEDGE)], checkpoint: { title: 'That corner is now in the TOP row', body: 'The second picture is the bottom: your white cross is still there.', alsoBelow: true, yes: { label: 'Yes, it matches', next: 's2-align' } } },
  { kind: 'adjust', id: 's2-align', hold: HOLD, step: 's2-where', counters: [corners], move: 'U', title: 'Turn the TOP layer until the white corner sits right above its home.', body: 'Its home is between the two centers that match its two other colors.', button: "It's above its home", next: 's2-face', demoAfter: (d) => turnUntil(d, 'U', whiteCornerOverSlot) },
  { kind: 'info', id: 's2-face', hold: HOLD, step: 's2-where', counters: [corners], title: 'Turn your whole cube (yellow stays on top) so that corner is at the FRONT-RIGHT, on top.', body: 'Skip this if it already is.', button: "It's at the front-right", next: 's2-sledge', demoAfter: (d) => turnUntil(d, 'y', whiteCornerOverFrontRight) },
  {
    kind: 'sequence', id: 's2-sledge', hold: HOLD, step: 's2-where', counters: [corners], name: 'Sledgehammer', repeat: 'repeats',
    intro: 'These 4 turns are called the Sledgehammer. Say the words as you turn.',
    chunks: [chunk('Sledgehammer', SLEDGE)], onDone: { add: ['repeats'] },
    checkpoint: {
      title: 'Is your corner done, like these pictures?', body: 'White down, both side colors matching. It takes 1, 3 or 5 goes.', goal: cube(s2Goal), alsoBelow: true,
      yes: { label: 'Yes, it matches', next: afterCorner, effect: { add: ['corners'], reset: ['repeats'] } },
      notYet: { label: 'Not yet — do the 4 turns again', next: 's2-sledge' },
    },
  },
  { kind: 'finish', id: 's2-done', hold: HOLD, step: 's2-where', counters: [corners], view: 'bottom', title: 'Bottom layer complete!', body: 'The whole white face is done, and the bottom row of every side matches its center.', picture: cube(() => scenario(HOLD, (f, r) => f === 'bottom' || (isSide(f) && r === 2)), 'bottom') },
]);

// ============================================================ Stage 3 (yellow still on top: edges go in from the top row)
const bottomLayer: VisRule = (f, r) => f === 'bottom' || (isSide(f) && r === 2);
const INSERT_RIGHT = "U R U' R' U' F' U F";
const INSERT_LEFT = "U' L' U L U F U' F'";
const FR_EDGE: StickerRef[] = [['front', 1, 2], ['right', 1, 0]];
const FL_EDGE: StickerRef[] = [['front', 1, 0], ['left', 1, 2]];
const s3Right = () => scenario(HOLD, bottomLayer, inv(INSERT_RIGHT), FR_EDGE);
const s3Left = () => scenario(HOLD, bottomLayer, inv(INSERT_LEFT), FL_EDGE);
const s3Found = () => applyStep(s3Right(), 'U');
const s3Stuck = () => flipEdge(scenario(HOLD, bottomLayer, '', FR_EDGE), FR_EDGE[0], FR_EDGE[1]);
const s3Solved = () => scenario(HOLD, bottomLayer, '', FR_EDGE);
const edges: CounterDisplay = { key: 'edges', label: 'Edges done', of: 4 };
const afterEdge = (c: Counters) => ((c.edges ?? 0) >= 4 ? 's3-done' : 's3-where');
const RIGHT_CHUNKS = [chunk('Push it away', "U R U' R'"), chunk('Bring it home', "U' F' U F")];
const LEFT_CHUNKS = [chunk('Push it away', "U' L' U L"), chunk('Bring it home', "U F U' F'")];
const insertChecks: Checkpoint = { title: 'The edge is in the middle row, and the bottom is still all white', body: 'The small picture is your white bottom, seen from below.', alsoBelow: true, yes: { label: 'Yes, it matches', next: afterEdge, effect: { add: ['edges'] } } };

const stage3 = flow(3, 's3-where', [
  {
    kind: 'choice', id: 's3-where', hold: HOLD, step: 's3-where', counters: [edges],
    title: 'In the TOP row, find an EDGE piece with NO yellow on it.',
    options: [
      { label: 'Found one', picture: cube(s3Found), demo: s3Found, next: 's3-align' },
      { label: 'None: all 4 top edges have yellow', picture: cube(s3Stuck), demo: s3Stuck, next: 's3-stuck-face' },
      { label: 'A middle edge is done, count it', picture: cube(s3Solved), next: afterEdge, effect: { add: ['edges'] } },
    ],
    help: [
      'Keep yellow on top and white on the bottom. The bottom row is finished. You are filling the 4 edges of the middle row.',
      'Look at the 4 edge pieces in the TOP row (the ones touching the yellow center). Check both stickers of each one for yellow.',
      'If one has no yellow, tap "Found one". If all 4 have yellow, a middle-row edge is in the wrong place: tap "None".',
    ],
  },
  { kind: 'info', id: 's3-stuck-face', hold: HOLD, step: 's3-where', counters: [edges], title: 'Turn your whole cube (yellow stays on top) so the stuck edge is in the middle row at the FRONT-RIGHT.', button: "It's at the front-right", next: 's3-pop' },
  { kind: 'sequence', id: 's3-pop', hold: HOLD, step: 's3-where', counters: [edges], name: 'Pop it out', intro: 'These 8 turns push the stuck edge up to the top row.', chunks: RIGHT_CHUNKS, checkpoint: { title: 'The stuck edge is now in the TOP row, and the bottom is still all white', alsoBelow: true, yes: { label: 'Yes, it matches', next: 's3-where' } } },
  { kind: 'adjust', id: 's3-align', hold: HOLD, step: 's3-where', counters: [edges], move: 'U', title: "Turn the TOP layer until the edge's side color sits above the center of the same color.", body: 'One click at a time. Only the top layer moves.', button: 'It matches now', next: 's3-face', demoAfter: (d) => turnUntil(d, 'U', topEdgeAligned) },
  { kind: 'info', id: 's3-face', hold: HOLD, step: 's3-where', counters: [edges], title: 'Turn your whole cube (yellow stays on top) so that edge is right in front of you, at the top.', body: 'Skip this if it already is.', button: "It's in front of me", next: 's3-dir', demoAfter: (d) => turnUntil(d, 'y', topEdgeAlignedAtFront) },
  {
    kind: 'choice', id: 's3-dir', hold: HOLD, step: 's3-where', counters: [edges],
    title: "Look at the edge's TOP sticker. Which side has a center of that color?",
    options: [
      { label: 'The RIGHT side', picture: cube(s3Right), demo: s3Right, next: 's3-right' },
      { label: 'The LEFT side', picture: cube(s3Left), demo: s3Left, next: 's3-left' },
    ],
    help: [
      'The edge is at the top, right in front of you. Its front sticker matches the center below it.',
      'Now look at its other sticker, the one facing UP. What color is it?',
      'Look at the center on your right and the center on your left. One of them is that color. Tap that side.',
    ],
  },
  { kind: 'sequence', id: 's3-right', hold: HOLD, step: 's3-where', counters: [edges], name: 'Insert right', intro: 'These 8 turns are called Insert right.', chunks: RIGHT_CHUNKS, checkpoint: insertChecks },
  { kind: 'sequence', id: 's3-left', hold: HOLD, step: 's3-where', counters: [edges], name: 'Insert left', intro: 'These 8 turns are called Insert left.', chunks: LEFT_CHUNKS, checkpoint: insertChecks },
  { kind: 'finish', id: 's3-done', hold: HOLD, step: 's3-where', counters: [edges], title: 'Two layers complete!', body: 'The bottom row and the middle row are done. Only the yellow top is left.', picture: cube(() => scenario(HOLD, (f, r) => f === 'bottom' || (isSide(f) && r >= 1))) },
]);

// ============================================================ Stage 4
const f2l: VisRule = (f, r) => f === 'bottom' || (isSide(f) && r >= 1);
const s4Rule: VisRule = (f, r, c) => f2l(f, r, c) || (f === 'top' && isEdgeSticker(r, c));
const flipTop = (d: Demo, sides: number[]) =>
  sides.reduce((acc, i) => flipEdge(acc, ([['top', 2, 1], ['top', 1, 2], ['top', 0, 1], ['top', 1, 0]] as StickerRef[])[i], ([['front', 0, 1], ['right', 0, 1], ['back', 0, 1], ['left', 0, 1]] as StickerRef[])[i]), d);
const s4Dot = () => flipTop(scenario(HOLD, s4Rule), [0, 1, 2, 3]);
const s4L = () => applyStep(flipTop(scenario(HOLD, s4Rule), [0, 1]), 'U'); // an L, not yet turned to the back-left
const s4Line = () => applyStep(flipTop(scenario(HOLD, s4Rule), [0, 2]), 'U'); // a line going front to back
const s4Cross = () => scenario(HOLD, s4Rule);
// what each shape looks like once it is turned the way the guide asks for it
const s4LGoal = () => turnUntil(s4L(), 'U', lAtBackLeft);
const s4LineGoal = () => turnUntil(s4Line(), 'U', lineLeftRight);
const times4: CounterDisplay = { key: 'times', label: 'Goes done', until: 'until you see a yellow cross' };
const ALG4 = [chunk('Open', 'F'), chunk('Sledgehammer', "R U R' U'"), chunk('Close', "F'")];
const seq4 = (id: string, title: string, next: string): FlowNode => ({
  kind: 'sequence', id, hold: HOLD, step: 's4-pattern', counters: [times4], name: 'Yellow cross turns', repeat: 'times',
  intro: 'A front turn, the Sledgehammer from Stage 2, then the front back.',
  chunks: ALG4, onDone: { add: ['times'] },
  checkpoint: { title, body: 'Look straight down at your top. Ignore the corners.', flat: true, yes: { label: 'Yes, it matches', next } },
});

const stage4 = flow(4, 's4-pattern', [
  {
    kind: 'choice', id: 's4-pattern', hold: HOLD, step: 's4-pattern', counters: [times4],
    title: 'Look down at the yellow top. Ignore the corners. Tap the picture like yours.',
    options: [
      { label: 'Dot', picture: topFace(s4Dot), demo: s4Dot, next: 's4-dot' },
      { label: 'L shape', picture: topFace(s4LGoal), demo: s4L, next: 's4-align-l' },
      { label: 'Line', picture: topFace(s4LineGoal), demo: s4Line, next: 's4-align-line' },
      { label: 'Cross', picture: topFace(s4Cross), demo: s4Cross, next: 's4-done' },
    ],
    help: [
      'Hold yellow on top. Look straight down at the top face, like reading a clock.',
      'Only look at 5 stickers: the middle one and the 4 edge stickers that touch it (a plus sign). Ignore the 4 corner stickers.',
      'Count how many of those 4 edge stickers are yellow: none = Dot, two = L or Line, four = Cross. Your picture may be turned a different way round. That is fine.',
    ],
  },
  seq4('s4-dot', 'Your top now shows an L shape', 's4-align-l'),
  { kind: 'adjust', id: 's4-align-l', hold: HOLD, step: 's4-pattern', counters: [times4], move: 'U', flat: true, title: 'Turn the TOP layer until the L sits at the BACK and the LEFT, like the picture.', body: 'Yellow at the far edge and the left edge.', button: "It's like the picture", next: 's4-l', demoAfter: (d) => turnUntil(d, 'U', (s) => lAtBackLeft(s)) },
  seq4('s4-l', 'Your top now shows a LINE going left to right', 's4-align-line'),
  { kind: 'adjust', id: 's4-align-line', hold: HOLD, step: 's4-pattern', counters: [times4], move: 'U', flat: true, title: 'Turn the TOP layer until the line goes LEFT to RIGHT, like the picture.', button: 'It goes left to right', next: 's4-line', demoAfter: (d) => turnUntil(d, 'U', (s) => lineLeftRight(s)) },
  seq4('s4-line', 'Your top now shows a yellow CROSS', 's4-done'),
  { kind: 'finish', id: 's4-done', hold: HOLD, step: 's4-pattern', counters: [times4], title: 'Yellow cross complete!', body: 'All 4 yellow edges face up. The corners can still be any color.', picture: topFace(s4Cross) },
], yellowTopOnly);

// ============================================================ Stage 5
const s5Rule: VisRule = (f, r, c) => s4Rule(f, r, c) || (isSide(f) && r === 0 && c === 1);
const SUNE = "R U R' U R U2 R'";
const s5Adjacent = () => applyStep(scenario(HOLD, s5Rule, inv(`${SUNE} U`)), 'U');
const s5Opposite = () => scenario(HOLD, s5Rule, inv(`${SUNE} U`) + ' ' + inv(`${SUNE} U`));
const times5: CounterDisplay = { key: 'times', label: 'Goes done', until: 'until all 4 edges match' };
const SUNE_CHUNKS = [chunk('Lift', "R U R'"), chunk('Turn', 'U'), chunk('Lift twice', "R U2 R'")];
const SUNE_INTRO = 'These 7 turns are called the Edge swap.';

const stage5 = flow(5, 's5-align', [
  { kind: 'adjust', id: 's5-align', hold: HOLD, step: 's5-align', counters: [times5], move: 'U', demo: s5Adjacent, title: 'Turn the TOP layer until 2 or more top edges sit above the center of the same color.', body: 'Try all 4 positions. One of them always works.', button: 'Done turning', next: 's5-count', demoAfter: maxMatchTurn },
  {
    kind: 'choice', id: 's5-count', hold: HOLD, step: 's5-align', counters: [times5],
    title: 'Looking down at the top. A tick = that edge matches the center under it. Tap the picture like yours.',
    options: [
      { label: 'All 4 match', picture: topView(() => scenario(HOLD, s5Rule), 'edges'), next: 's5-done' },
      { label: '2 match, side by side', picture: topView(() => maxMatchTurn(s5Adjacent()), 'edges'), next: 's5-face' },
      { label: '2 match, across', picture: topView(() => maxMatchTurn(s5Opposite()), 'edges'), demo: () => maxMatchTurn(s5Opposite()), next: 's5-opposite' },
    ],
    help: [
      'Hold yellow on top. Your yellow cross is on top.',
      'Each of the 4 top edges has a second sticker on the side of the cube. Does that sticker have the same color as the center just below it? That is a match.',
      'If fewer than 2 match, turn the TOP layer one click and look again. One of the 4 positions always gives 2 or 4 matches.',
    ],
  },
  { kind: 'info', id: 's5-face', hold: HOLD, step: 's5-align', counters: [times5], title: 'Turn your whole cube (yellow stays on top) so the 2 matching edges are at the BACK and on the RIGHT.', button: "They're at the back and right", next: 's5-sune', demoAfter: (d) => turnUntil(d, 'y', pairAtBackRight) },
  { kind: 'sequence', id: 's5-sune', hold: HOLD, step: 's5-align', counters: [times5], name: 'Edge swap', intro: SUNE_INTRO, repeat: 'times', chunks: SUNE_CHUNKS, onDone: { add: ['times'] }, checkpoint: { title: 'Your top edges look like this now', body: 'They do not line up yet. That is the next step.', yes: { label: 'Yes, it matches', next: 's5-final' } } },
  { kind: 'sequence', id: 's5-opposite', hold: HOLD, step: 's5-align', counters: [times5], name: 'Edge swap', intro: `${SUNE_INTRO} Do it once from here, then look again.`, repeat: 'times', chunks: SUNE_CHUNKS, onDone: { add: ['times'] }, checkpoint: { title: 'Your top edges look like this now', yes: { label: 'Yes — look again', next: 's5-align' } } },
  { kind: 'adjust', id: 's5-final', hold: HOLD, step: 's5-align', counters: [times5], move: 'U', title: 'Turn the TOP layer until all 4 edges sit above the center of the same color.', button: 'All 4 match', next: 's5-done', demoAfter: (d) => turnUntil(d, 'U', (s) => edgeMatches(s).every(Boolean)) },
  { kind: 'finish', id: 's5-done', hold: HOLD, step: 's5-align', counters: [times5], title: 'Yellow edges matched!', body: 'Every top edge matches the center below it.', picture: cube(() => scenario(HOLD, s5Rule)) },
]);

// ============================================================ Stage 6
const ALG6 = "U R U' L' U R' U' L";
const s6One = () => applyStep(scenario(HOLD, showAll, inv(ALG6)), 'y');
const s6None = () => scenario(HOLD, showAll, `${inv(ALG6)} y ${inv(ALG6)}`);
const times6: CounterDisplay = { key: 'times', label: 'Goes done', until: 'until all 4 corners are home' };
const ALG6_CHUNKS = [chunk('First half', "U R U' L'"), chunk('Second half', "U R' U' L")];
const ALG6_INTRO = 'These 8 turns are called the Corner swap.';

const stage6 = flow(6, 's6-check', [
  {
    kind: 'choice', id: 's6-check', hold: HOLD, step: 's6-check', counters: [times6],
    title: 'A corner is HOME when its 3 colors match the 3 centers around it (twisted is fine). A tick = home. Tap the picture like yours.',
    options: [
      { label: 'All 4 are home', picture: topView(() => scenario(HOLD, showAll), 'corners'), next: 's6-done' },
      { label: 'Only 1 is home', picture: topView(s6One, 'corners'), demo: s6One, next: 's6-face' },
      { label: 'None are home', picture: topView(s6None, 'corners'), demo: s6None, next: 's6-any' },
    ],
    help: [
      'Hold yellow on top. Pick one top corner. It has 3 stickers: one on top and two on the sides.',
      'Look at the 3 centers that corner touches: the yellow top center and the two side centers next to it. Are the corner\'s 3 colors those same 3 colors, in any order? Then it is home.',
      'Check all 4 top corners this way. You will find 4, 1 or none at home.',
    ],
  },
  { kind: 'info', id: 's6-face', hold: HOLD, step: 's6-check', counters: [times6], title: 'Turn your whole cube (yellow stays on top) so the corner that is home is at the FRONT-RIGHT, on top.', button: "It's at the front-right", next: 's6-keep', demoAfter: (d) => turnUntil(d, 'y', frontRightCornerInSpot) },
  {
    kind: 'sequence', id: 's6-keep', hold: HOLD, step: 's6-check', counters: [times6], name: 'Corner swap', intro: `${ALG6_INTRO} Keep the home corner at the front-right.`, repeat: 'times', chunks: ALG6_CHUNKS, onDone: { add: ['times'] },
    checkpoint: {
      title: 'Are all 4 top corners home now?', body: "Each corner's 3 colors are the same as the 3 centers around it (twisted is fine).", goal: topView(() => scenario(HOLD, showAll), 'corners'),
      yes: { label: 'Yes, all 4', next: 's6-done' },
      notYet: { label: 'Not yet — do the 8 turns again', next: 's6-keep' },
    },
  },
  { kind: 'sequence', id: 's6-any', hold: HOLD, step: 's6-check', counters: [times6], name: 'Corner swap', intro: `${ALG6_INTRO} Do it once from any side.`, repeat: 'times', chunks: ALG6_CHUNKS, onDone: { add: ['times'] }, checkpoint: { title: 'Now check your corners again', body: 'One corner will be home now.', yes: { label: 'Check my corners', next: 's6-check' } } },
  { kind: 'finish', id: 's6-done', hold: HOLD, step: 's6-check', counters: [times6], title: 'Corners are home!', body: 'All 4 top corners are in their own spots. Some may still be twisted. That is the last stage.', picture: cube(() => scenario(HOLD, showAll)) },
]);

// ============================================================ Stage 7 (yellow still on top: twist each top corner at the front-right)
const TWIST = "R' D' R D";
const s7Start = () => twistCorner(twistCorner(scenario(HOLD, showAll), FRONT_RIGHT_TOP, 1), FRONT_LEFT_TOP, 2);
const s7Goal = () => scenario(HOLD, () => false, '', FRONT_RIGHT_TOP);
const twisted: CounterDisplay = { key: 'twisted', label: 'Corners done', of: 4 };
const afterTwist = (c: Counters) => ((c.twisted ?? 0) >= 4 ? 's7-final' : 's7-next');
const MIXED = "The bottom looks mixed up? That's normal. Keep going. It fixes itself.";

const stage7 = flow(7, 's7-start', [
  {
    kind: 'choice', id: 's7-start', hold: HOLD, step: 's7-start', counters: [twisted],
    title: 'Turn ONLY the top layer until a corner with NO yellow on top is at the FRONT-RIGHT. Do not turn your whole cube any more.',
    options: [
      { label: "Done: it's at the front-right", picture: cube(s7Start), next: 's7-twist' },
      { label: 'All 4 corners already have yellow on top', picture: cube(() => scenario(HOLD, showAll)), next: 's7-final' },
    ],
    help: [
      'Hold yellow on top. Pick a side to face you and keep it facing you for this whole stage.',
      'Look at the 4 corners of the yellow top. Is every corner sticker on top yellow? If yes, tap "Every top corner already has yellow facing up".',
      'If not, turn only the TOP layer until one of the corners that is not yellow on top sits at the front-right.',
    ],
  },
  {
    kind: 'sequence', id: 's7-twist', hold: HOLD, step: 's7-start', counters: [twisted], name: 'Corner twist', repeat: 'repeats',
    intro: 'These 4 turns are called the Corner twist.',
    chunks: [chunk('Corner twist', TWIST)], onDone: { add: ['repeats'] },
    reassure: (c) => ((c.repeats ?? 0) >= 1 ? MIXED : undefined),
    checkpoint: {
      title: "Is the FRONT-RIGHT top corner's yellow facing UP now?", body: 'Only this corner matters. The rest looks mixed up. That is normal. It takes 2 or 4 goes.', goal: cube(s7Goal),
      yes: { label: 'Yes, yellow faces up', next: afterTwist, effect: { add: ['twisted'], reset: ['repeats'] } },
      notYet: { label: 'Not yet — do the 4 turns again', next: 's7-twist' },
    },
  },
  { kind: 'adjust', id: 's7-next', hold: HOLD, step: 's7-next', counters: [twisted], move: 'U', showGoal: false, title: 'Turn ONLY the TOP layer one click to bring the next corner to the front-right.', body: 'Do not turn your whole cube, and do not fix the bottom. It will sort itself out.', button: 'Done', next: 's7-next-check', demoAfter: (d) => applyStep(d, 'U') },
  {
    kind: 'choice', id: 's7-next-check', hold: HOLD, step: 's7-next', counters: [twisted],
    title: "Look at the front-right top corner. Is its yellow facing UP?",
    options: [
      { label: 'No: fix it', picture: cube(s7Start), next: 's7-twist' },
      { label: 'Yes: already done, skip it', picture: cube(s7Goal), next: afterTwist, effect: { add: ['twisted'] } },
    ],
    help: [
      'Keep the same side facing you. Do not turn your whole cube.',
      'Look at the corner at the front-right of the yellow top. It has one sticker on top.',
      'Is that top sticker yellow? Yes = skip it. No = fix it.',
    ],
  },
  { kind: 'adjust', id: 's7-final', hold: HOLD, step: 's7-final', counters: [twisted], move: 'U', title: 'Turn the TOP layer until every side is one color.', button: "It's solved!", next: 's7-done', demoAfter: (d) => turnUntil(d, 'U', sidesAligned) },
  { kind: 'finish', id: 's7-done', hold: HOLD, step: 's7-final', counters: [twisted], title: "You solved the Rubik's Cube!", body: 'Every side is one color. Congratulations!', picture: cube(() => scenario(HOLD, showAll)) },
]);

export const FOLLOW_ALONG: Record<number, StageFlow> = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7 };

// The sets of turns the guide teaches, exported for tests.
export const ALGORITHMS = { SLEDGE, INSERT_RIGHT, INSERT_LEFT, SUNE, ALG6, TWIST, ALG4: "F R U R' U' F'" };

const chant = (chunks: Chunk[]) => chunks.map((ch) => ch.phrase).join(' — ');
const sledgeMove = { name: 'Sledgehammer', chant: chantFor(m(SLEDGE)), notation: SLEDGE };
export const CHEAT_SHEET: StageSummary[] = [
  { stage: 1, rule: 'Bring a white edge to the top, turn the top until its side color sits over the same-color center, then turn that face twice.' },
  { stage: 2, rule: 'Put a white corner above its home at the front-right, then do the Sledgehammer until it drops in.', move: sledgeMove },
  { stage: 3, rule: 'Find a top edge with no yellow. Turn the top until its side color matches the center below, then Insert it toward the side its top color matches.', move: { name: 'Insert right', chant: chant(RIGHT_CHUNKS), notation: INSERT_RIGHT, note: 'Insert left is the same thing mirrored.' } },
  { stage: 4, rule: 'Front clockwise, Sledgehammer, front back. Repeat until you see the yellow cross (L sits back-left, line goes left to right).', move: { name: 'Yellow cross turns', chant: chant(ALG4), notation: "F R U R' U' F'", note: 'A Sledgehammer with a front turn before and after.' } },
  { stage: 5, rule: 'Turn the top until 2 edges match their centers. Put that pair at the back and right, do the Edge swap, then turn the top.', move: { name: 'Edge swap', chant: chant(SUNE_CHUNKS), notation: SUNE } },
  { stage: 6, rule: 'Find the corner that is already home, put it at the front-right, and do the Corner swap until all 4 are home.', move: { name: 'Corner swap', chant: chant(ALG6_CHUNKS), notation: ALG6 } },
  { stage: 7, rule: 'Do the Corner twist on the front-right top corner until its yellow faces up. Then turn only the top to the next corner and repeat.', move: { name: 'Corner twist', chant: chantFor(m(TWIST)), notation: TWIST } },
];

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

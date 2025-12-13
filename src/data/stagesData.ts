import { cubeStates, CUBE_COLORS, type CubeState } from '@/components/RubiksCube3D';

interface Step {
  instruction: string;
  tip?: string;
  move?: string; // Move notation for animation (e.g., "F2", "R", "U'")
}

interface StageData {
  id: number;
  title: string;
  description: string;
  goal: string;
  steps: Step[];
  cubeState: CubeState;
  algorithm?: string;
  algorithmName?: string;
}

// Custom cube states for each stage
const whiteCrossState: CubeState = {
  front: [
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
    [CUBE_COLORS.red, CUBE_COLORS.white, CUBE_COLORS.red],
  ],
  back: [
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
    [CUBE_COLORS.orange, CUBE_COLORS.white, CUBE_COLORS.orange],
  ],
  left: [
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
    [CUBE_COLORS.blue, CUBE_COLORS.white, CUBE_COLORS.blue],
  ],
  right: [
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
    [CUBE_COLORS.green, CUBE_COLORS.white, CUBE_COLORS.green],
  ],
  top: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
  ],
  bottom: [
    [CUBE_COLORS.black, CUBE_COLORS.white, CUBE_COLORS.black],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.black, CUBE_COLORS.white, CUBE_COLORS.black],
  ],
};

const whiteCornersState: CubeState = {
  front: [
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
  ],
  back: [
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
  ],
  left: [
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
  ],
  right: [
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
  ],
  top: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
  ],
  bottom: [
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
  ],
};

const middleLayerState: CubeState = {
  front: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
  ],
  back: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
  ],
  left: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
  ],
  right: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
  ],
  top: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
  ],
  bottom: [
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
  ],
};

const yellowCrossState: CubeState = {
  front: [
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
    [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
  ],
  back: [
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
    [CUBE_COLORS.orange, CUBE_COLORS.orange, CUBE_COLORS.orange],
  ],
  left: [
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
    [CUBE_COLORS.blue, CUBE_COLORS.blue, CUBE_COLORS.blue],
  ],
  right: [
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
    [CUBE_COLORS.green, CUBE_COLORS.green, CUBE_COLORS.green],
  ],
  top: [
    [CUBE_COLORS.white, CUBE_COLORS.yellow, CUBE_COLORS.white],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.white, CUBE_COLORS.yellow, CUBE_COLORS.white],
  ],
  bottom: [
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
  ],
};

export const stagesData: StageData[] = [
  {
    id: 1,
    title: 'The White Cross',
    description: 'Build a white cross using the Daisy Method',
    goal: 'Create a perfect white cross on the bottom face, with the colors of the side stickers matching the center pieces above them.',
    cubeState: whiteCrossState,
    steps: [
      {
        instruction: "Find the white center. Turn the cube so the Yellow center is facing UP and the White center is facing DOWN.",
        tip: "The center pieces never move—they define each face's color!"
      },
      {
        instruction: "Create the 'Daisy.' Find the four white edge pieces (white paired with another color) and move them one-by-one up to the Yellow face.",
        tip: "When done correctly, you'll see white edges forming a flower/daisy pattern around the yellow center on top."
      },
      {
        instruction: "Select one white edge piece on the Yellow face. Look at the OTHER color on that piece (not white).",
        tip: "Edge pieces have exactly 2 colors. One is white, the other tells you where it belongs."
      },
      {
        instruction: "Align the side color. Rotate ONLY the Top Layer (U) until the side color on the edge piece matches its corresponding Center Piece on the middle layer.",
        tip: "For example: if the edge has Red and White, rotate the top until the Red sticker lines up with the Red center.",
        move: "U"
      },
      {
        instruction: "Bring it home. Once aligned, turn that entire Front Face TWICE (180°). This moves the white edge from the top down to the correct spot next to the White center.",
        tip: "The white sticker is now on the bottom, and the side color matches the center above it!",
        move: "F2"
      },
      {
        instruction: "Repeat steps 3-5 for the remaining three white edge pieces. When finished, flip the cube over to admire your white cross!",
        tip: "Take your time—this is the foundation for everything else!"
      }
    ],
  },
  {
    id: 2,
    title: 'The White Corners',
    description: 'Complete the first layer by adding the corners',
    goal: 'Insert all four white corner pieces to complete the entire white face and first layer.',
    cubeState: whiteCornersState,
    algorithm: "R U R' U'",
    algorithmName: 'The Sledgehammer',
    steps: [
      {
        instruction: "Find a white corner piece in the top layer.",
        tip: "Corner pieces are at the corners—they have exactly 3 colors."
      },
      {
        instruction: "Position the corner above where it needs to go (match the other 2 colors to the centers).",
        move: "U"
      },
      {
        instruction: "Hold the cube so the corner is at the front-right-top position.",
      },
      {
        instruction: "Perform the Sledgehammer: Turn right face up (R), turn top clockwise (U), turn right face down (R'), turn top counter-clockwise (U').",
        tip: "You may need to repeat this 1-5 times until the corner drops into place!",
        move: "R"
      },
      {
        instruction: "Repeat for all four corners.",
      }
    ],
  },
  {
    id: 3,
    title: 'The Middle Layer',
    description: 'Solve the second layer edges',
    goal: 'Insert the four edge pieces to complete the first two layers of the cube.',
    cubeState: middleLayerState,
    algorithm: "U R U' R' U' F' U F / U' L' U' L U F U' F'",
    algorithmName: 'Insert Right / Insert Left',
    steps: [
      {
        instruction: "Flip the cube over so white is on top (you won't see it anymore). Yellow should now be facing you on top.",
      },
      {
        instruction: "Find an edge piece in the top layer that does NOT have yellow on it.",
        tip: "Yellow edges belong in the top layer—ignore them for now!"
      },
      {
        instruction: "Rotate the top layer until the edge's front color matches the center below it.",
      },
      {
        instruction: "Look at the other color on the edge piece. Does it match the RIGHT side or the LEFT side?",
        tip: "This determines which algorithm to use!"
      },
      {
        instruction: "INSERT RIGHT (if color matches right center): Top left (U'), Right up (R), Top right (U), Right down (R'). Then: Top left (U'), Front down (F'), Top right (U), Front up (F).",
        tip: "Simple: U' R U R' U' F' U F"
      },
      {
        instruction: "INSERT LEFT (if color matches left center): Top right (U), Left up (L'), Top left (U'), Left down (L). Then: Top right (U), Front up (F), Top left (U'), Front down (F').",
        tip: "Simple: U L' U' L U F U' F'"
      },
      {
        instruction: "Repeat for all four middle layer edges.",
        tip: "If an edge is stuck in the wrong place, insert any wrong piece into that spot—this will pop the stuck piece to the top!"
      }
    ],
  },
  {
    id: 4,
    title: 'The Yellow Cross',
    description: 'Create a yellow cross on top',
    goal: 'Form a yellow cross on the top face (ignoring the corners for now).',
    cubeState: yellowCrossState,
    algorithm: "F R U R' U' F'",
    algorithmName: 'Yellow Cross Algorithm',
    steps: [
      {
        instruction: "Look at the yellow face. You'll see one of three patterns: a dot, an L-shape, or a line.",
      },
      {
        instruction: "If you see a DOT: Hold the cube any way and do the algorithm once. You'll get an L-shape.",
      },
      {
        instruction: "If you see an L-SHAPE: Hold the cube so the L points to the back-left (9 o'clock position), then do the algorithm.",
        tip: "You'll get a line after this!"
      },
      {
        instruction: "If you see a LINE: Hold the cube so the line goes left-to-right (horizontal), then do the algorithm.",
      },
      {
        instruction: "The algorithm: F R U R' U' F' (Front, Right up, Top, Right down, Top back, Front back).",
        move: "F"
      }
    ],
  },
  {
    id: 5,
    title: 'Yellow Edge Permutation',
    description: 'Position the yellow edges correctly',
    goal: 'Move the yellow edge pieces so their side colors match the center colors.',
    cubeState: cubeStates.solved,
    algorithm: "R U R' U R U2 R'",
    algorithmName: 'Sune Algorithm',
    steps: [
      {
        instruction: "Look at the side colors of the yellow edges—you need to match them to the centers.",
      },
      {
        instruction: "Rotate the top layer to try to match as many edges as possible.",
        tip: "You might get 0, 2, or all 4 matching. Never just 1 or 3.",
        move: "U"
      },
      {
        instruction: "If you have 2 ADJACENT (next to each other) matches: Hold them at the back and right.",
      },
      {
        instruction: "If you have 2 OPPOSITE matches: Do the algorithm once, then you'll have 2 adjacent.",
      },
      {
        instruction: "The algorithm: R U R' U R U2 R' (Right up, Top, Right down, Top, Right up, Top twice, Right down).",
        move: "R"
      },
      {
        instruction: "After the algorithm, rotate the top to match all four edges.",
      }
    ],
  },
  {
    id: 6,
    title: 'Yellow Corner Permutation',
    description: 'Move corners to their correct positions',
    goal: 'Position all yellow corners correctly (they might still be twisted wrong—that\'s okay).',
    cubeState: cubeStates.solved,
    algorithm: "U R U' L' U R' U' L",
    algorithmName: 'Corner Swap Algorithm',
    steps: [
      {
        instruction: "Check each corner: is it in the right POSITION? (The colors should match the three faces around it, even if twisted.)",
      },
      {
        instruction: "Find a corner that IS in the correct position and hold it at the front-right-top.",
        tip: "If no corners are correct, do the algorithm once with any position, then look again."
      },
      {
        instruction: "The algorithm: U R U' L' U R' U' L (Top, Right up, Top back, Left down, Top, Right down, Top back, Left up).",
        move: "R"
      },
      {
        instruction: "Repeat until all four corners are in the correct positions.",
        tip: "Remember: the corners might look wrong because they're twisted—that's fixed in the next stage!"
      }
    ],
  },
  {
    id: 7,
    title: 'Yellow Corner Orientation',
    description: 'The final step—twist the corners!',
    goal: 'Orient all yellow corners correctly to solve the entire cube!',
    cubeState: cubeStates.solved,
    algorithm: "R' D' R D",
    algorithmName: 'Corner Twist',
    steps: [
      {
        instruction: "Flip the cube so YELLOW is now on the BOTTOM and WHITE is on top.",
        tip: "This is very important—the cube will look scrambled during this step, but trust the process!"
      },
      {
        instruction: "Find a yellow corner that's twisted wrong and move it to the front-right-bottom position.",
      },
      {
        instruction: "Repeat this move: Right face DOWN (R'), Bottom face COUNTER-CLOCKWISE (D'), Right face UP (R), Bottom face CLOCKWISE (D).",
        tip: "It takes 2 or 4 repetitions (so 8 or 16 moves) to fix each corner."
      },
      {
        instruction: "WITHOUT turning the whole cube, rotate ONLY the bottom layer (D or D') to bring the next wrong corner to the front-right-bottom.",
        tip: "The cube will look scrambled—this is normal! Don't panic!"
      },
      {
        instruction: "Repeat the R' D' R D algorithm for each twisted corner until all yellow stickers face down.",
      },
      {
        instruction: "When all corners are fixed, rotate the bottom layer to align everything—the cube is SOLVED!",
      }
    ],
  },
];

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
    description: 'You are building a plus sign (+) made of white pieces on the bottom. Each arm of the cross must also match the color on the side. This cross is the foundation for the entire cube.',
    goal: 'Create a perfect white cross on the bottom face, with the colors of the side stickers matching the center pieces above them.',
    cubeState: whiteCrossState,
    steps: [
      {
        instruction: "Hold the cube correctly. Turn the cube so Yellow is on top and White is on the bottom.",
        tip: "The center pieces never move. They tell you what color each side will be."
      },
      {
        instruction: "Set up the pieces (the 'Daisy'). This is not the goal—it's just a helper. Find the four pieces that have White and one other color. Move them so the white part touches the yellow center on top.",
        tip: "When you're done, you'll see four white pieces around the yellow center. This setup makes the next steps much easier."
      },
      {
        instruction: "Match the side color. Pick one white piece on the top. Look at the other color on that piece. Turn only the top layer until that color matches the center below it.",
        tip: "Example: White + Red lines up with the Red center."
      },
      {
        instruction: "Drop it into place. Once the colors match, turn that face two times. The white piece will move from the top to the bottom, locking into the correct spot.",
        tip: "One arm of the white cross is complete!"
      },
      {
        instruction: "Repeat steps 3 and 4 for the remaining white pieces. When finished, flip the cube over.",
        tip: "You should now see a perfect white cross!"
      }
    ],
  },
  {
    id: 2,
    title: 'The White Corners',
    description: 'Complete the first layer',
    goal: 'Fill in the four white corners to complete the entire white face.',
    cubeState: whiteCornersState,
    algorithm: "R U R' U'",
    algorithmName: 'The Sledgehammer',
    steps: [
      {
        instruction: "Find a white corner piece in the top layer.",
        tip: "Corner pieces have three colors."
      },
      {
        instruction: "Position it above where it belongs by matching the other two colors to their centers.",
      },
      {
        instruction: "Hold the cube so the corner is at the front-right-top.",
      },
      {
        instruction: "Perform the Sledgehammer: Right up → Top → Right down → Top back (R U R' U').",
        tip: "Repeat 1–5 times until the corner drops into place."
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
    goal: 'Complete the first two layers of the cube.',
    cubeState: middleLayerState,
    algorithm: "U' R U R' U' F' U F / U L' U' L U F U' F'",
    algorithmName: 'Insert Right / Insert Left',
    steps: [
      {
        instruction: "Flip the cube so white is on top. Yellow is now on top.",
      },
      {
        instruction: "Find an edge piece in the top layer without yellow.",
        tip: "Yellow edges stay on top for now."
      },
      {
        instruction: "Match the front color of the edge with the center below it.",
      },
      {
        instruction: "Look at the other color. Does it belong on the left or right?",
      },
      {
        instruction: "Insert Right (if color matches right): U' R U R' U' F' U F",
      },
      {
        instruction: "Insert Left (if color matches left): U L' U' L U F U' F'",
      },
      {
        instruction: "Repeat for all middle layer edges.",
        tip: "If one is stuck wrong, insert any edge there to pop it out."
      }
    ],
  },
  {
    id: 4,
    title: 'The Yellow Cross',
    description: 'Create a yellow cross on top',
    goal: 'Form a yellow cross (ignore corners for now).',
    cubeState: yellowCrossState,
    algorithm: "F R U R' U' F'",
    algorithmName: 'Yellow Cross Algorithm',
    steps: [
      {
        instruction: "Look at the yellow face. You'll see a dot, L-shape, or line.",
      },
      {
        instruction: "Dot: Do the algorithm once → you'll get an L.",
      },
      {
        instruction: "L-shape: Hold it like a backwards L (pointing to back-left), then do the algorithm.",
      },
      {
        instruction: "Line: Hold it horizontally, then do the algorithm.",
      },
      {
        instruction: "Algorithm: F R U R' U' F'",
      }
    ],
  },
  {
    id: 5,
    title: 'Yellow Edge Permutation',
    description: 'Match yellow edges to centers',
    goal: 'Side colors of yellow edges match their centers.',
    cubeState: cubeStates.solved,
    algorithm: "R U R' U R U2 R'",
    algorithmName: 'Sune Algorithm',
    steps: [
      {
        instruction: "Check how many edges already match.",
      },
      {
        instruction: "Rotate the top layer to maximize matches.",
        tip: "You'll get 0, 2, or 4 matches."
      },
      {
        instruction: "If 2 adjacent, hold them at the back and right.",
      },
      {
        instruction: "If 2 opposite, do the algorithm once to get adjacent.",
      },
      {
        instruction: "Algorithm: R U R' U R U2 R'",
      },
      {
        instruction: "Rotate the top layer to finish alignment.",
      }
    ],
  },
  {
    id: 6,
    title: 'Yellow Corner Permutation',
    description: 'Put corners in the correct position',
    goal: 'All yellow corners are in the right place (twist doesn\'t matter yet).',
    cubeState: cubeStates.solved,
    algorithm: "U R U' L' U R' U' L",
    algorithmName: 'Corner Swap Algorithm',
    steps: [
      {
        instruction: "Find a corner that's already in the correct position.",
      },
      {
        instruction: "Hold it at front-right-top.",
        tip: "If none are correct, do the algorithm once."
      },
      {
        instruction: "Algorithm: U R U' L' U R' U' L",
      },
      {
        instruction: "Repeat until all corners are positioned correctly.",
      }
    ],
  },
  {
    id: 7,
    title: 'Yellow Corner Orientation',
    description: 'Twist the corners and finish the cube',
    goal: 'Solve the cube completely.',
    cubeState: cubeStates.solved,
    algorithm: "R' D' R D",
    algorithmName: 'Corner Twist',
    steps: [
      {
        instruction: "Flip the cube so yellow is on the bottom, white on top.",
        tip: "The cube will look scrambled. This is normal."
      },
      {
        instruction: "Bring a twisted yellow corner to front-right-bottom.",
      },
      {
        instruction: "Repeat: R' D' R D (2 or 4 times per corner).",
      },
      {
        instruction: "Rotate only the bottom layer to bring the next wrong corner into position.",
      },
      {
        instruction: "Repeat until all yellow corners face down.",
      },
      {
        instruction: "Rotate the bottom layer to align everything.",
        tip: "Solved!"
      }
    ],
  },
];

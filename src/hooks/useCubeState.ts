import { useState, useCallback } from 'react';

export const CUBE_COLORS = {
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  orange: '#EA580C',
  yellow: '#EAB308',
  white: '#F5F5F5',
  black: '#1A1A1A',
};

export interface CubeState {
  front: string[][];
  back: string[][];
  left: string[][];
  right: string[][];
  top: string[][];
  bottom: string[][];
}

export type MoveName = 'R' | "R'" | 'R2' | 'L' | "L'" | 'L2' | 'U' | "U'" | 'U2' | 'D' | "D'" | 'D2' | 'F' | "F'" | 'F2' | 'B' | "B'" | 'B2';

const rotateFaceClockwise = (face: string[][]): string[][] => {
  return [
    [face[2][0], face[1][0], face[0][0]],
    [face[2][1], face[1][1], face[0][1]],
    [face[2][2], face[1][2], face[0][2]],
  ];
};

const rotateFaceCounterClockwise = (face: string[][]): string[][] => {
  return [
    [face[0][2], face[1][2], face[2][2]],
    [face[0][1], face[1][1], face[2][1]],
    [face[0][0], face[1][0], face[2][0]],
  ];
};

const deepClone = (state: CubeState): CubeState => ({
  front: state.front.map(row => [...row]),
  back: state.back.map(row => [...row]),
  left: state.left.map(row => [...row]),
  right: state.right.map(row => [...row]),
  top: state.top.map(row => [...row]),
  bottom: state.bottom.map(row => [...row]),
});

// Move implementations
const moveR = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.right = rotateFaceClockwise(state.right);
  for (let i = 0; i < 3; i++) {
    newState.front[i][2] = state.bottom[i][2];
    newState.top[i][2] = state.front[i][2];
    newState.back[2-i][0] = state.top[i][2];
    newState.bottom[i][2] = state.back[2-i][0];
  }
  return newState;
};

const moveRPrime = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.right = rotateFaceCounterClockwise(state.right);
  for (let i = 0; i < 3; i++) {
    newState.front[i][2] = state.top[i][2];
    newState.bottom[i][2] = state.front[i][2];
    newState.back[2-i][0] = state.bottom[i][2];
    newState.top[i][2] = state.back[2-i][0];
  }
  return newState;
};

const moveU = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.top = rotateFaceClockwise(state.top);
  const frontRow = [...state.front[0]];
  newState.front[0] = [...state.right[0]];
  newState.right[0] = [...state.back[0]];
  newState.back[0] = [...state.left[0]];
  newState.left[0] = frontRow;
  return newState;
};

const moveUPrime = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.top = rotateFaceCounterClockwise(state.top);
  const frontRow = [...state.front[0]];
  newState.front[0] = [...state.left[0]];
  newState.left[0] = [...state.back[0]];
  newState.back[0] = [...state.right[0]];
  newState.right[0] = frontRow;
  return newState;
};

const moveL = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.left = rotateFaceClockwise(state.left);
  for (let i = 0; i < 3; i++) {
    newState.front[i][0] = state.top[i][0];
    newState.bottom[i][0] = state.front[i][0];
    newState.back[2-i][2] = state.bottom[i][0];
    newState.top[i][0] = state.back[2-i][2];
  }
  return newState;
};

const moveLPrime = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.left = rotateFaceCounterClockwise(state.left);
  for (let i = 0; i < 3; i++) {
    newState.front[i][0] = state.bottom[i][0];
    newState.top[i][0] = state.front[i][0];
    newState.back[2-i][2] = state.top[i][0];
    newState.bottom[i][0] = state.back[2-i][2];
  }
  return newState;
};

const moveF = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.front = rotateFaceClockwise(state.front);
  const topRow = [...state.top[2]];
  for (let i = 0; i < 3; i++) {
    newState.top[2][i] = state.left[2-i][2];
    newState.right[i][0] = topRow[i];
    newState.bottom[0][i] = state.right[2-i][0];
    newState.left[i][2] = state.bottom[0][i];
  }
  return newState;
};

const moveFPrime = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.front = rotateFaceCounterClockwise(state.front);
  const topRow = [...state.top[2]];
  for (let i = 0; i < 3; i++) {
    newState.top[2][i] = state.right[i][0];
    newState.left[i][2] = topRow[2-i];
    newState.bottom[0][i] = state.left[i][2];
    newState.right[i][0] = state.bottom[0][2-i];
  }
  return newState;
};

const moveD = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.bottom = rotateFaceClockwise(state.bottom);
  const frontRow = [...state.front[2]];
  newState.front[2] = [...state.left[2]];
  newState.left[2] = [...state.back[2]];
  newState.back[2] = [...state.right[2]];
  newState.right[2] = frontRow;
  return newState;
};

const moveDPrime = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.bottom = rotateFaceCounterClockwise(state.bottom);
  const frontRow = [...state.front[2]];
  newState.front[2] = [...state.right[2]];
  newState.right[2] = [...state.back[2]];
  newState.back[2] = [...state.left[2]];
  newState.left[2] = frontRow;
  return newState;
};

const moveB = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.back = rotateFaceClockwise(state.back);
  const topRow = [...state.top[0]];
  for (let i = 0; i < 3; i++) {
    newState.top[0][i] = state.right[i][2];
    newState.left[i][0] = topRow[2-i];
    newState.bottom[2][i] = state.left[i][0];
    newState.right[i][2] = state.bottom[2][2-i];
  }
  return newState;
};

const moveBPrime = (state: CubeState): CubeState => {
  const newState = deepClone(state);
  newState.back = rotateFaceCounterClockwise(state.back);
  const topRow = [...state.top[0]];
  for (let i = 0; i < 3; i++) {
    newState.top[0][i] = state.left[2-i][0];
    newState.right[i][2] = topRow[i];
    newState.bottom[2][i] = state.right[2-i][2];
    newState.left[i][0] = state.bottom[2][i];
  }
  return newState;
};

export const executeMove = (state: CubeState, move: MoveName): CubeState => {
  switch (move) {
    case 'R': return moveR(state);
    case "R'": return moveRPrime(state);
    case 'R2': return moveR(moveR(state));
    case 'L': return moveL(state);
    case "L'": return moveLPrime(state);
    case 'L2': return moveL(moveL(state));
    case 'U': return moveU(state);
    case "U'": return moveUPrime(state);
    case 'U2': return moveU(moveU(state));
    case 'D': return moveD(state);
    case "D'": return moveDPrime(state);
    case 'D2': return moveD(moveD(state));
    case 'F': return moveF(state);
    case "F'": return moveFPrime(state);
    case 'F2': return moveF(moveF(state));
    case 'B': return moveB(state);
    case "B'": return moveBPrime(state);
    case 'B2': return moveB(moveB(state));
    default: return state;
  }
};

export const getSolvedCube = (): CubeState => ({
  front: Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.red)),
  back: Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.orange)),
  left: Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.blue)),
  right: Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.green)),
  top: Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.yellow)),
  bottom: Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.white)),
});

// ============================================
// STAGE-SPECIFIC STARTING STATES
// These show a cube in a realistic state for each stage
// ============================================

// Stage 1: White Cross - Start with white edges scattered around
// Shows a cube where white edges need to be brought to the top (Daisy formation)
export const getStage1StartState = (): CubeState => {
  const state = getSolvedCube();
  
  // Scatter white edges to different faces to demonstrate the problem
  // White-Red edge: move to right face (middle)
  state.bottom[1][0] = CUBE_COLORS.blue;  // Remove white from bottom
  state.right[1][0] = CUBE_COLORS.white;  // Put white on right face
  
  // White-Green edge: move to front face (middle)
  state.bottom[0][1] = CUBE_COLORS.red;
  state.front[1][2] = CUBE_COLORS.white;
  
  // White-Orange edge: on back top
  state.bottom[1][2] = CUBE_COLORS.green;
  state.back[0][1] = CUBE_COLORS.white;
  
  // White-Blue edge: already somewhat misplaced
  state.bottom[2][1] = CUBE_COLORS.orange;
  state.left[1][0] = CUBE_COLORS.white;
  
  // Yellow center stays on top, white center on bottom
  return state;
};

// Stage 1: Daisy state - White edges around yellow center
export const getDaisyState = (): CubeState => {
  const state = getSolvedCube();
  
  // Put white edges around the yellow center (top face)
  // The white stickers should be on top, touching yellow center
  state.top[0][1] = CUBE_COLORS.white; // Back edge
  state.top[1][0] = CUBE_COLORS.white; // Left edge  
  state.top[1][2] = CUBE_COLORS.white; // Right edge
  state.top[2][1] = CUBE_COLORS.white; // Front edge
  
  // Remove white from bottom (they're now on top)
  state.bottom[0][1] = CUBE_COLORS.orange;
  state.bottom[1][0] = CUBE_COLORS.blue;
  state.bottom[1][2] = CUBE_COLORS.green;
  state.bottom[2][1] = CUBE_COLORS.red;
  
  return state;
};

// Stage 1: Goal state - White cross complete
export const getWhiteCrossState = (): CubeState => {
  const state = getSolvedCube();
  // White cross is on bottom with matching side colors
  // This is essentially a solved first layer cross
  return state;
};

// Stage 2: White Corners - Cross done, corners scattered
export const getStage2StartState = (): CubeState => {
  const state = getSolvedCube();
  
  // White cross is done (bottom)
  // But corners are in wrong positions/orientations
  // Move white corners to top layer, misoriented
  
  // White-Red-Green corner: put on top front-right, white facing front
  state.bottom[0][2] = CUBE_COLORS.yellow;
  state.front[2][2] = CUBE_COLORS.white;
  state.right[2][0] = CUBE_COLORS.red;
  state.top[2][2] = CUBE_COLORS.green;
  
  // White-Red-Blue corner: put on top front-left
  state.bottom[0][0] = CUBE_COLORS.yellow;
  state.front[2][0] = CUBE_COLORS.blue;
  state.left[2][2] = CUBE_COLORS.white;
  state.top[2][0] = CUBE_COLORS.red;
  
  return state;
};

// Stage 3: Middle Layer - First layer done, middle edges scrambled
export const getStage3StartState = (): CubeState => {
  const state = getSolvedCube();
  
  // First layer (white face + matching sides) is complete
  // Middle layer edges are wrong or in bottom layer
  
  // Red-Green edge: in bottom layer
  state.front[1][2] = CUBE_COLORS.yellow;
  state.right[1][0] = CUBE_COLORS.yellow;
  state.bottom[0][1] = CUBE_COLORS.red;
  state.bottom[1][2] = CUBE_COLORS.green;
  
  return state;
};

// Stage 4: Yellow Cross - First two layers done
export const getStage4StartState = (): CubeState => {
  const state = getSolvedCube();
  
  // F2L complete, yellow face shows a dot/L-shape/line
  // Yellow corners and some edges are not yellow-facing-up
  state.top[0][1] = CUBE_COLORS.orange; // Back edge - not yellow
  state.top[1][0] = CUBE_COLORS.blue;   // Left edge - not yellow
  
  return state;
};

// Stage 5: Yellow Edge Permutation - Yellow cross done, edges not matched
export const getStage5StartState = (): CubeState => {
  const state = getSolvedCube();
  
  // Yellow cross is complete but edges are in wrong positions
  // Swap front and right edges
  const temp = state.front[0][1];
  state.front[0][1] = state.right[0][1];
  state.right[0][1] = temp;
  
  return state;
};

// Stage 6: Yellow Corner Permutation - Edges done, corners in wrong spots
export const getStage6StartState = (): CubeState => {
  const state = getSolvedCube();
  
  // Yellow edges matched, but corners are in wrong positions (right colors, wrong spots)
  // Swap front-right and back-right corners
  const tempTop1 = state.top[2][2];
  const tempTop2 = state.top[0][2];
  const tempFront = state.front[0][2];
  const tempBack = state.back[0][0];
  const tempRight1 = state.right[0][0];
  const tempRight2 = state.right[0][2];
  
  state.top[2][2] = tempTop2;
  state.top[0][2] = tempTop1;
  state.front[0][2] = tempRight2;
  state.back[0][0] = tempRight1;
  state.right[0][0] = tempBack;
  state.right[0][2] = tempFront;
  
  return state;
};

// Stage 7: Yellow Corner Orientation - Corners in right spots but twisted
export const getStage7StartState = (): CubeState => {
  const state = getSolvedCube();
  
  // Corners are in correct positions but need to be twisted
  // Twist front-right-top corner
  const y = state.top[2][2];
  const f = state.front[0][2];
  const r = state.right[0][0];
  state.top[2][2] = f;
  state.front[0][2] = r;
  state.right[0][0] = y;
  
  // Twist back-left-top corner
  const y2 = state.top[0][0];
  const b = state.back[0][2];
  const l = state.left[0][0];
  state.top[0][0] = l;
  state.left[0][0] = b;
  state.back[0][2] = y2;
  
  return state;
};

// Get the appropriate starting state for each stage
export const getStageStartState = (stageId: number): CubeState => {
  switch (stageId) {
    case 1: return getStage1StartState();
    case 2: return getStage2StartState();
    case 3: return getStage3StartState();
    case 4: return getStage4StartState();
    case 5: return getStage5StartState();
    case 6: return getStage6StartState();
    case 7: return getStage7StartState();
    default: return getSolvedCube();
  }
};

// Create a scrambled cube for practice (random but solvable)
export const createScrambledCube = (): CubeState => {
  let state = getSolvedCube();
  const moves: MoveName[] = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"];
  for (let i = 0; i < 20; i++) {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    state = executeMove(state, randomMove);
  }
  return state;
};

export const useCubeState = (initialState?: CubeState) => {
  const [cubeState, setCubeState] = useState<CubeState>(initialState || getSolvedCube());
  const [moveHistory, setMoveHistory] = useState<MoveName[]>([]);

  const performMove = useCallback((move: MoveName) => {
    setCubeState(prev => executeMove(prev, move));
    setMoveHistory(prev => [...prev, move]);
  }, []);

  const undoMove = useCallback(() => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const inverseMove: MoveName = lastMove.includes("'") 
      ? lastMove.replace("'", '') as MoveName
      : lastMove.includes('2') 
        ? lastMove as MoveName 
        : `${lastMove}'` as MoveName;
    
    setCubeState(prev => executeMove(prev, inverseMove));
    setMoveHistory(prev => prev.slice(0, -1));
  }, [moveHistory]);

  const resetCube = useCallback((state?: CubeState) => {
    setCubeState(state || getSolvedCube());
    setMoveHistory([]);
  }, []);

  return {
    cubeState,
    moveHistory,
    performMove,
    undoMove,
    resetCube,
    setCubeState,
  };
};

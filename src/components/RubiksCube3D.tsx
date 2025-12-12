import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface CubeState {
  // Face colors: front, back, left, right, top, bottom (each is 3x3 array)
  front: string[][];
  back: string[][];
  left: string[][];
  right: string[][];
  top: string[][];
  bottom: string[][];
}

interface CubeletProps {
  position: [number, number, number];
  colors: {
    front?: string;
    back?: string;
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
  };
}

const CUBE_COLORS = {
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  orange: '#EA580C',
  yellow: '#EAB308',
  white: '#F5F5F5',
  black: '#1A1A1A',
};

const Cubelet = ({ position, colors }: CubeletProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = 0.95;
  const gap = 0.02;

  const materials = useMemo(() => {
    return [
      new THREE.MeshStandardMaterial({ color: colors.right || CUBE_COLORS.black }), // +X
      new THREE.MeshStandardMaterial({ color: colors.left || CUBE_COLORS.black }),  // -X
      new THREE.MeshStandardMaterial({ color: colors.top || CUBE_COLORS.black }),   // +Y
      new THREE.MeshStandardMaterial({ color: colors.bottom || CUBE_COLORS.black }), // -Y
      new THREE.MeshStandardMaterial({ color: colors.front || CUBE_COLORS.black }), // +Z
      new THREE.MeshStandardMaterial({ color: colors.back || CUBE_COLORS.black }),  // -Z
    ];
  }, [colors]);

  return (
    <mesh ref={meshRef} position={position} material={materials}>
      <roundedBoxGeometry args={[size, size, size, 4, 0.08]} />
    </mesh>
  );
};

interface RubiksCubeSceneProps {
  cubeState: CubeState;
  autoRotate?: boolean;
  highlightPieces?: [number, number, number][];
}

const RubiksCubeScene = ({ cubeState, autoRotate = true, highlightPieces = [] }: RubiksCubeSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1 + 0.3;
    }
  });

  const cubelets = useMemo(() => {
    const pieces: JSX.Element[] = [];
    
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const colors: CubeletProps['colors'] = {};
          
          // Map face colors based on position
          if (z === 1) colors.front = cubeState.front[1 - y]?.[x + 1] || CUBE_COLORS.black;
          if (z === -1) colors.back = cubeState.back[1 - y]?.[1 - x] || CUBE_COLORS.black;
          if (x === -1) colors.left = cubeState.left[1 - y]?.[1 - z] || CUBE_COLORS.black;
          if (x === 1) colors.right = cubeState.right[1 - y]?.[z + 1] || CUBE_COLORS.black;
          if (y === 1) colors.top = cubeState.top[1 - z]?.[x + 1] || CUBE_COLORS.black;
          if (y === -1) colors.bottom = cubeState.bottom[z + 1]?.[x + 1] || CUBE_COLORS.black;

          pieces.push(
            <Cubelet
              key={`${x}-${y}-${z}`}
              position={[x, y, z]}
              colors={colors}
            />
          );
        }
      }
    }
    return pieces;
  }, [cubeState]);

  return (
    <group ref={groupRef}>
      {cubelets}
    </group>
  );
};

interface RubiksCube3DProps {
  cubeState?: CubeState;
  autoRotate?: boolean;
  highlightPieces?: [number, number, number][];
  className?: string;
}

// Default solved cube state
const defaultCubeState: CubeState = {
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
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
  ],
  bottom: [
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
    [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
  ],
};

export const RubiksCube3D = ({ 
  cubeState = defaultCubeState, 
  autoRotate = true,
  highlightPieces = [],
  className = ''
}: RubiksCube3DProps) => {
  return (
    <div className={`w-full h-64 md:h-80 ${className}`}>
      <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <RubiksCubeScene 
          cubeState={cubeState} 
          autoRotate={autoRotate}
          highlightPieces={highlightPieces}
        />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
};

// Pre-defined cube states for different stages
export const cubeStates = {
  solved: defaultCubeState,
  
  whiteCross: {
    ...defaultCubeState,
    bottom: [
      [CUBE_COLORS.yellow, CUBE_COLORS.white, CUBE_COLORS.yellow],
      [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
      [CUBE_COLORS.yellow, CUBE_COLORS.white, CUBE_COLORS.yellow],
    ],
  },
  
  whiteCorners: {
    ...defaultCubeState,
    bottom: [
      [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
      [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
      [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
    ],
  },
  
  middleLayer: {
    ...defaultCubeState,
  },
  
  yellowCross: {
    ...defaultCubeState,
    top: [
      [CUBE_COLORS.white, CUBE_COLORS.yellow, CUBE_COLORS.white],
      [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
      [CUBE_COLORS.white, CUBE_COLORS.yellow, CUBE_COLORS.white],
    ],
  },
  
  scrambled: {
    front: [
      [CUBE_COLORS.blue, CUBE_COLORS.yellow, CUBE_COLORS.green],
      [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.orange],
      [CUBE_COLORS.white, CUBE_COLORS.blue, CUBE_COLORS.yellow],
    ],
    back: [
      [CUBE_COLORS.red, CUBE_COLORS.green, CUBE_COLORS.white],
      [CUBE_COLORS.yellow, CUBE_COLORS.orange, CUBE_COLORS.blue],
      [CUBE_COLORS.green, CUBE_COLORS.white, CUBE_COLORS.orange],
    ],
    left: [
      [CUBE_COLORS.orange, CUBE_COLORS.red, CUBE_COLORS.blue],
      [CUBE_COLORS.white, CUBE_COLORS.blue, CUBE_COLORS.green],
      [CUBE_COLORS.red, CUBE_COLORS.orange, CUBE_COLORS.yellow],
    ],
    right: [
      [CUBE_COLORS.yellow, CUBE_COLORS.white, CUBE_COLORS.red],
      [CUBE_COLORS.blue, CUBE_COLORS.green, CUBE_COLORS.yellow],
      [CUBE_COLORS.orange, CUBE_COLORS.red, CUBE_COLORS.blue],
    ],
    top: [
      [CUBE_COLORS.green, CUBE_COLORS.orange, CUBE_COLORS.white],
      [CUBE_COLORS.green, CUBE_COLORS.white, CUBE_COLORS.red],
      [CUBE_COLORS.blue, CUBE_COLORS.yellow, CUBE_COLORS.orange],
    ],
    bottom: [
      [CUBE_COLORS.white, CUBE_COLORS.blue, CUBE_COLORS.green],
      [CUBE_COLORS.orange, CUBE_COLORS.yellow, CUBE_COLORS.white],
      [CUBE_COLORS.red, CUBE_COLORS.green, CUBE_COLORS.yellow],
    ],
  },
};

export { CUBE_COLORS };
export type { CubeState };

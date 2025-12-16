import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CubeState, MoveName, CUBE_COLORS } from '@/hooks/useCubeState';
import { FaceName } from '@/data/interactiveStagesData';

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
  glowFaces?: FaceName[];
  dimmed?: boolean;
  onFaceClick?: (face: FaceName) => void;
}

const Cubelet = ({ position, colors, glowFaces = [], dimmed = false, onFaceClick }: CubeletProps) => {
  const size = 0.95;
  const [x, y, z] = position;
  
  const getFaceGlow = (face: FaceName): boolean => glowFaces.includes(face);
  
  const handleClick = (face: FaceName) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (onFaceClick && !dimmed) {
      onFaceClick(face);
    }
  };

  return (
    <group position={position}>
      {/* Right face (+X) */}
      {colors.right && x === 1 && (
        <mesh 
          position={[size / 2 + 0.001, 0, 0]} 
          rotation={[0, Math.PI / 2, 0]}
          onClick={handleClick('right')}
        >
          <planeGeometry args={[size * 0.85, size * 0.85]} />
          <meshStandardMaterial 
            color={colors.right} 
            emissive={getFaceGlow('right') ? colors.right : '#000000'}
            emissiveIntensity={getFaceGlow('right') ? 0.3 : 0}
            opacity={dimmed ? 0.4 : 1}
            transparent={dimmed}
          />
        </mesh>
      )}
      {/* Left face (-X) */}
      {colors.left && x === -1 && (
        <mesh 
          position={[-size / 2 - 0.001, 0, 0]} 
          rotation={[0, -Math.PI / 2, 0]}
          onClick={handleClick('left')}
        >
          <planeGeometry args={[size * 0.85, size * 0.85]} />
          <meshStandardMaterial 
            color={colors.left}
            emissive={getFaceGlow('left') ? colors.left : '#000000'}
            emissiveIntensity={getFaceGlow('left') ? 0.3 : 0}
            opacity={dimmed ? 0.4 : 1}
            transparent={dimmed}
          />
        </mesh>
      )}
      {/* Top face (+Y) */}
      {colors.top && y === 1 && (
        <mesh 
          position={[0, size / 2 + 0.001, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleClick('top')}
        >
          <planeGeometry args={[size * 0.85, size * 0.85]} />
          <meshStandardMaterial 
            color={colors.top}
            emissive={getFaceGlow('top') ? colors.top : '#000000'}
            emissiveIntensity={getFaceGlow('top') ? 0.3 : 0}
            opacity={dimmed ? 0.4 : 1}
            transparent={dimmed}
          />
        </mesh>
      )}
      {/* Bottom face (-Y) */}
      {colors.bottom && y === -1 && (
        <mesh 
          position={[0, -size / 2 - 0.001, 0]} 
          rotation={[Math.PI / 2, 0, 0]}
          onClick={handleClick('bottom')}
        >
          <planeGeometry args={[size * 0.85, size * 0.85]} />
          <meshStandardMaterial 
            color={colors.bottom}
            emissive={getFaceGlow('bottom') ? colors.bottom : '#000000'}
            emissiveIntensity={getFaceGlow('bottom') ? 0.3 : 0}
            opacity={dimmed ? 0.4 : 1}
            transparent={dimmed}
          />
        </mesh>
      )}
      {/* Front face (+Z) */}
      {colors.front && z === 1 && (
        <mesh 
          position={[0, 0, size / 2 + 0.001]}
          onClick={handleClick('front')}
        >
          <planeGeometry args={[size * 0.85, size * 0.85]} />
          <meshStandardMaterial 
            color={colors.front}
            emissive={getFaceGlow('front') ? colors.front : '#000000'}
            emissiveIntensity={getFaceGlow('front') ? 0.3 : 0}
            opacity={dimmed ? 0.4 : 1}
            transparent={dimmed}
          />
        </mesh>
      )}
      {/* Back face (-Z) */}
      {colors.back && z === -1 && (
        <mesh 
          position={[0, 0, -size / 2 - 0.001]} 
          rotation={[0, Math.PI, 0]}
          onClick={handleClick('back')}
        >
          <planeGeometry args={[size * 0.85, size * 0.85]} />
          <meshStandardMaterial 
            color={colors.back}
            emissive={getFaceGlow('back') ? colors.back : '#000000'}
            emissiveIntensity={getFaceGlow('back') ? 0.3 : 0}
            opacity={dimmed ? 0.4 : 1}
            transparent={dimmed}
          />
        </mesh>
      )}
      {/* Black cube base */}
      <RoundedBox args={[size, size, size]} radius={0.08} smoothness={4}>
        <meshStandardMaterial 
          color={CUBE_COLORS.black}
          opacity={dimmed ? 0.4 : 1}
          transparent={dimmed}
        />
      </RoundedBox>
    </group>
  );
};

interface InteractiveCubeSceneProps {
  cubeState: CubeState;
  highlightFaces?: FaceName[];
  allowedFaces?: FaceName[];
  onFaceClick?: (face: FaceName) => void;
  autoRotate?: boolean;
}

const InteractiveCubeScene = ({ 
  cubeState, 
  highlightFaces = [], 
  allowedFaces = [],
  onFaceClick,
  autoRotate = false 
}: InteractiveCubeSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [time, setTime] = useState(0);

  useFrame((state) => {
    setTime(state.clock.elapsedTime);
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1 + 0.3;
    }
  });

  // Pulsing effect for highlighted faces
  const pulseIntensity = Math.sin(time * 3) * 0.5 + 0.5;

  const cubelets = useMemo(() => {
    const pieces: JSX.Element[] = [];
    const allFaces: FaceName[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    const hasRestrictions = allowedFaces.length > 0;
    
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const colors: CubeletProps['colors'] = {};
          
          if (z === 1) colors.front = cubeState.front[1 - y]?.[x + 1] || CUBE_COLORS.black;
          if (z === -1) colors.back = cubeState.back[1 - y]?.[1 - x] || CUBE_COLORS.black;
          if (x === -1) colors.left = cubeState.left[1 - y]?.[1 - z] || CUBE_COLORS.black;
          if (x === 1) colors.right = cubeState.right[1 - y]?.[z + 1] || CUBE_COLORS.black;
          if (y === 1) colors.top = cubeState.top[1 - z]?.[x + 1] || CUBE_COLORS.black;
          if (y === -1) colors.bottom = cubeState.bottom[z + 1]?.[x + 1] || CUBE_COLORS.black;

          // Determine which faces on this cubelet should glow
          const cubeletGlowFaces = highlightFaces.filter(face => {
            if (face === 'right' && x === 1) return true;
            if (face === 'left' && x === -1) return true;
            if (face === 'top' && y === 1) return true;
            if (face === 'bottom' && y === -1) return true;
            if (face === 'front' && z === 1) return true;
            if (face === 'back' && z === -1) return true;
            return false;
          });

          // Determine if cubelet is dimmed (not on an allowed face)
          const isDimmed = hasRestrictions && !allowedFaces.some(face => {
            if (face === 'right' && x === 1) return true;
            if (face === 'left' && x === -1) return true;
            if (face === 'top' && y === 1) return true;
            if (face === 'bottom' && y === -1) return true;
            if (face === 'front' && z === 1) return true;
            if (face === 'back' && z === -1) return true;
            return false;
          });

          pieces.push(
            <Cubelet
              key={`${x}-${y}-${z}`}
              position={[x, y, z]}
              colors={colors}
              glowFaces={cubeletGlowFaces}
              dimmed={isDimmed}
              onFaceClick={onFaceClick}
            />
          );
        }
      }
    }
    return pieces;
  }, [cubeState, highlightFaces, allowedFaces, onFaceClick]);

  return (
    <group ref={groupRef}>
      {cubelets}
    </group>
  );
};

interface InteractiveCube3DProps {
  cubeState: CubeState;
  highlightFaces?: FaceName[];
  allowedFaces?: FaceName[];
  onFaceClick?: (face: FaceName) => void;
  autoRotate?: boolean;
  className?: string;
}

export const InteractiveCube3D = ({
  cubeState,
  highlightFaces = [],
  allowedFaces = [],
  onFaceClick,
  autoRotate = false,
  className = '',
}: InteractiveCube3DProps) => {
  return (
    <div className={`w-full h-64 md:h-80 ${className}`}>
      <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <InteractiveCubeScene
          cubeState={cubeState}
          highlightFaces={highlightFaces}
          allowedFaces={allowedFaces}
          onFaceClick={onFaceClick}
          autoRotate={autoRotate}
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

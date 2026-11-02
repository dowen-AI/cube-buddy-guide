import { useEffect, useMemo } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CUBE_COLORS, type CubeState, type MoveName } from '@/hooks/useCubeState';
import { cubeletFaces, isInMoveLayer, stickerIndex, type Face } from '@/lib/cubeGeometry';
import { useInView } from '@/hooks/useInView';

const GREY = '#a3a8b3';
const ARROW = '#d946ef';
const ARROW_EDGE = '#1a1a1a';

const STICKER: Record<Face, { pos: [number, number, number]; rot: [number, number, number] }> = {
  right: { pos: [0.476, 0, 0], rot: [0, Math.PI / 2, 0] },
  left: { pos: [-0.476, 0, 0], rot: [0, -Math.PI / 2, 0] },
  top: { pos: [0, 0.476, 0], rot: [-Math.PI / 2, 0, 0] },
  bottom: { pos: [0, -0.476, 0], rot: [Math.PI / 2, 0, 0] },
  front: { pos: [0, 0, 0.476], rot: [0, 0, 0] },
  back: { pos: [0, 0, -0.476], rot: [0, Math.PI, 0] },
};

const dim = (hex: string) => `#${new THREE.Color(hex).multiplyScalar(0.38).getHexString()}`;

// Flat arrow pointing +X, centred on the origin in the XY plane.
const straightArrow = (length: number, width: number, head: number) => {
  const s = new THREE.Shape();
  const half = length / 2;
  s.moveTo(-half, -width / 2);
  s.lineTo(half - head, -width / 2);
  s.lineTo(half - head, -width * 1.3);
  s.lineTo(half, 0);
  s.lineTo(half - head, width * 1.3);
  s.lineTo(half - head, width / 2);
  s.lineTo(-half, width / 2);
  s.closePath();
  return new THREE.ShapeGeometry(s);
};

// Flat circular arrow in the XY plane, clockwise (as seen from +Z) when cw.
const arcArrow = (radius: number, width: number, cw: boolean) => {
  const s = new THREE.Shape();
  const a0 = cw ? Math.PI * 0.9 : Math.PI * 0.1;
  const a1 = cw ? -Math.PI * 0.35 : Math.PI * 1.35;
  const steps = 32;
  const pt = (r: number, a: number) => new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
  const outer = [], inner = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    outer.push(pt(radius + width / 2, a));
    inner.push(pt(radius - width / 2, a));
  }
  s.setFromPoints([...outer, ...inner.reverse()]);
  const head = new THREE.Shape();
  const dir = cw ? -1 : 1;
  const tip = pt(radius, a1 + dir * 0.32);
  head.moveTo(pt(radius + width * 1.4, a1).x, pt(radius + width * 1.4, a1).y);
  head.lineTo(tip.x, tip.y);
  head.lineTo(pt(radius - width * 1.4, a1).x, pt(radius - width * 1.4, a1).y);
  head.closePath();
  return new THREE.ShapeGeometry([s, head]);
};

// Arrows are drawn where a beginner holding the cube can see them: on the
// front face for R, L, U, D and F, and along the back edge of the top for B.
const MoveArrow = ({ move }: { move: MoveName }) => {
  const base = move[0];
  const prime = move.endsWith("'");
  const { geometry, edge, position, rotation } = useMemo(() => {
    const zFront = 1.53;
    if (base === 'F') {
      return { geometry: arcArrow(0.95, 0.16, !prime), edge: arcArrow(0.95, 0.27, !prime), position: [0, 0, zFront] as const, rotation: [0, 0, 0] as const };
    }
    const g = straightArrow(2.9, 0.16, 0.42);
    const e = straightArrow(3.05, 0.27, 0.5);
    const dirAngle: Record<string, number> = {
      R: prime ? -Math.PI / 2 : Math.PI / 2,
      L: prime ? Math.PI / 2 : -Math.PI / 2,
      U: prime ? 0 : Math.PI,
      D: prime ? Math.PI : 0,
      B: prime ? 0 : Math.PI,
    };
    if (base === 'B') return { geometry: g, edge: e, position: [0, 1.53, -1] as const, rotation: [-Math.PI / 2, 0, dirAngle.B] as const };
    const pos: Record<string, [number, number, number]> = { R: [1, 0, zFront], L: [-1, 0, zFront], U: [0, 1, zFront], D: [0, -1, zFront] };
    return { geometry: g, edge: e, position: pos[base], rotation: [0, 0, dirAngle[base]] as const };
  }, [base, prime]);
  return (
    <group position={position as unknown as THREE.Vector3Tuple} rotation={rotation as unknown as THREE.Vector3Tuple}>
      <mesh geometry={edge} position={[0, 0, -0.005]} renderOrder={1}>
        <meshBasicMaterial color={ARROW_EDGE} depthTest={false} transparent />
      </mesh>
      <mesh geometry={geometry} renderOrder={2}>
        <meshBasicMaterial color={ARROW} depthTest={false} transparent />
      </mesh>
    </group>
  );
};

interface CubeSceneProps {
  colors: CubeState;
  vis?: CubeState;
  move?: MoveName | null;
  onFaceClick?: (face: Face) => void;
}

const CubeScene = ({ colors, vis, move, onFaceClick }: CubeSceneProps) => {
  const cubelets = useMemo(() => {
    const out: JSX.Element[] = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const inLayer = !move || isInMoveLayer(move, x, y, z);
      out.push(
        <group key={`${x}${y}${z}`} position={[x, y, z]}>
          {cubeletFaces(x, y, z).map((face) => {
            const [r, c] = stickerIndex(face, x, y, z);
            const shown = !vis || vis[face][r][c] === '1';
            const base = shown ? colors[face][r][c] : GREY;
            const color = inLayer ? base : dim(base);
            const click = onFaceClick
              ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onFaceClick(face); }
              : undefined;
            return (
              <mesh key={face} position={STICKER[face].pos} rotation={STICKER[face].rot} onClick={click}>
                <planeGeometry args={[0.82, 0.82]} />
                <meshStandardMaterial color={color} />
              </mesh>
            );
          })}
          <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={3}>
            <meshStandardMaterial color={CUBE_COLORS.black} />
          </RoundedBox>
        </group>,
      );
    }
    return out;
  }, [colors, vis, move, onFaceClick]);

  return (
    <group>
      {cubelets}
      {move && <MoveArrow move={move} />}
    </group>
  );
};

// Keep the whole cube (and its arrow) in frame whatever the canvas shape:
// back the camera off far enough for both the vertical and horizontal field of view.
const VIEW_DIRECTION: Record<'top' | 'bottom', [number, number, number]> = { top: [4.2, 3.4, 4.2], bottom: [4.2, -3.4, 4.2] };

const FitCamera = ({ view }: { view: 'top' | 'bottom' }) => {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const vfov = (cam.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (size.width / Math.max(size.height, 1)));
    const radius = 2.75;
    const dist = radius / Math.sin(Math.min(vfov, hfov) / 2);
    const dir = new THREE.Vector3(...VIEW_DIRECTION[view]).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, view, invalidate]);
  return null;
};

interface InteractiveCube3DProps {
  colors: CubeState;
  vis?: CubeState;
  move?: MoveName | null;
  view?: 'top' | 'bottom';
  onFaceClick?: (face: Face) => void;
  className?: string;
  label?: string;
}

export const InteractiveCube3D = ({ colors, vis, move, view = 'top', onFaceClick, className = 'w-full h-64 md:h-80', label }: InteractiveCube3DProps) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={className} role="img" aria-label={label ?? '3D cube'}>
      {/* keyed by view so the camera resets when switching between top and bottom views */}
      <Canvas key={view} camera={{ position: VIEW_DIRECTION[view], fov: 38 }} frameloop={inView ? 'demand' : 'never'}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[10, view === 'bottom' ? -10 : 10, 5]} intensity={0.9} />
        <directionalLight position={[-10, 0, -5]} intensity={0.3} />
        <FitCamera view={view} />
        <CubeScene colors={colors} vis={vis} move={move} onFaceClick={onFaceClick} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
};

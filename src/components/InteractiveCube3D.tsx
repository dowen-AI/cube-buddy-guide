import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CUBE_COLORS, type CubeState, type MoveName } from '@/hooks/useCubeState';
import { ANY_COLOR, cubeletFaces, hiddenFaceView, isInMoveLayer, moveArrow, moveRotation, stickerIndex, type CubeView, type Face } from '@/lib/cubeGeometry';
import { useInView } from '@/hooks/useInView';

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

// Stickers outside the turning layer are toned down so the eye goes to what moves.
const dim = (hex: string) => `#${new THREE.Color(hex).multiplyScalar(0.55).getHexString()}`;

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
  const { geometry, edge, position, rotation } = useMemo(() => {
    const spec = moveArrow(move);
    const out = 1.53; // just proud of the stickers
    if (spec.kind === 'arc') {
      return { geometry: arcArrow(0.95, 0.16, spec.clockwise), edge: arcArrow(0.95, 0.27, spec.clockwise), position: [0, 0, out] as const, rotation: [0, 0, 0] as const };
    }
    const g = straightArrow(2.9, 0.16, 0.42);
    const e = straightArrow(3.05, 0.27, 0.5);
    const [x, y, z] = spec.at;
    const [dx, dy] = spec.dir;
    if (spec.on === 'top') return { geometry: g, edge: e, position: [x, out, z] as const, rotation: [-Math.PI / 2, 0, dx > 0 ? 0 : Math.PI] as const };
    return { geometry: g, edge: e, position: [x, y, out] as const, rotation: [0, 0, Math.atan2(dy, dx)] as const };
  }, [move]);
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

interface SceneProps {
  colors: CubeState;
  vis?: CubeState;
  move?: MoveName | null;
  animate: boolean;
  loop: boolean;
  speed: number;
  onFaceClick?: (face: Face) => void;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// The layer being turned: it rotates the way the real layer does, pauses so the
// result can be seen, then (when looping) snaps back and shows it again.
const TurningLayer = ({ move, animate, loop, speed, children }: { move: MoveName; animate: boolean; loop: boolean; speed: number; children: React.ReactNode }) => {
  const ref = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const { axis, quarters } = moveRotation(move);
  const turn = (Math.abs(quarters) === 2 ? 1.3 : 0.9) / speed;
  const hold = 0.7 / speed;
  const rest = 0.45 / speed;
  useEffect(() => { clock.current = 0; if (ref.current) ref.current.rotation.set(0, 0, 0); }, [move, animate]);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g || !animate) return;
    clock.current += Math.min(delta, 0.1);
    const period = rest + turn + hold;
    const t = loop ? clock.current % period : Math.min(clock.current, period - 0.001);
    const progress = t < rest ? 0 : t < rest + turn ? ease((t - rest) / turn) : 1;
    g.rotation[axis] = progress * quarters * (Math.PI / 2);
  });
  return <group ref={ref}>{children}</group>;
};

const CubeScene = ({ colors, vis, move, animate, loop, speed, onFaceClick }: SceneProps) => {
  const { still, turning } = useMemo(() => {
    const still: JSX.Element[] = [];
    const turning: JSX.Element[] = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const inLayer = Boolean(move) && isInMoveLayer(move!, x, y, z);
      const el = (
        <group key={`${x}${y}${z}`} position={[x, y, z]}>
          {cubeletFaces(x, y, z).map((face) => {
            const [r, c] = stickerIndex(face, x, y, z);
            const shown = !vis || vis[face][r][c] === '1';
            const base = shown ? colors[face][r][c] : ANY_COLOR;
            const color = !move || inLayer ? base : dim(base);
            const click = onFaceClick
              ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onFaceClick(face); }
              : undefined;
            return (
              // Unlit, so white looks white and never reads as grey.
              <mesh key={face} position={STICKER[face].pos} rotation={STICKER[face].rot} onClick={click}>
                <planeGeometry args={[0.82, 0.82]} />
                <meshBasicMaterial color={color} />
              </mesh>
            );
          })}
          <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.08} smoothness={3}>
            <meshStandardMaterial color={CUBE_COLORS.black} />
          </RoundedBox>
        </group>
      );
      (inLayer ? turning : still).push(el);
    }
    return { still, turning };
  }, [colors, vis, move, onFaceClick]);

  return (
    <group>
      {still}
      {move ? <TurningLayer move={move} animate={animate} loop={loop} speed={speed}>{turning}</TurningLayer> : null}
      {move && <MoveArrow move={move} />}
    </group>
  );
};

// Keep the whole cube (and its arrow) in frame whatever the canvas shape:
// back the camera off far enough for both the vertical and horizontal field of view.
const VIEW_DIRECTION: Record<CubeView, [number, number, number]> = {
  top: [4.2, 3.4, 4.2],
  bottom: [4.2, -3.4, 4.2],
  left: [-4.2, 3.4, 4.2],
  back: [4.2, 3.4, -4.2],
};
const VIEW_LABEL: Record<Exclude<CubeView, 'top'>, string> = { bottom: 'From below', left: 'From the left', back: 'From behind' };
const VIEW_TAG = 'pointer-events-none absolute inset-x-0 bottom-0 bg-background/85 px-1 text-center text-sm font-semibold leading-tight text-foreground';

const FitCamera = ({ view }: { view: CubeView }) => {
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

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface InteractiveCube3DProps {
  colors: CubeState;
  vis?: CubeState;
  move?: MoveName | null;
  view?: 'top' | 'bottom';
  onFaceClick?: (face: Face) => void;
  className?: string;
  label?: string;
  // the layer turns on screen (looping) unless the person's device asks for reduced motion
  animate?: boolean;
  loop?: boolean;
  speed?: number;
  // always show this second view (used on check screens to show the bottom face as well)
  extraView?: Exclude<CubeView, 'top'>;
}

const CubeCanvas = ({ view, running, controls, ...scene }: SceneProps & { view: CubeView; running: boolean; controls: boolean }) => (
  // keyed by view so the camera resets when the viewpoint changes
  <Canvas key={view} camera={{ position: VIEW_DIRECTION[view], fov: 38 }} frameloop={running ? 'always' : 'demand'}>
    <ambientLight intensity={0.75} />
    <directionalLight position={[10, view === 'bottom' ? -10 : 10, 5]} intensity={0.9} />
    <directionalLight position={[-10, 0, -5]} intensity={0.3} />
    <FitCamera view={view} />
    <CubeScene {...scene} />
    {controls ? <OrbitControls enableZoom={false} enablePan={false} /> : null}
  </Canvas>
);

export const InteractiveCube3D = ({ colors, vis, move, view = 'top', onFaceClick, className = 'w-full h-64 md:h-80', label, animate = true, loop = true, speed = 1, extraView }: InteractiveCube3DProps) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [reduced] = useState(prefersReducedMotion);
  const moving = Boolean(move) && animate && !reduced;
  const running = moving && inView;
  // A turn of the bottom, left or back can't be seen from the front: add a second, small view of that face.
  const inset = extraView ?? (move ? hiddenFaceView(move) : null);
  const scene: SceneProps = { colors, vis, move, animate: moving, loop, speed, onFaceClick };
  const split = Boolean(inset) && inset !== view;
  return (
    // The caller's classes size and place the cube (often "absolute inset-0"). Never add
    // "relative" to this element: it would override "absolute" and collapse the canvas
    // to its 150px default.
    <div ref={ref} className={className} role="img" aria-label={label ?? '3D cube'} data-animating={running || undefined}>
      {/* A second view sits BESIDE the main one, so it never covers the piece being looked at. */}
      <div className="flex h-full w-full">
        <div className="relative min-w-0 flex-1">
          {inView ? <CubeCanvas view={view} running={running} controls {...scene} /> : null}
          {split ? <span className={VIEW_TAG}>{view === 'top' ? 'From the front' : VIEW_LABEL[view]}</span> : null}
        </div>
        {split && inset ? (
          <div className="relative w-[42%] shrink-0 border-l-2 border-fuchsia-500 bg-background/50" data-testid="inset-view" data-view={inset}>
            {inView ? <CubeCanvas view={inset} running={running} controls={false} {...scene} onFaceClick={undefined} /> : null}
            <span className={VIEW_TAG}>{VIEW_LABEL[inset]}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

import { CUBE_COLORS, type CubeState } from '@/hooks/useCubeState';
import { stickerIndex, type Face } from '@/lib/cubeGeometry';
import type { Demo } from '@/lib/cubeDemo';
import type { TopPattern } from '@/data/followAlong';

const GREY = '#a3a8b3';
const COS30 = Math.cos(Math.PI / 6);

type P3 = [number, number, number];

// Flat isometric drawing of the three faces visible from the front-right,
// either from above (top, front, right) or from below (bottom, front, right).
export const CubePicture = ({ demo, colors, view = 'top', size = 72, title }: { demo?: Demo; colors?: CubeState; view?: 'top' | 'bottom'; size?: number; title?: string }) => {
  const state = demo?.colors ?? colors!;
  const project = ([x, y, z]: P3): [number, number] => {
    const sx = (x - z) * COS30;
    const sy = view === 'top' ? -y + (x + z) * 0.5 : y + (x + z) * 0.5;
    return [sx, view === 'top' ? sy : -sy + 0];
  };
  const faces: Face[] = view === 'top' ? ['top', 'front', 'right'] : ['bottom', 'front', 'right'];
  const polys: { pts: string; fill: string }[] = [];
  for (const face of faces) {
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      // (a, b) = the two in-plane coordinates of the cubelet on this face
      const [x, y, z]: P3 =
        face === 'front' ? [a, b, 1] : face === 'right' ? [1, b, a] : face === 'top' ? [a, 1, b] : [a, -1, b];
      const [r, c] = stickerIndex(face, x, y, z);
      const visible = !demo || demo.vis[face][r][c] === '1';
      const fill = visible ? state[face][r][c] : GREY;
      const h = 0.43;
      const corners: P3[] =
        face === 'front' ? [[x - h, y - h, 1.5], [x + h, y - h, 1.5], [x + h, y + h, 1.5], [x - h, y + h, 1.5]]
          : face === 'right' ? [[1.5, y - h, z - h], [1.5, y - h, z + h], [1.5, y + h, z + h], [1.5, y + h, z - h]]
            : [[x - h, y > 0 ? 1.5 : -1.5, z - h], [x + h, y > 0 ? 1.5 : -1.5, z - h], [x + h, y > 0 ? 1.5 : -1.5, z + h], [x - h, y > 0 ? 1.5 : -1.5, z + h]];
      polys.push({ pts: corners.map((p) => project(p).map((v) => v.toFixed(3)).join(',')).join(' '), fill });
    }
  }
  const outline = faces.map((face) => {
    const e = 1.5;
    const c: P3[] = face === 'front' ? [[-e, -e, e], [e, -e, e], [e, e, e], [-e, e, e]]
      : face === 'right' ? [[e, -e, -e], [e, -e, e], [e, e, e], [e, e, -e]]
        : [[-e, face === 'top' ? e : -e, -e], [e, face === 'top' ? e : -e, -e], [e, face === 'top' ? e : -e, e], [-e, face === 'top' ? e : -e, e]];
    return c.map((p) => project(p).map((v) => v.toFixed(3)).join(',')).join(' ');
  });
  return (
    <svg viewBox="-2.75 -2.75 5.5 5.5" width={size} height={size} role="img" aria-label={title ?? 'Cube picture'}>
      {outline.map((pts, i) => <polygon key={i} points={pts} fill={CUBE_COLORS.black} stroke={CUBE_COLORS.black} strokeWidth={0.12} strokeLinejoin="round" />)}
      {polys.map((p, i) => <polygon key={i} points={p.pts} fill={p.fill} />)}
    </svg>
  );
};

// Top face only, flat, for the Stage 4 "which pattern do you see?" question.
export const TopPatternPicture = ({ pattern, size = 72 }: { pattern: TopPattern; size?: number }) => {
  const yellowEdges: Record<TopPattern, [boolean, boolean, boolean, boolean]> = {
    // [back, left, right, front]
    dot: [false, false, false, false],
    l: [true, true, false, false],
    line: [false, true, true, false],
    cross: [true, true, true, true],
  };
  const [back, left, right, front] = yellowEdges[pattern];
  const cell = (r: number, c: number) => {
    if (r === 1 && c === 1) return CUBE_COLORS.yellow;
    if (r === 0 && c === 1) return back ? CUBE_COLORS.yellow : GREY;
    if (r === 1 && c === 0) return left ? CUBE_COLORS.yellow : GREY;
    if (r === 1 && c === 2) return right ? CUBE_COLORS.yellow : GREY;
    if (r === 2 && c === 1) return front ? CUBE_COLORS.yellow : GREY;
    return GREY;
  };
  return (
    <svg viewBox="0 0 34 38" width={size} height={size * (38 / 34)} role="img" aria-label={`Top view: ${pattern === 'l' ? 'L-shape' : pattern}`}>
      <rect x="0" y="0" width="34" height="34" rx="3" fill={CUBE_COLORS.black} />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={1.5 + c * 10.5} y={1.5 + r * 10.5} width="10" height="10" rx="1.5" fill={cell(r, c)} />
      )))}
      <text x="17" y="37.5" textAnchor="middle" fontSize="3.6" fill="currentColor">FRONT (toward you)</text>
    </svg>
  );
};

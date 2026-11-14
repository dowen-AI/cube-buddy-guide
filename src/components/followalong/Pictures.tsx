import { CUBE_COLORS, type CubeState } from '@/hooks/useCubeState';
import { ANY_COLOR, stickerIndex, type Face } from '@/lib/cubeGeometry';
import { TOP_CORNERS, cornerInSpot, edgeMatches, yellowTopEdges, type Demo } from '@/lib/cubeDemo';

const GREY = ANY_COLOR;
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

// The top face only, flat, drawn from a simulated cube: yellow where the top
// sticker is yellow, "any color" grey everywhere else. Used for Stage 4, where
// only the yellow shape on top matters.
export const topShapeName = (s: CubeState) => {
  const [f, r, b, l] = yellowTopEdges(s);
  const n = [f, r, b, l].filter(Boolean).length;
  return n === 0 ? 'dot' : n === 4 ? 'cross' : n === 2 ? ((f && b) || (l && r) ? 'line' : 'L shape') : `${n} yellow edges`;
};
export const TopFacePicture = ({ demo, size = 72 }: { demo: Demo; size?: number }) => {
  // yellow edges and the center; corners are never part of the shape
  const cell = (r: number, c: number) => (demo.colors.top[r][c] === CUBE_COLORS.yellow && (r + c) % 2 === 1 || (r === 1 && c === 1) ? CUBE_COLORS.yellow : GREY);
  // The caption must stay readable (14px or more) at any picture size.
  const font = Math.max(3.6, (14 / size) * 34);
  const caption = size >= 130 ? 'FRONT (toward you)' : '▼ YOU';
  const h = 34 + font + 1.5;
  return (
    <svg viewBox={`0 0 34 ${h}`} width={size} height={size * (h / 34)} role="img" aria-label={`Top view: ${topShapeName(demo.colors)}`}>
      <rect x="0" y="0" width="34" height="34" rx="3" fill={CUBE_COLORS.black} />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={1.5 + c * 10.5} y={1.5 + r * 10.5} width="10" height="10" rx="1.5" fill={cell(r, c)} data-cell={`${r}${c}`} data-yellow={cell(r, c) === CUBE_COLORS.yellow || undefined} />
      )))}
      <text x="17" y={34 + font} textAnchor="middle" fontSize={font} fontWeight="600" fill="currentColor">{caption}</text>
    </svg>
  );
};

// Looking straight down at the top face, with the top row of each side folded
// out around it and that side's center beyond. Ticks mark what already matches,
// so the person compares pictures instead of counting.
export const TopDownPicture = ({ demo, marks, size = 72 }: { demo: Demo; marks: 'edges' | 'corners'; size?: number }) => {
  const s = demo.colors;
  const col = (f: Face, r: number, c: number) => (demo.vis[f][r][c] === '1' ? s[f][r][c] : GREY);
  const cells: { x: number; y: number; fill: string; small?: boolean }[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push({ x: 2 + c, y: 2 + r, fill: col('top', r, c) });
  for (let c = 0; c < 3; c++) {
    cells.push({ x: 2 + c, y: 5, fill: col('front', 0, c) });
    cells.push({ x: 4 - c, y: 1, fill: col('back', 0, c) });
    cells.push({ x: 5, y: 4 - c, fill: col('right', 0, c) });
    cells.push({ x: 1, y: 2 + c, fill: col('left', 0, c) });
  }
  // each side's center, drawn smaller just beyond its strip
  cells.push({ x: 3, y: 6, fill: s.front[1][1], small: true }, { x: 3, y: 0, fill: s.back[1][1], small: true }, { x: 6, y: 3, fill: s.right[1][1], small: true }, { x: 0, y: 3, fill: s.left[1][1], small: true });
  const ticks: [number, number][] = [];
  if (marks === 'edges') {
    const where: [number, number][] = [[3, 5], [5, 3], [3, 1], [1, 3]]; // front, right, back, left
    edgeMatches(s).forEach((ok, i) => { if (ok) ticks.push(where[i]); });
  } else {
    const where: [number, number][] = [[4, 4], [4, 2], [2, 2], [2, 4]]; // front-right, back-right, back-left, front-left
    TOP_CORNERS.forEach((k, i) => { if (cornerInSpot(s, k)) ticks.push(where[i]); });
  }
  const U = 10;
  const font = Math.max(4, (14 / size) * 70);
  const h = 70 + font + 2;
  return (
    <svg viewBox={`0 0 70 ${h}`} width={size} height={size * (h / 70)} role="img" aria-label={`Looking down at the top: ${ticks.length} ${marks === 'edges' ? 'edges match' : 'corners are home'}`}>
      <rect x={U * 2 - 1} y={U * 2 - 1} width={U * 3 + 2} height={U * 3 + 2} rx="2" fill={CUBE_COLORS.black} />
      {cells.map((c, i) => c.small
        ? <circle key={i} cx={c.x * U + U / 2} cy={c.y * U + U / 2} r={U * 0.36} fill={c.fill} stroke={CUBE_COLORS.black} strokeWidth="0.8" />
        : <rect key={i} x={c.x * U + 0.6} y={c.y * U + 0.6} width={U - 1.2} height={U - 1.2} rx="1.5" fill={c.fill} stroke={CUBE_COLORS.black} strokeWidth="0.8" />)}
      {ticks.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x * U + U / 2} cy={y * U + U / 2} r={U * 0.4} fill="#16a34a" stroke="#fff" strokeWidth="0.8" />
          <path d={`M ${x * U + 2.9} ${y * U + 5.2} l 1.6 1.7 l 3 -3.6`} fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <text x="35" y={70 + font} textAnchor="middle" fontSize={font} fontWeight="600" fill="currentColor">▼ YOU</text>
    </svg>
  );
};

// The three kinds of pieces, drawn as the stickers you can see on each one.
const Sticker = ({ points, fill }: { points: string; fill: string }) => <polygon points={points} fill={fill} stroke={CUBE_COLORS.black} strokeWidth={2.5} strokeLinejoin="round" />;
export const PieceTypes = () => {
  const items: { name: string; note: string; art: JSX.Element }[] = [
    { name: 'CENTER', note: '1 color · never moves', art: <Sticker points="12,12 44,12 44,44 12,44" fill={CUBE_COLORS.yellow} /> },
    {
      name: 'EDGE', note: '2 colors',
      art: <><Sticker points="14,8 42,8 42,28 14,28" fill={CUBE_COLORS.yellow} /><Sticker points="14,28 42,28 42,48 14,48" fill={CUBE_COLORS.red} /></>,
    },
    {
      name: 'CORNER', note: '3 colors',
      art: <><Sticker points="28,6 48,17 28,28 8,17" fill={CUBE_COLORS.yellow} /><Sticker points="8,17 28,28 28,50 8,39" fill={CUBE_COLORS.red} /><Sticker points="28,28 48,17 48,39 28,50" fill={CUBE_COLORS.green} /></>,
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-2" data-testid="piece-types">
      {items.map((it) => (
        <div key={it.name} className="flex flex-col items-center rounded-xl border border-border bg-background px-1 py-1.5 text-center">
          <svg viewBox="0 0 56 56" width={48} height={48} role="img" aria-label={`${it.name.toLowerCase()} piece`}>{it.art}</svg>
          <span className="text-sm font-bold text-foreground">{it.name}</span>
          <span className="text-sm leading-tight text-muted-foreground">{it.note}</span>
        </div>
      ))}
    </div>
  );
};

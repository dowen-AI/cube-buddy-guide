import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CubeState, CUBE_COLORS } from '@/hooks/useCubeState';

export type FaceName = keyof CubeState;

export const COLOR_NAMES: Record<string, string> = {
  [CUBE_COLORS.yellow]: 'Yellow',
  [CUBE_COLORS.green]: 'Green',
  [CUBE_COLORS.red]: 'Red',
  [CUBE_COLORS.white]: 'White',
  [CUBE_COLORS.blue]: 'Blue',
  [CUBE_COLORS.orange]: 'Orange',
};

export const FACE_LABELS: Record<FaceName, { letter: string; name: string }> = {
  top: { letter: 'U', name: 'Top' },
  left: { letter: 'L', name: 'Left' },
  front: { letter: 'F', name: 'Front' },
  right: { letter: 'R', name: 'Right' },
  back: { letter: 'B', name: 'Back' },
  bottom: { letter: 'D', name: 'Bottom' },
};

// One face at a time, in the order a beginner can reach them by turning the
// cube: each step says how to hold the cube so that face looks straight at you,
// and how its rows/columns line up with the panel (so nothing gets mirrored).
// Row/column directions follow the net layout in src/lib/cubeGeometry.ts.
export const PAINT_STEPS: { face: FaceName; center: string; hold: string; lineUp: string }[] = [
  {
    face: 'front',
    center: 'red',
    hold: 'Hold your cube with the YELLOW center on top and the RED center facing you.',
    lineUp: 'Paint exactly what you see. The top row here is the row touching yellow.',
  },
  {
    face: 'top',
    center: 'yellow',
    hold: 'Keep red facing you, then tip the top of the cube toward you until YELLOW faces you.',
    lineUp: 'Red is now at the bottom: the row touching red is the BOTTOM row here.',
  },
  {
    face: 'right',
    center: 'green',
    hold: 'Go back to the start (yellow on top, red facing you). Turn the whole cube a quarter turn to the LEFT so GREEN faces you. Yellow stays on top.',
    lineUp: 'The column touching red is the LEFT column here.',
  },
  {
    face: 'back',
    center: 'orange',
    hold: 'Turn the whole cube another quarter turn to the LEFT so ORANGE faces you. Yellow still on top.',
    lineUp: 'The column touching green is the LEFT column here.',
  },
  {
    face: 'left',
    center: 'blue',
    hold: 'Turn the whole cube another quarter turn to the LEFT so BLUE faces you. Yellow still on top.',
    lineUp: 'The column touching orange is the LEFT column; the one touching red is the RIGHT column.',
  },
  {
    face: 'bottom',
    center: 'white',
    hold: 'Turn once more so red faces you again, then tip the top of the cube AWAY from you until WHITE faces you.',
    lineUp: 'Red is now at the top: the row touching red is the TOP row here.',
  },
];

export const stickerKey = (face: FaceName, r: number, c: number) => `${face}-${r}-${c}`;

const stickerLabel = (face: FaceName, r: number, c: number, color: string) => {
  const { name } = FACE_LABELS[face];
  const colorName = COLOR_NAMES[color] ?? color;
  return r === 1 && c === 1
    ? `${name} face center, ${colorName} (fixed)`
    : `${name} face, row ${r + 1}, column ${c + 1}, currently ${colorName}`;
};

// The face being painted, big enough to tap with a thumb (56px stickers).
export const FacePainter = ({
  face,
  grid,
  onPaint,
  highlight,
  disabled,
}: {
  face: FaceName;
  grid: string[][];
  onPaint: (row: number, col: number) => void;
  highlight: Set<string>;
  disabled?: boolean;
}) => (
  <div role="group" aria-label={`${FACE_LABELS[face].name} face (${FACE_LABELS[face].letter})`} className="mx-auto grid w-fit grid-cols-3 gap-1.5 rounded-xl bg-foreground/85 p-1.5">
    {grid.map((row, r) =>
      row.map((color, c) => {
        const isCenter = r === 1 && c === 1;
        const flagged = highlight.has(stickerKey(face, r, c));
        return (
          <button
            key={stickerKey(face, r, c)}
            type="button"
            aria-label={stickerLabel(face, r, c, color) + (flagged ? ' — check this one' : '')}
            disabled={isCenter || disabled}
            onClick={() => onPaint(r, c)}
            className={cn(
              'h-14 w-14 rounded-lg border-2 border-black/10 transition-transform',
              !isCenter && !disabled && 'active:scale-95',
              isCenter && 'cursor-default',
              flagged && 'ring-4 ring-fuchsia-500 ring-offset-2 ring-offset-foreground animate-pulse',
            )}
            style={{ backgroundColor: color }}
          >
            {isCenter ? <span className="text-[10px] font-bold uppercase text-black/50">fixed</span> : null}
          </button>
        );
      }),
    )}
  </div>
);

// The whole cube unfolded. Each panel is one button that switches the painter to that face.
export const NetOverview = ({
  cubeState,
  current,
  onSelect,
  highlight,
  done,
}: {
  cubeState: CubeState;
  current: FaceName;
  onSelect: (face: FaceName) => void;
  highlight: Set<string>;
  done: Set<FaceName>;
}) => {
  const panel = (face: FaceName, pos: string) => {
    const { name, letter } = FACE_LABELS[face];
    const center = COLOR_NAMES[cubeState[face][1][1]];
    return (
      <button
        type="button"
        onClick={() => onSelect(face)}
        aria-label={`Paint the ${name} face (${center} center)`}
        aria-pressed={face === current}
        className={cn(
          'relative flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg border-2 p-1',
          face === current ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted',
          pos,
        )}
      >
        <span aria-hidden="true" className="grid grid-cols-3 gap-px rounded-sm bg-foreground/80 p-px">
          {cubeState[face].map((row, r) =>
            row.map((color, c) => (
              <span
                key={stickerKey(face, r, c)}
                className={cn('h-3 w-3 rounded-[2px]', highlight.has(stickerKey(face, r, c)) && 'outline outline-2 outline-fuchsia-500')}
                style={{ backgroundColor: color }}
              />
            )),
          )}
        </span>
        <span aria-hidden="true" className="text-[10px] font-medium leading-none text-muted-foreground">{name} ({letter})</span>
        {done.has(face) ? <Check aria-hidden="true" className="absolute right-0 top-0 h-3.5 w-3.5 text-cube-green" /> : null}
      </button>
    );
  };
  return (
    <div className="mx-auto grid w-fit grid-cols-4 gap-1" aria-label="Your cube, unfolded">
      {panel('top', 'col-start-2 row-start-1')}
      {panel('left', 'col-start-1 row-start-2')}
      {panel('front', 'col-start-2 row-start-2')}
      {panel('right', 'col-start-3 row-start-2')}
      {panel('back', 'col-start-4 row-start-2')}
      {panel('bottom', 'col-start-2 row-start-3')}
    </div>
  );
};

export const ColorPalette = ({ selected, onSelect }: { selected: string; onSelect: (color: string) => void }) => (
  <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Paint color">
    {Object.entries(COLOR_NAMES).map(([color, name]) => (
      <button
        key={color}
        type="button"
        aria-label={`Paint with ${name}`}
        aria-pressed={selected === color}
        onClick={() => onSelect(color)}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
          selected === color ? 'scale-110 border-primary shadow-md ring-2 ring-primary ring-offset-2 ring-offset-card' : 'border-border',
        )}
        style={{ backgroundColor: color }}
      >
        {selected === color ? <Check className={cn('h-5 w-5', color === CUBE_COLORS.white || color === CUBE_COLORS.yellow ? 'text-black' : 'text-white')} /> : null}
      </button>
    ))}
  </div>
);

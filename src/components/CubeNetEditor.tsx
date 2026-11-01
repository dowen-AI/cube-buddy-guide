import { cn } from '@/lib/utils';
import { CubeState, CUBE_COLORS } from '@/hooks/useCubeState';

type FaceName = keyof CubeState;

interface CubeNetEditorProps {
  cubeState: CubeState;
  onPaint: (face: FaceName, row: number, col: number) => void;
  disabled?: boolean;
}

const COLOR_NAMES: Record<string, string> = {
  [CUBE_COLORS.yellow]: 'Yellow',
  [CUBE_COLORS.green]: 'Green',
  [CUBE_COLORS.red]: 'Red',
  [CUBE_COLORS.white]: 'White',
  [CUBE_COLORS.blue]: 'Blue',
  [CUBE_COLORS.orange]: 'Orange',
};

const FACE_LABELS: Record<FaceName, { letter: string; name: string }> = {
  top: { letter: 'U', name: 'Top' },
  left: { letter: 'L', name: 'Left' },
  front: { letter: 'F', name: 'Front' },
  right: { letter: 'R', name: 'Right' },
  back: { letter: 'B', name: 'Back' },
  bottom: { letter: 'D', name: 'Bottom' },
};

const Sticker = ({
  label,
  color,
  isCenter,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  isCenter: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={isCenter || disabled}
    onClick={onClick}
    className={cn(
      'w-4 h-4 min-[380px]:w-5 min-[380px]:h-5 md:w-6 md:h-6 rounded-[3px] border-2 border-background/80 transition-transform',
      !isCenter && !disabled && 'hover:scale-110 cursor-pointer',
      isCenter && 'cursor-default ring-1 ring-inset ring-black/20',
    )}
    style={{ backgroundColor: color }}
  />
);

const Face = ({
  face,
  grid,
  onPaint,
  disabled,
}: {
  face: FaceName;
  grid: string[][];
  onPaint: (row: number, col: number) => void;
  disabled?: boolean;
}) => {
  const { letter, name } = FACE_LABELS[face];
  return (
    <div role="group" aria-label={`${name} face (${letter})`} className="flex flex-col items-center gap-0.5">
      <span aria-hidden="true" className="whitespace-nowrap text-[10px] font-medium leading-none text-muted-foreground">
        {letter} — {name}
      </span>
      <div className="grid grid-cols-3 gap-[2px] p-[2px] bg-foreground/80 rounded-md">
        {grid.map((row, r) =>
          row.map((color, c) => {
            const isCenter = r === 1 && c === 1;
            const colorName = COLOR_NAMES[color] ?? color;
            return (
              <Sticker
                key={`${face}-${r}-${c}`}
                label={
                  isCenter
                    ? `${name} face center, ${colorName} (fixed)`
                    : `${name} face, row ${r + 1}, column ${c + 1}, currently ${colorName}`
                }
                color={color}
                isCenter={isCenter}
                onClick={() => onPaint(r, c)}
                disabled={disabled}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};

export const CubeNetEditor = ({ cubeState, onPaint, disabled }: CubeNetEditorProps) => {
  const face = (name: FaceName) => (
    <Face face={name} grid={cubeState[name]} onPaint={(r, c) => onPaint(name, r, c)} disabled={disabled} />
  );

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-cols-4 gap-1.5 mx-auto" style={{ minWidth: 'max-content' }}>
        <div className="col-start-2 row-start-1">{face('top')}</div>
        <div className="col-start-1 row-start-2">{face('left')}</div>
        <div className="col-start-2 row-start-2">{face('front')}</div>
        <div className="col-start-3 row-start-2">{face('right')}</div>
        <div className="col-start-4 row-start-2">{face('back')}</div>
        <div className="col-start-2 row-start-3">{face('bottom')}</div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        Pick a color below, then tap stickers to match your cube. Centers stay fixed — they define each face.
      </p>
    </div>
  );
};

export const ColorPalette = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (color: string) => void;
}) => (
  <div className="flex items-center justify-center gap-2 flex-wrap">
    {Object.entries(COLOR_NAMES).map(([color, name]) => (
      <button
        key={color}
        type="button"
        aria-label={`Paint with ${name}`}
        aria-pressed={selected === color}
        onClick={() => onSelect(color)}
        className={cn(
          'w-9 h-9 rounded-full border-2 transition-all',
          selected === color ? 'border-primary scale-110 shadow-md' : 'border-border hover:scale-105',
        )}
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
);
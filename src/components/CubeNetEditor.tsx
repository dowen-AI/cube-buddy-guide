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

const Sticker = ({
  color,
  isCenter,
  onClick,
  disabled,
}: {
  color: string;
  isCenter: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    aria-label={isCenter ? `${COLOR_NAMES[color] ?? color} center (fixed)` : `Set sticker to ${COLOR_NAMES[color] ?? color}`}
    disabled={isCenter || disabled}
    onClick={onClick}
    className={cn(
      'w-5 h-5 md:w-6 md:h-6 rounded-[3px] border-2 border-background/80 transition-transform',
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
}) => (
  <div className="grid grid-cols-3 gap-[2px] p-[2px] bg-foreground/80 rounded-md">
    {grid.map((row, r) =>
      row.map((color, c) => (
        <Sticker
          key={`${face}-${r}-${c}`}
          color={color}
          isCenter={r === 1 && c === 1}
          onClick={() => onPaint(r, c)}
          disabled={disabled}
        />
      )),
    )}
  </div>
);

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
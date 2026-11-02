import { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSolvedCube } from '@/hooks/useCubeState';
import { CubePicture } from '@/components/followalong/Pictures';
import { FACE_LABELS, type FaceName } from '@/components/CubeNetEditor';

const solved = getSolvedCube();

// Solved cube laid flat, labelled, to show how the 3D cube maps onto the net.
const ExampleNet = () => {
  const panel = (face: FaceName, pos: string) => (
    <div className={cn('flex flex-col items-center gap-0.5', pos)}>
      <div className="grid grid-cols-3 gap-px rounded-sm bg-foreground/80 p-px">
        {solved[face].flat().map((color, i) => <span key={i} className="h-3.5 w-3.5 rounded-[2px]" style={{ backgroundColor: color }} />)}
      </div>
      <span className="text-[10px] font-medium leading-none text-muted-foreground">{FACE_LABELS[face].name}</span>
    </div>
  );
  return (
    <div className="mx-auto grid w-fit grid-cols-4 gap-1.5" role="img" aria-label="Example: a solved cube unfolded. Top above the front, left and right beside it, back on the far right, bottom below.">
      {panel('top', 'col-start-2 row-start-1')}
      {panel('left', 'col-start-1 row-start-2')}
      {panel('front', 'col-start-2 row-start-2')}
      {panel('right', 'col-start-3 row-start-2')}
      {panel('back', 'col-start-4 row-start-2')}
      {panel('bottom', 'col-start-2 row-start-3')}
    </div>
  );
};

const STEPS: { title: string; body: JSX.Element }[] = [
  {
    title: 'Hold your cube the standard way',
    body: (
      <div className="flex items-center gap-3">
        <CubePicture colors={solved} size={96} title="Cube held with yellow on top, red facing you, green on the right" />
        <p>
          <strong>Yellow center on top, red center facing you.</strong> Green should now be on your right. Centers never
          move, so they tell the app where every color belongs.
        </p>
      </div>
    ),
  },
  {
    title: 'Your cube, unfolded',
    body: (
      <div className="space-y-2">
        <ExampleNet />
        <p>
          Imagine cutting your cube open like a cardboard box and laying it flat: top above the front, left and right
          beside it, back on the far right, bottom underneath.
        </p>
      </div>
    ),
  },
  {
    title: 'Paint one face at a time',
    body: (
      <p>
        We'll walk you through all 6 faces. For each one we say exactly how to turn your cube so that face looks straight
        at you, and which row or column touches the face you just painted. Pick a color, tap the matching stickers, then
        tap <strong>Next face</strong>.
      </p>
    ),
  },
  {
    title: 'Two things that trip people up',
    body: (
      <ul className="space-y-2">
        <li className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>Don't mirror a face.</strong> Paint it as you see it looking straight at it: a sticker on the left of
            that face goes on the left of the panel. Mixing up left and right is the most common reason the app says the
            colors are impossible.
          </span>
        </li>
        <li className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>Check your color scheme.</strong> This works for standard cubes: white opposite yellow, red opposite
            orange, blue opposite green. With yellow on top and red facing you, green must be on your right. If blue is on
            your right, or your colors are different, the solution won't work on your cube.
          </span>
        </li>
      </ul>
    ),
  },
];

export const PaintingGuide = ({ onDone }: { onDone: () => void }) => {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3" data-testid="painting-guide">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">How to copy your cube · {i + 1} of {STEPS.length}</p>
      <h4 className="font-display text-lg font-bold text-foreground">{step.title}</h4>
      <div className="text-sm leading-relaxed text-foreground">{step.body}</div>
      <div className="flex gap-2">
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)} className="flex min-h-12 items-center gap-1 rounded-xl border border-border px-4 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <button type="button" onClick={onDone} className="flex min-h-12 items-center rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted">
            Skip the guide
          </button>
        )}
        <button
          type="button"
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {last ? 'Start painting' : 'Next'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

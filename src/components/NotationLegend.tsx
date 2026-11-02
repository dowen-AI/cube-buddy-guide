import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const FACES = [
  ['R', 'Right'],
  ['L', 'Left'],
  ['U', 'Up (top)'],
  ['D', 'Down (bottom)'],
  ['F', 'Front'],
  ['B', 'Back'],
] as const;

export const NotationLegend = ({ className, defaultOpen }: { className?: string; defaultOpen?: boolean }) => (
  <details open={defaultOpen} className={cn('group rounded-lg border border-border bg-muted/40 text-sm', className)}>
    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-medium text-foreground [&::-webkit-details-marker]:hidden">
      <HelpCircle className="h-4 w-4 text-primary" />
      What do these letters mean?
      <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
      <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
    </summary>
    <div className="space-y-3 border-t border-border px-4 py-3 text-muted-foreground">
      <p>Each letter is one face of the cube:</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {FACES.map(([letter, name]) => (
          <li key={letter}>
            <code className="font-mono font-bold text-foreground">{letter}</code> = {name}
          </li>
        ))}
      </ul>
      <ul className="space-y-1">
        <li>
          <strong className="text-foreground">Letter alone</strong> (e.g. <code className="font-mono text-foreground">R</code>): turn that face clockwise, as if you were looking straight at it.
        </li>
        <li>
          <strong className="text-foreground">With an apostrophe</strong> (e.g. <code className="font-mono text-foreground">R'</code>): turn it counter-clockwise.
        </li>
        <li>
          <strong className="text-foreground">With a 2</strong> (e.g. <code className="font-mono text-foreground">R2</code>): turn it twice (half a turn).
        </li>
      </ul>
    </div>
  </details>
);

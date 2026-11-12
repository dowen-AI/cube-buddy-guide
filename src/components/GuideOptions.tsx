import { cn } from '@/lib/utils';
import { setPref, usePrefs, type Prefs } from '@/lib/guideMemory';
import { canSpeak } from '@/lib/speak';
import { NotationLegend } from './NotationLegend';
import { PieceTypes } from './followalong/Pictures';

const ROWS: { key: keyof Prefs; title: string; detail: string; needsSpeech?: boolean }[] = [
  { key: 'bigText', title: 'Big text', detail: 'Larger instructions on every move.' },
  { key: 'readAloud', title: 'Read each move out loud', detail: 'Your phone says the instruction when it appears.', needsSpeech: true },
  { key: 'handsFree', title: 'Hands-free', detail: 'Goes to the next move by itself after 8 seconds. Checks always wait for you.' },
  { key: 'letters', title: 'Show the letter for each move (for later)', detail: 'Cubers write turns as letters like R and U. You do not need them to solve.' },
];

// Settings shared by every stage and the solver. Everything is off by default:
// plain words and a moving picture only.
export const GuideOptions = ({ onClose }: { onClose: () => void }) => {
  const prefs = usePrefs();
  return (
    <div className="space-y-3" data-testid="guide-options">
      <p className="text-xl font-bold text-foreground">Options</p>
      <ul className="space-y-2">
        {ROWS.filter((r) => !r.needsSpeech || canSpeak()).map((r) => (
          <li key={r.key}>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[r.key]}
              onClick={() => setPref(r.key, !prefs[r.key])}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-border bg-background px-3 py-2 text-left"
              data-pref={r.key}
            >
              <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', prefs[r.key] ? 'bg-cube-green' : 'bg-muted-foreground/40')}>
                <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', prefs[r.key] ? 'left-[22px]' : 'left-0.5')} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-foreground">{r.title}</span>
                <span className="block text-sm text-muted-foreground">{r.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-base font-semibold text-foreground">The 3 kinds of pieces</p>
        <PieceTypes />
      </div>
      {prefs.letters ? <NotationLegend defaultOpen /> : null}
      <button type="button" onClick={onClose} className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">Back to the guide</button>
    </div>
  );
};

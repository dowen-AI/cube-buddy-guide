import { Brain, Printer } from 'lucide-react';
import { CHEAT_SHEET } from '@/data/followAlong';
import { interactiveStagesData } from '@/data/interactiveStagesData';
import { setPref, usePrefs } from '@/lib/guideMemory';

// The whole method on one page: one sentence per stage plus the words for the
// set of turns it uses. Letters stay hidden unless asked for. Prints on one page.
export const CheatSheet = () => {
  const prefs = usePrefs();
  return (
    <section id="cheat-sheet" className="scroll-mt-40 border-t border-border bg-muted/30 px-4 py-16 print:border-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center print:mb-2">
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-primary print:hidden"><Brain className="h-4 w-4" />Cheat sheet</p>
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground print:mb-1 print:text-xl">The Whole Solve on One Page</h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground print:text-sm">
            Yellow on top, white on the bottom, the whole time. Six short sets of turns. Say the words out loud as you turn.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 print:hidden">
            <button type="button" onClick={() => window.print()} className="flex min-h-14 items-center gap-2 rounded-xl border-2 border-border bg-card px-5 text-base font-semibold text-foreground hover:bg-muted">
              <Printer className="h-5 w-5" />Print or save as PDF
            </button>
            <button type="button" role="switch" aria-checked={prefs.letters} onClick={() => setPref('letters', !prefs.letters)} className="flex min-h-14 items-center gap-2 rounded-xl border-2 border-border bg-card px-5 text-base font-semibold text-foreground hover:bg-muted" data-testid="cheat-letters">
              {prefs.letters ? 'Hide the letters' : 'Show the letters (for later)'}
            </button>
          </div>
        </div>
        <ol className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-1.5">
          {CHEAT_SHEET.map((item) => {
            const stage = interactiveStagesData.find((x) => x.id === item.stage);
            return (
              <li key={item.stage} className="break-inside-avoid rounded-xl border border-border bg-card p-4 shadow-soft print:rounded-md print:p-2 print:shadow-none" data-testid="cheat-row">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground print:h-6 print:w-6 print:text-sm">{item.stage}</span>
                  <h3 className="font-display text-lg font-bold text-foreground print:text-sm">{stage?.title}</h3>
                </div>
                <p className="text-base leading-snug text-foreground print:text-xs">{item.rule}</p>
                {item.move ? (
                  <div className="mt-2 rounded-lg bg-primary/5 px-3 py-2 print:mt-1 print:border print:border-neutral-300 print:bg-white print:px-2 print:py-1">
                    <p className="text-base font-semibold text-primary print:text-xs">{item.move.name}</p>
                    <p className="text-base font-medium leading-snug text-foreground print:text-xs">{item.move.chant}</p>
                    {prefs.letters ? <p className="mt-0.5 font-mono text-sm text-muted-foreground print:text-[10px]" data-testid="cheat-notation">{item.move.notation}</p> : null}
                    {item.move.note ? <p className="mt-0.5 text-sm text-muted-foreground print:text-[10px]">{item.move.note}</p> : null}
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-base text-muted-foreground print:mt-1 print:text-xs">Nothing to memorize. Just: top, match, twice.</p>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 hidden text-center text-xs text-neutral-600 print:block">cube-buddy-guide.lovable.app · each turn is shown one at a time, with a moving picture, on the site</p>
      </div>
    </section>
  );
};

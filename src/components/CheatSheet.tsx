import { Brain } from 'lucide-react';
import { CHEAT_SHEET } from '@/data/followAlong';
import { interactiveStagesData } from '@/data/interactiveStagesData';

// The whole method on one screen: one sentence per stage plus the named move it
// uses. Same text as the "Remember" line at the end of each guide.
export const CheatSheet = () => (
  <section id="cheat-sheet" className="scroll-mt-36 border-t border-border bg-muted/30 px-4 py-16">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Brain className="h-4 w-4" />Cheat sheet</p>
        <h2 className="mb-3 font-display text-3xl font-bold text-foreground">The Whole Solve on One Page</h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Only 5 moves to learn, and one of them, the <strong className="text-foreground">Sledgehammer</strong>, does 3 of the 7 stages.
          Say the words out loud as you turn. Screenshot this page to keep it.
        </p>
      </div>
      <ol className="grid gap-3 md:grid-cols-2">
        {CHEAT_SHEET.map((item) => {
          const stage = interactiveStagesData.find((s) => s.id === item.stage);
          return (
            <li key={item.stage} className="rounded-xl border border-border bg-card p-4 shadow-soft" data-testid="cheat-row">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">{item.stage}</span>
                <h3 className="font-display text-base font-bold text-foreground">{stage?.title}</h3>
              </div>
              <p className="text-sm leading-snug text-foreground">{item.rule}</p>
              {item.move ? (
                <div className="mt-2 rounded-lg bg-primary/5 px-3 py-2">
                  <p className="text-sm font-semibold text-primary">{item.move.name}</p>
                  <p className="text-sm font-medium leading-snug text-foreground">{item.move.chant}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.move.notation}</p>
                  {item.move.note ? <p className="mt-0.5 text-xs text-muted-foreground">{item.move.note}</p> : null}
                </div>
              ) : (
                <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted-foreground">No move to memorize. Just: top, match, twice.</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  </section>
);

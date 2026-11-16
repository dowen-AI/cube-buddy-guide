import { BookOpen, RotateCcw, CheckCircle2, Lightbulb } from 'lucide-react';

const tips = [
  {
    icon: BookOpen,
    title: "1. Hold the yellow center on top",
    description: "Find the yellow square in the middle of a side and put it on top. The white middle square is then on the bottom. Keep it that way for the whole solve: you never flip the cube over."
  },
  {
    icon: RotateCcw,
    title: "2. Do one turn, then tap",
    description: "The screen shows a single turn on a 3D cube, with a big arrow for which way to go. Do it on your cube, then tap \"I did it\"."
  },
  {
    icon: Lightbulb,
    title: "3. Wrong turn? Tap \"I messed up\"",
    description: "The guide walks your real cube back, one turn at a time. Badly mixed up? Stage 1 works from any cube, and the solver can finish any cube."
  },
  {
    icon: CheckCircle2,
    title: "4. Stop any time",
    description: "Your exact place is saved, even in the middle of a set of turns. Need bigger text or the moves read out loud? Tap the options button in any stage."
  }
];

export const HowToUseSection = () => {
  return (
    <section id="how-to-use" className="py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold font-display text-center text-foreground mb-4">
          How to Use This Guide
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          This guide uses the <strong>Layer-by-Layer</strong> method, the easiest way to solve a
          Rubik's Cube: bottom layer, middle layer, then the top.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 border border-border shadow-soft animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <tip.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{tip.title}</h3>
                  <p className="text-base text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

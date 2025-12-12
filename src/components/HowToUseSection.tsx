import { BookOpen, RotateCcw, CheckCircle2, Lightbulb } from 'lucide-react';

const tips = [
  {
    icon: BookOpen,
    title: "Read Each Stage Carefully",
    description: "Take your time with each step. There's no rush—understanding is more important than speed."
  },
  {
    icon: RotateCcw,
    title: "Interact with the 3D Cube",
    description: "Drag the cubes to see them from different angles. This helps you understand exactly which pieces to move."
  },
  {
    icon: CheckCircle2,
    title: "Mark Your Progress",
    description: "Use the checkboxes to track which stages you've completed. Your progress is saved automatically."
  },
  {
    icon: Lightbulb,
    title: "Practice Makes Perfect",
    description: "Don't worry if you need to repeat stages. Most people need several attempts to memorize the moves."
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
          This guide uses the <strong>Layer-by-Layer</strong> method—the most 
          beginner-friendly approach to solving a Rubik's Cube. Follow these tips 
          for the best experience.
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
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

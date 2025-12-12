import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const notations = [
  { symbol: 'R', meaning: 'Right face clockwise', color: 'cube-green' },
  { symbol: "R'", meaning: 'Right face counter-clockwise', color: 'cube-green' },
  { symbol: 'L', meaning: 'Left face clockwise', color: 'cube-blue' },
  { symbol: "L'", meaning: 'Left face counter-clockwise', color: 'cube-blue' },
  { symbol: 'U', meaning: 'Up (top) face clockwise', color: 'cube-white' },
  { symbol: "U'", meaning: 'Up (top) face counter-clockwise', color: 'cube-white' },
  { symbol: 'D', meaning: 'Down (bottom) face clockwise', color: 'cube-yellow' },
  { symbol: "D'", meaning: 'Down (bottom) face counter-clockwise', color: 'cube-yellow' },
  { symbol: 'F', meaning: 'Front face clockwise', color: 'cube-red' },
  { symbol: "F'", meaning: 'Front face counter-clockwise', color: 'cube-red' },
  { symbol: 'B', meaning: 'Back face clockwise', color: 'cube-orange' },
  { symbol: "B'", meaning: 'Back face counter-clockwise', color: 'cube-orange' },
  { symbol: '2', meaning: 'Twice (e.g., R2 = R R)', color: 'muted-foreground' },
];

export const NotationReference = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-6 bg-card rounded-xl border border-border shadow-soft hover:shadow-card transition-shadow"
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl">📖</span>
            <div className="text-left">
              <h2 className="text-xl font-bold font-display text-foreground">
                Algorithm Notation Reference
              </h2>
              <p className="text-sm text-muted-foreground">
                Optional: Learn the standard cube notation for advanced solving
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-6 h-6 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          )}
        </button>

        {isOpen && (
          <div className="mt-4 p-6 bg-card rounded-xl border border-border shadow-soft animate-fade-in">
            <p className="text-muted-foreground mb-6">
              While this guide uses simple language like "turn the right face clockwise," 
              experienced cubers use a shorthand notation. Here's a reference if you want 
              to learn it:
            </p>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {notations.map((notation) => (
                <div
                  key={notation.symbol}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <code
                    className={cn(
                      "px-2 py-1 rounded font-mono font-bold text-lg",
                      notation.color === 'muted-foreground'
                        ? 'bg-muted text-muted-foreground'
                        : `bg-${notation.color}/20 text-${notation.color}`
                    )}
                    style={{
                      backgroundColor: notation.color !== 'muted-foreground' 
                        ? `hsl(var(--${notation.color}) / 0.15)` 
                        : undefined,
                      color: notation.color !== 'muted-foreground'
                        ? `hsl(var(--${notation.color}))`
                        : undefined
                    }}
                  >
                    {notation.symbol}
                  </code>
                  <span className="text-sm text-foreground">{notation.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

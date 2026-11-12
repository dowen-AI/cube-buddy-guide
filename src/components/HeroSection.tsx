import { RubiksCube3D, cubeStates } from './RubiksCube3D';
import { ChevronDown } from 'lucide-react';

export const HeroSection = ({ onStart }: { onStart: () => void }) => {
  // One tap from here to the first screen of Stage 1.
  const scrollToContent = onStart;

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-40 pb-20 md:pt-36 min-[1440px]:pt-24 gradient-hero">
      <div className="max-w-4xl mx-auto text-center">
        {/* 3D Cube */}
        <div className="mb-4">
          <RubiksCube3D cubeState={cubeStates.scrambled} autoRotate={true} />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold font-display text-foreground mb-4">
          You <span className="text-primary">CAN</span> Solve the{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cube-red via-cube-orange to-cube-yellow">
            Rubik's Cube
          </span>
        </h1>

        {/* Two ways in */}
        <div className="mx-auto mb-8 flex max-w-md flex-col gap-3">
          <button
            onClick={scrollToContent}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Learning — Stage 1 <ChevronDown className="h-5 w-5" />
          </button>
          <button
            onClick={() => document.getElementById('solver')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex min-h-12 items-center justify-center rounded-xl border-2 border-border bg-card px-6 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Just solve my cube for me
          </button>
          <p className="text-base text-muted-foreground">Grab your cube. One turn at a time, with a moving picture for every turn.</p>
        </div>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Hold your cube, follow one turn at a time, and tap when you've done it.
          Plain English, no memorizing up front. If you make a wrong turn, the guide walks you back.
        </p>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4">
          <span className="px-4 py-2 bg-cube-red/10 text-cube-red rounded-full text-sm font-medium">
            7 Simple Stages
          </span>
          <span className="px-4 py-2 bg-cube-blue/10 text-cube-blue rounded-full text-sm font-medium">
            Moving 3D Cube
          </span>
          <span className="px-4 py-2 bg-cube-green/10 text-cube-green rounded-full text-sm font-medium">
            Progress Tracking
          </span>
          <span className="px-4 py-2 bg-cube-orange/10 text-cube-orange rounded-full text-sm font-medium">
            Beginner Friendly
          </span>
        </div>

      </div>
    </section>
  );
};

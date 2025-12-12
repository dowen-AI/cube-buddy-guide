import { RubiksCube3D, cubeStates } from './RubiksCube3D';
import { ChevronDown } from 'lucide-react';

export const HeroSection = () => {
  const scrollToContent = () => {
    document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20 gradient-hero">
      <div className="max-w-4xl mx-auto text-center">
        {/* 3D Cube */}
        <div className="mb-8">
          <RubiksCube3D cubeState={cubeStates.scrambled} autoRotate={true} />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold font-display text-foreground mb-4">
          You <span className="text-primary">CAN</span> Solve the{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cube-red via-cube-orange to-cube-yellow">
            Rubik's Cube
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          A simple, visual, step-by-step guide for absolute beginners. 
          No confusing notation. No frustration. Just clear instructions and 
          interactive 3D cubes to guide you every step of the way.
        </p>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <span className="px-4 py-2 bg-cube-red/10 text-cube-red rounded-full text-sm font-medium">
            7 Simple Stages
          </span>
          <span className="px-4 py-2 bg-cube-blue/10 text-cube-blue rounded-full text-sm font-medium">
            Interactive 3D Cubes
          </span>
          <span className="px-4 py-2 bg-cube-green/10 text-cube-green rounded-full text-sm font-medium">
            Progress Tracking
          </span>
          <span className="px-4 py-2 bg-cube-orange/10 text-cube-orange rounded-full text-sm font-medium">
            Beginner Friendly
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={scrollToContent}
          className="group inline-flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <span className="text-sm font-medium">Start Learning</span>
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </button>
      </div>
    </section>
  );
};

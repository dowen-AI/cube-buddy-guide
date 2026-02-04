import { CubeState, CUBE_COLORS, getDaisyState, getWhiteCrossState, getSolvedCube } from '@/hooks/useCubeState';

interface StepGoalPreviewProps {
  stepId: string;
}

// Mini 2D cube face visualization
const MiniFace = ({ colors, label }: { colors: string[][]; label: string }) => (
  <div className="text-center">
    <div className="inline-grid grid-cols-3 gap-0.5 p-1 bg-black rounded">
      {colors.flat().map((color, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-[2px]"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);

// Step-specific goal previews
const STEP_GOALS: Record<string, { title: string; description: string; visual: 'daisy' | 'cross' | 'first-layer' | 'f2l' | 'yellow-cross' | 'solved' | null }> = {
  // Stage 1: White Cross
  '1-1': {
    title: '🎯 Cube Position',
    description: 'Yellow on top, white on bottom',
    visual: null,
  },
  '1-2': {
    title: '🌼 Building the Daisy',
    description: '4 white pieces around the yellow center',
    visual: 'daisy',
  },
  '1-3': {
    title: '🎯 Color Matching',
    description: 'Side color matches the center below it',
    visual: null,
  },
  '1-4': {
    title: '✅ One Cross Arm',
    description: 'White piece locked into the bottom',
    visual: null,
  },
  '1-5': {
    title: '✅ White Cross Complete',
    description: 'All 4 white edges on bottom, colors matched',
    visual: 'cross',
  },
  
  // Stage 2: White Corners
  '2-1': { title: '🎯 Find Corner', description: 'Locate white corner above its slot', visual: null },
  '2-2': { title: '🎯 Position White', description: 'White sticker faces front or right', visual: null },
  '2-3': { title: '🔨 Sledgehammer 1/4', description: 'R - Right face up', visual: null },
  '2-4': { title: '🔨 Sledgehammer 2/4', description: "U' - Top layer left", visual: null },
  '2-5': { title: '🔨 Sledgehammer 3/4', description: "R' - Right face down", visual: null },
  '2-6': { title: '🔨 Sledgehammer 4/4', description: 'U - Top layer right', visual: null },
  '2-7': { title: '🔍 Check Corner', description: 'Is the white corner in place?', visual: null },
  '2-8': { title: '✅ First Layer Done', description: 'White face + first layer complete', visual: 'first-layer' },
  
  // Stage 3
  '3-1': { title: '🎯 Flip Cube', description: 'White on top, yellow on bottom', visual: null },
  '3-7': { title: '✅ F2L Complete', description: 'First two layers solved', visual: 'f2l' },
  
  // Stage 4
  '4-4': { title: '✅ Yellow Cross', description: 'Yellow cross on top', visual: 'yellow-cross' },
  
  // Stage 7
  '7-6': { title: '🎉 SOLVED!', description: 'Congratulations!', visual: 'solved' },
};

export const StepGoalPreview = ({ stepId }: StepGoalPreviewProps) => {
  const goal = STEP_GOALS[stepId];
  
  if (!goal) return null;
  
  const renderVisual = () => {
    if (!goal.visual) return null;
    
    switch (goal.visual) {
      case 'daisy': {
        // Show yellow face with white edges
        const daisyTop = [
          [CUBE_COLORS.yellow, CUBE_COLORS.white, CUBE_COLORS.yellow],
          [CUBE_COLORS.white, CUBE_COLORS.yellow, CUBE_COLORS.white],
          [CUBE_COLORS.yellow, CUBE_COLORS.white, CUBE_COLORS.yellow],
        ];
        return (
          <div className="flex items-center justify-center">
            <MiniFace colors={daisyTop} label="Top View" />
          </div>
        );
      }
      
      case 'cross': {
        // Show white cross on bottom
        const crossBottom = [
          [CUBE_COLORS.black, CUBE_COLORS.white, CUBE_COLORS.black],
          [CUBE_COLORS.white, CUBE_COLORS.white, CUBE_COLORS.white],
          [CUBE_COLORS.black, CUBE_COLORS.white, CUBE_COLORS.black],
        ];
        return (
          <div className="flex items-center justify-center">
            <MiniFace colors={crossBottom} label="Bottom View" />
          </div>
        );
      }
      
      case 'first-layer': {
        // Show complete white face
        const whiteBottom = Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.white));
        return (
          <div className="flex items-center justify-center">
            <MiniFace colors={whiteBottom} label="Bottom View" />
          </div>
        );
      }
      
      case 'f2l': {
        // Show solved F2L (two layers)
        return (
          <div className="flex items-center justify-center gap-2">
            <MiniFace 
              colors={Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.white))} 
              label="Top (white)" 
            />
            <div className="text-muted-foreground text-xs">+</div>
            <MiniFace 
              colors={[
                [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
                [CUBE_COLORS.red, CUBE_COLORS.red, CUBE_COLORS.red],
                [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
              ]} 
              label="Front side" 
            />
          </div>
        );
      }
      
      case 'yellow-cross': {
        const yellowCross = [
          [CUBE_COLORS.black, CUBE_COLORS.yellow, CUBE_COLORS.black],
          [CUBE_COLORS.yellow, CUBE_COLORS.yellow, CUBE_COLORS.yellow],
          [CUBE_COLORS.black, CUBE_COLORS.yellow, CUBE_COLORS.black],
        ];
        return (
          <div className="flex items-center justify-center">
            <MiniFace colors={yellowCross} label="Top View" />
          </div>
        );
      }
      
      case 'solved': {
        const solvedFace = Array(3).fill(null).map(() => Array(3).fill(CUBE_COLORS.yellow));
        return (
          <div className="flex items-center justify-center">
            <MiniFace colors={solvedFace} label="All faces solved!" />
          </div>
        );
      }
      
      default:
        return null;
    }
  };
  
  return (
    <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">{goal.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
        </div>
        {goal.visual && (
          <div className="flex-shrink-0">
            {renderVisual()}
          </div>
        )}
      </div>
    </div>
  );
};

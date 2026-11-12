// Stage titles and goals. The step-by-step follow-along content for each stage
// lives in followAlong.ts.
export interface InteractiveStage {
  id: number;
  title: string;
  description: string;
  goal: string;
}

export const interactiveStagesData: InteractiveStage[] = [
  {
    id: 1,
    title: 'The White Cross',
    description: 'Place the 4 white edges one at a time, whatever spot each one starts in',
    goal: 'Create a white cross on the bottom, with each side color matching its center.',
  },
  {
    id: 2,
    title: 'The White Corners',
    description: 'Complete the first layer',
    goal: 'Fill in the four white corners to complete the entire white face.',
  },
  {
    id: 3,
    title: 'The Middle Layer',
    description: 'Solve the second layer edges',
    goal: 'Complete the first two layers of the cube.',
  },
  {
    id: 4,
    title: 'The Yellow Cross',
    description: 'Create a yellow cross on top',
    goal: 'Form a yellow cross on the yellow face (ignore corners for now).',
  },
  {
    id: 5,
    title: 'Match the Yellow Edges',
    description: 'Line up the yellow edges with the side colors',
    goal: 'Make the side colors of the yellow edges match their centers.',
  },
  {
    id: 6,
    title: 'Place the Yellow Corners',
    description: 'Move each yellow corner to its own spot',
    goal: "Get all yellow corners in the right spots (the twist doesn't matter yet).",
  },
  {
    id: 7,
    title: 'Twist the Last Corners',
    description: 'Twist the corners and finish the cube!',
    goal: 'Solve the cube completely!',
  },
];

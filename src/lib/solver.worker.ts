// Runs cubejs off the main thread, so building its tables and searching for a
// short solution never freezes the page.
import Cube from 'cubejs';
import { firstPass, solveVariant, type CubeClass } from './solverSearch';

const C = Cube as unknown as CubeClass & { initSolver: () => void };
C.initSolver();

type Job =
  | { id: number; kind: 'first'; facelets: string }
  | { id: number; kind: 'deep'; scramble: string; variant: number; depth: number };

const ctx = self as unknown as { postMessage: (m: unknown) => void; onmessage: ((e: { data: Job }) => void) | null };
ctx.postMessage({ ready: true });
ctx.onmessage = ({ data }) => {
  if (data.kind === 'first') {
    const first = firstPass(C, data.facelets);
    ctx.postMessage({ id: data.id, solution: first ? first.solution : null, exact: Boolean(first?.exact) });
  } else {
    ctx.postMessage({ id: data.id, solution: solveVariant(C, data.scramble, data.variant, data.depth), variant: data.variant });
  }
};

import { moveCount, VARIANT_COUNT } from './solverSearch';
import { invertSequence, parseMoves } from './moves';

// Looks for a solution of TARGET moves or fewer by running six differently
// oriented searches across a few background workers, and gives up after BUDGET
// (keeping the best answer so far) so a phone never waits long.
export const TARGET_MOVES = 20;
const BUDGET_MS = 7000;

interface Reply { id?: number; ready?: boolean; solution?: string | null; exact?: boolean }
interface Slot { worker: Worker; ready: Promise<void>; busy: boolean }

let pool: Slot[] = [];
let nextId = 1;

const spawn = (): Slot => {
  const worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  const ready = new Promise<void>((resolve, reject) => {
    const onMessage = (e: MessageEvent<Reply>) => { if (e.data.ready) { worker.removeEventListener('message', onMessage); resolve(); } };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', () => reject(new Error('solver worker failed to start')), { once: true });
  });
  return { worker, ready, busy: false };
};

const poolSize = () => Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
const ensurePool = () => {
  while (pool.length < poolSize()) pool.push(spawn());
  return pool;
};
// Start building the tables early (when the solver section comes on screen).
export const warmSolver = () => { try { ensurePool(); } catch { /* workers unavailable: the fallback handles it */ } };

const ask = (slot: Slot, job: Record<string, unknown>): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    slot.busy = true;
    const onMessage = (e: MessageEvent<Reply>) => {
      if (e.data.id !== id) return;
      slot.worker.removeEventListener('message', onMessage);
      slot.busy = false;
      resolve(e.data);
    };
    slot.worker.addEventListener('message', onMessage);
    slot.worker.addEventListener('error', () => reject(new Error('solver worker crashed')), { once: true });
    slot.ready.then(() => slot.worker.postMessage({ id, ...job }), reject);
  });

// Workers still deep in a search can't be interrupted: replace them.
const dropBusy = () => {
  pool = pool.filter((slot) => {
    if (slot.busy) slot.worker.terminate();
    return !slot.busy;
  });
  setTimeout(warmSolver, 0);
};

export interface PoolResult { solution: string; exact: boolean; searchedDeeper: boolean }

export const solveInWorkers = async (facelets: string, onProgress?: (bestSoFar: number) => void): Promise<PoolResult | null> => {
  const slots = ensurePool();
  const first = await ask(slots[0], { kind: 'first', facelets });
  if (first.solution === null || first.solution === undefined) return null;
  if (first.exact || moveCount(first.solution) <= TARGET_MOVES) return { solution: first.solution, exact: Boolean(first.exact), searchedDeeper: false };

  let best = first.solution;
  onProgress?.(moveCount(best));
  const scramble = invertSequence(parseMoves(best)).join(' ');
  const queue = Array.from({ length: VARIANT_COUNT }, (_, k) => k);
  return new Promise<PoolResult>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      dropBusy();
      resolve({ solution: best, exact: false, searchedDeeper: true });
    };
    const timer = setTimeout(finish, BUDGET_MS);
    let running = 0;
    const pump = (slot: Slot) => {
      if (done) return;
      const variant = queue.shift();
      if (variant === undefined) { if (running === 0) finish(); return; }
      running++;
      ask(slot, { kind: 'deep', scramble, variant, depth: TARGET_MOVES }).then((reply) => {
        running--;
        if (done) return;
        if (reply.solution && moveCount(reply.solution) < moveCount(best)) { best = reply.solution; onProgress?.(moveCount(best)); }
        if (moveCount(best) <= TARGET_MOVES) finish();
        else pump(slot);
      }, () => { running--; if (running === 0 && !queue.length) finish(); });
    };
    slots.forEach(pump);
  });
};

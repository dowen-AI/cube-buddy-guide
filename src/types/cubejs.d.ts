declare module 'cubejs' {
  export default class Cube {
    constructor(state?: unknown);
    static fromString(facelets: string): Cube;
    static initSolver(): void;
    static random(): Cube;
    move(algorithm: string): Cube;
    asString(): string;
    solve(maxDepth?: number): string;
    isSolved(): boolean;
  }
}
export interface StarInput {
  hintsUsed: number;
  solutionViewed: boolean;
}

const MAX_STARS = 3;

/** Track-agnostic: any challenge type (SQL, Python, C#, ...) scores the same way. */
export function calculateStars({ hintsUsed, solutionViewed }: StarInput): number {
  if (solutionViewed) return 0;
  return Math.max(0, MAX_STARS - hintsUsed);
}

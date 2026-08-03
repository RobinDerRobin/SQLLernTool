import { describe, expect, it } from 'vitest';
import { calculateStars } from './stars';

describe('calculateStars', () => {
  it('awards 3 stars when no hints were used and the solution was not viewed', () => {
    expect(calculateStars({ hintsUsed: 0, solutionViewed: false })).toBe(3);
  });

  it('deducts one star per hint used', () => {
    expect(calculateStars({ hintsUsed: 1, solutionViewed: false })).toBe(2);
    expect(calculateStars({ hintsUsed: 2, solutionViewed: false })).toBe(1);
    expect(calculateStars({ hintsUsed: 3, solutionViewed: false })).toBe(0);
  });

  it('never goes below 0 even with more hints than exist', () => {
    expect(calculateStars({ hintsUsed: 5, solutionViewed: false })).toBe(0);
  });

  it('always awards 0 stars once the solution was viewed, regardless of hints used', () => {
    expect(calculateStars({ hintsUsed: 0, solutionViewed: true })).toBe(0);
    expect(calculateStars({ hintsUsed: 1, solutionViewed: true })).toBe(0);
  });
});

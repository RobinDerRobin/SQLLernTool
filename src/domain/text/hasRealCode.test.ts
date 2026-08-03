import { describe, expect, it } from 'vitest';
import { hasRealCode } from './hasRealCode';

describe('hasRealCode', () => {
  it('is false for undefined or empty drafts', () => {
    expect(hasRealCode(undefined)).toBe(false);
    expect(hasRealCode('')).toBe(false);
  });

  it('is false for whitespace-only drafts', () => {
    expect(hasRealCode('   \n  ')).toBe(false);
  });

  it('is false for a lone leading comment line with nothing else', () => {
    expect(hasRealCode('-- Schreib hier deine Loesung\n')).toBe(false);
    expect(hasRealCode('-- Schreib hier deine Loesung')).toBe(false);
  });

  it('is true once real code follows the placeholder comment', () => {
    expect(hasRealCode('-- Schreib hier deine Loesung\nSELECT 1;')).toBe(true);
  });

  it('is true for code with no leading comment at all', () => {
    expect(hasRealCode('SELECT 1;')).toBe(true);
  });
});

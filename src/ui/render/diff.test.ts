import { describe, expect, it } from 'vitest';
import { computeLineDiff } from './diff';

describe('computeLineDiff', () => {
  it('marks identical lines as not differing', () => {
    const result = computeLineDiff('SELECT 1;', 'SELECT 1;');
    expect(result.mine[0]).toEqual({ text: 'SELECT 1;', differs: false });
    expect(result.theirs[0]).toEqual({ text: 'SELECT 1;', differs: false });
  });

  it('marks differing lines on both sides', () => {
    const result = computeLineDiff('SELECT 1;', 'SELECT 2;');
    expect(result.mine[0]?.differs).toBe(true);
    expect(result.theirs[0]?.differs).toBe(true);
  });

  it('ignores leading/trailing whitespace when comparing', () => {
    const result = computeLineDiff('  SELECT 1;  ', 'SELECT 1;');
    expect(result.mine[0]?.differs).toBe(false);
  });

  it('pads the shorter side with empty lines so both columns align', () => {
    const result = computeLineDiff('A', 'A\nB\nC');
    expect(result.mine).toHaveLength(3);
    expect(result.theirs).toHaveLength(3);
    expect(result.mine[1]).toEqual({ text: '', differs: true });
  });

  it('preserves the original (untrimmed) text for display', () => {
    const result = computeLineDiff('  indented', 'other');
    expect(result.mine[0]?.text).toBe('  indented');
  });

  it('handles both sides being empty', () => {
    const result = computeLineDiff('', '');
    expect(result.mine).toHaveLength(1);
    expect(result.mine[0]?.differs).toBe(false);
  });
});

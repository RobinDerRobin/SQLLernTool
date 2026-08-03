import { describe, expect, it } from 'vitest';
import { makeProgressKey } from './progressKey';

describe('makeProgressKey', () => {
  it('joins trackId, courseId and num into a single canonical key', () => {
    expect(makeProgressKey('sqlite', 'sqlLernenTool', '01')).toBe('sqlite:sqlLernenTool:01');
  });

  it('produces different keys for different tracks with the same course/num', () => {
    const a = makeProgressKey('sqlite', 'sqlLernenTool', '01');
    const b = makeProgressKey('postgres', 'sqlLernenTool', '01');
    expect(a).not.toBe(b);
  });

  it('produces different keys for different courses with the same track/num', () => {
    const a = makeProgressKey('sqlite', 'courseA', '01');
    const b = makeProgressKey('sqlite', 'courseB', '01');
    expect(a).not.toBe(b);
  });

  it('produces different keys for different challenge numbers', () => {
    const a = makeProgressKey('sqlite', 'sqlLernenTool', '01');
    const b = makeProgressKey('sqlite', 'sqlLernenTool', '1.1');
    expect(a).not.toBe(b);
  });
});

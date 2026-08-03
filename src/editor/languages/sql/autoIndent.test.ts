import { describe, expect, it } from 'vitest';
import { computeEnterInsertion } from './autoIndent';

describe('computeEnterInsertion', () => {
  it('copies the current line\'s leading indentation', () => {
    const text = '  SELECT 1';
    expect(computeEnterInsertion(text, text.length)).toBe('\n  ');
  });

  it('copies tab indentation', () => {
    const text = '\tSELECT 1';
    expect(computeEnterInsertion(text, text.length)).toBe('\n\t');
  });

  it('inserts no indentation for an unindented line', () => {
    const text = 'SELECT 1';
    expect(computeEnterInsertion(text, text.length)).toBe('\n');
  });

  it('resets indentation when the current line ends with a semicolon', () => {
    const text = '  SELECT 1;';
    expect(computeEnterInsertion(text, text.length)).toBe('\n');
  });

  it('resets indentation when the line ends with a semicolon followed by trailing spaces', () => {
    const text = '  SELECT 1;   ';
    expect(computeEnterInsertion(text, text.length)).toBe('\n');
  });

  it('only considers the current line, not earlier lines, when the cursor is on a later line', () => {
    const text = '  SELECT 1;\nFROM users';
    expect(computeEnterInsertion(text, text.length)).toBe('\n');
  });

  it('uses the indentation up to the cursor, not the whole line, when the cursor is mid-line', () => {
    const text = '    SELECT 1';
    const cursorAfterIndentOnly = 4;
    expect(computeEnterInsertion(text, cursorAfterIndentOnly)).toBe('\n    ');
  });

  it('adds one extra tab of indentation when the character right before the cursor is "("', () => {
    const text = 'SELECT * FROM foo(';
    expect(computeEnterInsertion(text, text.length)).toBe('\n\t');
  });

  it('adds the extra tab on top of the current line\'s existing indentation', () => {
    const text = '  FOO(';
    expect(computeEnterInsertion(text, text.length)).toBe('\n  \t');
  });

  it('does not add the extra tab when "(" is not the character immediately before the cursor', () => {
    const text = 'FOO( ';
    expect(computeEnterInsertion(text, text.length)).toBe('\n');
  });
});

import { describe, expect, it } from 'vitest';
import { dedentLine, insertTab } from './textOps';

describe('insertTab', () => {
  it('inserts a single tab character at the cursor', () => {
    const result = insertTab({ text: 'ab', selectionStart: 1, selectionEnd: 1 });
    expect(result).toEqual({ text: 'a\tb', selectionStart: 2, selectionEnd: 2 });
  });

  it('replaces an active selection with a single tab character', () => {
    const result = insertTab({ text: 'aXYZb', selectionStart: 1, selectionEnd: 4 });
    expect(result).toEqual({ text: 'a\tb', selectionStart: 2, selectionEnd: 2 });
  });

  it('works at the very start of the text', () => {
    const result = insertTab({ text: 'abc', selectionStart: 0, selectionEnd: 0 });
    expect(result).toEqual({ text: '\tabc', selectionStart: 1, selectionEnd: 1 });
  });
});

describe('dedentLine', () => {
  it('removes a single leading tab from the current line', () => {
    const text = '\tSELECT 1';
    const result = dedentLine({ text, selectionStart: text.length, selectionEnd: text.length });
    expect(result).toEqual({ text: 'SELECT 1', selectionStart: text.length - 1, selectionEnd: text.length - 1 });
  });

  it('does nothing when the current line has no leading tab', () => {
    const state = { text: 'SELECT 1', selectionStart: 4, selectionEnd: 4 };
    expect(dedentLine(state)).toEqual(state);
  });

  it('does nothing when the line is indented with spaces, not a tab', () => {
    const state = { text: '  SELECT 1', selectionStart: 5, selectionEnd: 5 };
    expect(dedentLine(state)).toEqual(state);
  });

  it('only dedents the line containing the cursor, not earlier lines', () => {
    const text = '\tSELECT 1;\n\tFROM users';
    const cursorOnSecondLine = text.length;
    const result = dedentLine({ text, selectionStart: cursorOnSecondLine, selectionEnd: cursorOnSecondLine });
    expect(result.text).toBe('\tSELECT 1;\nFROM users');
  });

  it('clamps the resulting cursor position to the start of the line, never before it', () => {
    const text = '\t';
    const result = dedentLine({ text, selectionStart: 1, selectionEnd: 1 });
    expect(result).toEqual({ text: '', selectionStart: 0, selectionEnd: 0 });
  });

  it('collapses an active selection to a single cursor position', () => {
    const text = '\tSELECT 1';
    const result = dedentLine({ text, selectionStart: 3, selectionEnd: 6 });
    expect(result.selectionStart).toBe(result.selectionEnd);
  });
});

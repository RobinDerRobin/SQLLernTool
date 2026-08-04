import { describe, expect, it } from 'vitest';
import { applyAutoClose } from './autoClosePairs';

function state(text: string, selectionStart: number, selectionEnd = selectionStart) {
  return { text, selectionStart, selectionEnd };
}

describe('applyAutoClose', () => {
  it('inserts a matching close bracket after an open bracket, cursor placed between them', () => {
    const result = applyAutoClose('(', state('', 0));
    expect(result).toEqual({ text: '()', selectionStart: 1, selectionEnd: 1 });
  });

  it('inserts a matching close bracket for [', () => {
    const result = applyAutoClose('[', state('', 0));
    expect(result).toEqual({ text: '[]', selectionStart: 1, selectionEnd: 1 });
  });

  it('inserts a matching close brace for { (needed for Python dict/set literals and f-string expressions)', () => {
    const result = applyAutoClose('{', state('', 0));
    expect(result).toEqual({ text: '{}', selectionStart: 1, selectionEnd: 1 });
  });

  it('skips over an existing closing brace instead of inserting a new one', () => {
    const result = applyAutoClose('}', state('{}', 1));
    expect(result).toEqual({ text: '{}', selectionStart: 2, selectionEnd: 2 });
  });

  it('wraps a selection when typing an open bracket, keeping the wrapped text selected', () => {
    const result = applyAutoClose('(', state('abc', 0, 3));
    expect(result).toEqual({ text: '(abc)', selectionStart: 1, selectionEnd: 4 });
  });

  it('inserts a matching closing quote after an opening quote with no selection', () => {
    const result = applyAutoClose("'", state('', 0));
    expect(result).toEqual({ text: "''", selectionStart: 1, selectionEnd: 1 });
  });

  it('skips over an existing closing quote instead of inserting a new pair', () => {
    // cursor is between the two quotes: '|'
    const result = applyAutoClose("'", state("''", 1));
    expect(result).toEqual({ text: "''", selectionStart: 2, selectionEnd: 2 });
  });

  it('skips over an existing closing paren instead of inserting a new one', () => {
    const result = applyAutoClose(')', state('()', 1));
    expect(result).toEqual({ text: '()', selectionStart: 2, selectionEnd: 2 });
  });

  it('does nothing special for a closing paren with no matching char ahead (falls through to normal typing)', () => {
    const result = applyAutoClose(')', state('', 0));
    expect(result).toBeNull();
  });

  it('does nothing special for an unrelated character', () => {
    const result = applyAutoClose('a', state('', 0));
    expect(result).toBeNull();
  });

  it('does not skip over when there is an active selection', () => {
    const result = applyAutoClose("'", state("'x'", 1, 2));
    // typedChar "'" with a selection "x": should wrap, not skip
    expect(result).toEqual({ text: "''x''", selectionStart: 2, selectionEnd: 3 });
  });
});

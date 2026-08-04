import { describe, expect, it } from 'vitest';
import { maybeUppercaseLastWord } from './uppercaseKeyword';

describe('maybeUppercaseLastWord', () => {
  it('uppercases a lowercase keyword immediately followed by a space', () => {
    const text = 'select ';
    const result = maybeUppercaseLastWord(text, text.length);
    expect(result).toEqual({ text: 'SELECT ', cursorPos: text.length });
  });

  it('triggers on each boundary character: space, newline, tab, comma, parens, semicolon', () => {
    for (const boundary of [' ', '\n', '\t', ',', '(', ')', ';']) {
      const text = `select${boundary}`;
      const result = maybeUppercaseLastWord(text, text.length);
      expect(result?.text).toBe(`SELECT${boundary}`);
    }
  });

  it('does nothing when the last character is not a boundary character', () => {
    const text = 'selec';
    expect(maybeUppercaseLastWord(text, text.length)).toBeNull();
  });

  it('does nothing when the word is not a recognized SQL keyword', () => {
    const text = 'users ';
    expect(maybeUppercaseLastWord(text, text.length)).toBeNull();
  });

  it('does nothing when the word is already uppercase', () => {
    const text = 'SELECT ';
    expect(maybeUppercaseLastWord(text, text.length)).toBeNull();
  });

  it('does nothing at the very start of the text', () => {
    expect(maybeUppercaseLastWord('', 0)).toBeNull();
  });

  it('only touches the word immediately before the boundary, not earlier text', () => {
    const text = 'FROM users where ';
    const result = maybeUppercaseLastWord(text, text.length);
    expect(result).toEqual({ text: 'FROM users WHERE ', cursorPos: text.length });
  });

  it('leaves the cursor position unchanged', () => {
    const text = 'FROM select ';
    const cursorPos = text.length;
    const result = maybeUppercaseLastWord(text, cursorPos);
    expect(result?.cursorPos).toBe(cursorPos);
  });

  it('does not uppercase a keyword-lookalike word inside a string literal', () => {
    // The string VALUE is "select ", not SQL syntax — must stay untouched.
    const text = "SELECT 'select ";
    expect(maybeUppercaseLastWord(text, text.length)).toBeNull();
  });

  it('does not uppercase inside a string literal even mid-statement, with real SQL after', () => {
    const text = "WHERE status = 'all ";
    expect(maybeUppercaseLastWord(text, text.length)).toBeNull();
  });

  it('does not uppercase a keyword-lookalike word inside a -- comment', () => {
    const text = '-- select ';
    expect(maybeUppercaseLastWord(text, text.length)).toBeNull();
  });

  it('does not uppercase a keyword-lookalike word inside a /* */ comment', () => {
    const text = '/* select ';
    expect(maybeUppercaseLastWord(text, text.length)).toBeNull();
  });

  it('still uppercases real SQL keywords that follow a string literal on the same line', () => {
    const text = "WHERE name = 'select' and ";
    const result = maybeUppercaseLastWord(text, text.length);
    expect(result?.text).toBe("WHERE name = 'select' AND ");
  });
});

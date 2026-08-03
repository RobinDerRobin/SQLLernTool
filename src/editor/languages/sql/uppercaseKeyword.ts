import { SQL_KEYWORDS } from './keywords';

const BOUNDARY_CHARS = new Set([' ', '\n', '\t', ',', '(', ')', ';']);

export interface UppercaseResult {
  text: string;
  cursorPos: number;
}

/**
 * Pure port of the prototype's `maybeUppercaseLastWord`: when the character
 * just before the cursor is a boundary character, and the word right before
 * that boundary is a known SQL keyword typed in lowercase, uppercases it.
 * Returns null when nothing should change.
 */
export function maybeUppercaseLastWord(text: string, cursorPos: number): UppercaseResult | null {
  if (cursorPos === 0) return null;
  const lastChar = text[cursorPos - 1];
  if (lastChar === undefined || !BOUNDARY_CHARS.has(lastChar)) return null;

  let start = cursorPos - 2;
  while (start >= 0 && /[A-Za-z_]/.test(text[start] ?? '')) start--;
  start++;

  const word = text.slice(start, cursorPos - 1);
  if (!word) return null;

  const upper = word.toUpperCase();
  if (word === upper || !SQL_KEYWORDS.has(upper)) return null;

  const newText = text.slice(0, start) + upper + text.slice(cursorPos - 1);
  return { text: newText, cursorPos };
}

import { SQL_KEYWORDS } from './keywords';
import { tokenizeSql } from './tokenizer';

const BOUNDARY_CHARS = new Set([' ', '\n', '\t', ',', '(', ')', ';']);

interface UppercaseResult {
  text: string;
  cursorPos: number;
}

/**
 * Whether `position` (a character offset) falls inside a string or comment
 * token — reuses the same tokenizer the syntax highlighter relies on, so
 * "what counts as a string" is defined in exactly one place, not
 * re-approximated here.
 */
function isInsideStringOrComment(text: string, position: number): boolean {
  let offset = 0;
  for (const token of tokenizeSql(text)) {
    const tokenEnd = offset + token.value.length;
    if (position >= offset && position < tokenEnd) {
      return token.type === 'string' || token.type === 'comment';
    }
    offset = tokenEnd;
  }
  return false;
}

/**
 * Pure port of the prototype's `maybeUppercaseLastWord`: when the character
 * just before the cursor is a boundary character, and the word right before
 * that boundary is a known SQL keyword typed in lowercase, uppercases it.
 * Returns null when nothing should change — including when the word sits
 * inside a string literal or comment, where uppercasing would silently
 * corrupt the actual value instead of formatting code (e.g. typing
 * `'select '` as a string value must not become `'SELECT '`).
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

  if (isInsideStringOrComment(text, start)) return null;

  const newText = text.slice(0, start) + upper + text.slice(cursorPos - 1);
  return { text: newText, cursorPos };
}

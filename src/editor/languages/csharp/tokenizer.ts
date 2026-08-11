import { CSHARP_KEYWORDS, CSHARP_OTHER_KEYWORDS, CSHARP_TYPES } from './keywords';

export type CSharpTokenType =
  | 'keyword'
  | 'keywordAlt'
  | 'type'
  | 'function'
  | 'string'
  | 'ident'
  | 'number'
  | 'operator'
  | 'comment'
  | 'whitespace'
  | 'punctuation';

interface CSharpToken {
  type: CSharpTokenType;
  value: string;
}

const TWO_CHAR_OPERATORS = [
  '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '=>', '??', '?.', '<<', '>>',
];
const ONE_CHAR_OPERATORS = new Set(['=', '<', '>', '+', '-', '*', '/', '%', '!', '&', '|', '^', '~', '?', ':', ',', '.']);

/**
 * Unlike the SQL/Python tokenizers, reserved words are checked *before* the
 * followed-by-`(` rule: every C# keyword and built-in type is a genuinely
 * reserved word (never usable as an identifier), so `if (`, `while (`,
 * `catch (` etc. — which is virtually all real C# control-flow syntax —
 * would otherwise be misclassified as function calls. Only true user
 * identifiers fall through to the paren-based function heuristic.
 */
function classifyWord(word: string, followedByParen: boolean): CSharpTokenType {
  if (CSHARP_KEYWORDS.has(word)) return 'keyword';
  if (CSHARP_OTHER_KEYWORDS.has(word)) return 'keywordAlt';
  if (CSHARP_TYPES.has(word)) return 'type';
  if (followedByParen) return 'function';
  return 'ident';
}

/** Scans a `"..."`/`$"..."` string with backslash-escapes, starting at the opening `"`. */
function scanEscapedString(code: string, start: number): number {
  const n = code.length;
  let j = start + 1;
  while (j < n) {
    if (code[j] === '\\') {
      j += 2;
      continue;
    }
    if (code[j] === '"' || code[j] === '\n') {
      return code[j] === '"' ? j + 1 : j;
    }
    j++;
  }
  return n;
}

/** Scans a verbatim `@"..."` string, where `""` is the only escape (no backslash-escapes) and newlines are allowed. */
function scanVerbatimString(code: string, start: number): number {
  const n = code.length;
  let j = start + 1;
  while (j < n) {
    if (code[j] === '"') {
      if (code[j + 1] === '"') {
        j += 2;
        continue;
      }
      return j + 1;
    }
    j++;
  }
  return n;
}

function scanCharLiteral(code: string, start: number): number {
  const n = code.length;
  let j = start + 1;
  while (j < n) {
    if (code[j] === '\\') {
      j += 2;
      continue;
    }
    if (code[j] === "'" || code[j] === '\n') {
      return code[j] === "'" ? j + 1 : j;
    }
    j++;
  }
  return n;
}

/** Pure C# tokenizer — good enough for syntax highlighting and auto-indent, not a full parser. */
export function tokenizeCSharp(code: string): CSharpToken[] {
  const tokens: CSharpToken[] = [];
  const n = code.length;
  let i = 0;

  while (i < n) {
    const ch = code[i]!;
    const next = code[i + 1];

    if (ch === '/' && next === '/') {
      let j = i;
      while (j < n && code[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(code[j] === '*' && code[j + 1] === '/')) j++;
      j = Math.min(j + 2, n);
      tokens.push({ type: 'comment', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if ((ch === '@' && next === '"') || (ch === '$' && next === '@' && code[i + 2] === '"')) {
      const openAt = ch === '@' ? i + 1 : i + 2;
      const j = scanVerbatimString(code, openAt);
      tokens.push({ type: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '$' && next === '"') {
      const j = scanEscapedString(code, i + 1);
      tokens.push({ type: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"') {
      const j = scanEscapedString(code, i);
      tokens.push({ type: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === "'") {
      const j = scanCharLiteral(code, i);
      tokens.push({ type: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/\s/.test(ch)) {
      let j = i;
      while (j < n && code[j] && /\s/.test(code[j]!)) j++;
      tokens.push({ type: 'whitespace', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < n && code[j] && /[0-9.]/.test(code[j]!)) j++;
      while (j < n && code[j] && /[fFdDmMuUlL]/.test(code[j]!)) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < n && code[j] && /[A-Za-z0-9_]/.test(code[j]!)) j++;
      const word = code.slice(i, j);
      const followedByParen = /^\s*\(/.test(code.slice(j));
      tokens.push({ type: classifyWord(word, followedByParen), value: word });
      i = j;
      continue;
    }

    const twoChar = code.slice(i, i + 2);
    if (TWO_CHAR_OPERATORS.includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar });
      i += 2;
      continue;
    }

    if (ONE_CHAR_OPERATORS.has(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++;
      continue;
    }

    tokens.push({ type: 'punctuation', value: ch });
    i++;
  }

  return tokens;
}

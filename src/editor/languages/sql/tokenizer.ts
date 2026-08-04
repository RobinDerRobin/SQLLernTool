import { CLAUSE_KEYWORDS, DATATYPES, FUNCTION_NAMES, OTHER_KEYWORDS } from './keywords';

export type SqlTokenType =
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

interface SqlToken {
  type: SqlTokenType;
  value: string;
}

const TWO_CHAR_OPERATORS = ['<=', '>=', '<>', '!=', '||'];
const ONE_CHAR_OPERATORS = new Set(['=', '<', '>', '+', '-', '*', '/', '%']);

/**
 * A word immediately (whitespace allowed) followed by `(` is always treated
 * as a function call — even a keyword or datatype word (e.g. `DATE(` vs a
 * bare `DATE` type name) — matching the original highlighter's priority,
 * which checks this before any keyword-set membership.
 */
function classifyWord(word: string, followedByParen: boolean): SqlTokenType {
  if (followedByParen) return 'function';
  const upper = word.toUpperCase();
  if (CLAUSE_KEYWORDS.has(upper)) return 'keyword';
  if (OTHER_KEYWORDS.has(upper)) return 'keywordAlt';
  if (DATATYPES.has(upper)) return 'type';
  if (FUNCTION_NAMES.has(upper)) return 'function';
  return 'ident';
}

/** Pure SQL tokenizer, ported from the prototype's `highlightSQL`. */
export function tokenizeSql(code: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  const n = code.length;
  let i = 0;

  while (i < n) {
    const ch = code[i]!;
    const next = code[i + 1];

    if (ch === '-' && next === '-') {
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

    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (code[j] === quote) {
          if (code[j + 1] === quote) {
            j += 2;
            continue;
          }
          j++;
          break;
        }
        j++;
      }
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

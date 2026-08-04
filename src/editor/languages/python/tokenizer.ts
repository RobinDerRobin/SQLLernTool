import { PYTHON_BUILTIN_NAMES, PYTHON_KEYWORDS, PYTHON_OTHER_KEYWORDS } from './keywords';

export type PythonTokenType =
  | 'keyword'
  | 'keywordAlt'
  | 'function'
  | 'string'
  | 'ident'
  | 'number'
  | 'operator'
  | 'comment'
  | 'whitespace'
  | 'punctuation';

interface PythonToken {
  type: PythonTokenType;
  value: string;
}

const TWO_CHAR_OPERATORS = ['==', '!=', '<=', '>=', '//', '**', '->', '+=', '-=', '*=', '/=', '%=', ':='];
const ONE_CHAR_OPERATORS = new Set(['=', '<', '>', '+', '-', '*', '/', '%', ':', ',', '.']);

/** Same priority rule as the SQL tokenizer: a word followed by `(` is always a function call, regardless of keyword status. */
function classifyWord(word: string, followedByParen: boolean): PythonTokenType {
  if (followedByParen) return 'function';
  if (PYTHON_KEYWORDS.has(word)) return 'keyword';
  if (PYTHON_OTHER_KEYWORDS.has(word)) return 'keywordAlt';
  if (PYTHON_BUILTIN_NAMES.has(word)) return 'function';
  return 'ident';
}

function scanString(code: string, start: number): number {
  const n = code.length;
  const triple = code.slice(start, start + 3);
  if (triple === '"""' || triple === "'''") {
    const j = code.indexOf(triple, start + 3);
    return j === -1 ? n : j + 3;
  }
  const quote = code[start]!;
  let j = start + 1;
  while (j < n) {
    if (code[j] === '\\') {
      j += 2;
      continue;
    }
    if (code[j] === quote || code[j] === '\n') {
      return code[j] === quote ? j + 1 : j;
    }
    j++;
  }
  return n;
}

/** Pure Python tokenizer — good enough for syntax highlighting and auto-indent, not a full parser. */
export function tokenizePython(code: string): PythonToken[] {
  const tokens: PythonToken[] = [];
  const n = code.length;
  let i = 0;

  while (i < n) {
    const ch = code[i]!;

    if (ch === '#') {
      let j = i;
      while (j < n && code[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const j = scanString(code, i);
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

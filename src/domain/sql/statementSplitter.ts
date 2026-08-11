interface SqlStatement {
  text: string;
  startOffset: number;
}

/**
 * True if `text` contains any real SQL once line/block comments are
 * discounted — a fragment that's only a comment (e.g. a trailing `-- note`
 * after the last `;`, or between two statements with no code of its own) is
 * not something `engine.exec()`/`db.prepare()` should ever see: sql.js
 * throws a raw string ("Nothing to prepare") for it, not an `Error`, which
 * otherwise surfaces to the user as a nonsensical "Zeile N: undefined"
 * instead of running (or correctly ignoring) the surrounding real SQL.
 * Mirrors `splitStatements`' own comment/string tokenizing rules exactly, so
 * a quote character is treated as real content the moment it's seen (a
 * string literal can't consist of nothing but whitespace). A bare `;` is
 * *not* content on its own — a fragment's own terminating semicolon
 * shouldn't make an otherwise comment-only fragment look non-empty.
 */
export function hasSqlContent(text: string): boolean {
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === inString) {
        if (next === inString) {
          i++;
        } else {
          inString = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      return true;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      continue;
    }
    if (ch !== undefined && ch !== ';' && !/\s/.test(ch)) return true;
  }
  return false;
}

/**
 * Splits a block of SQL text into individual statements on `;`, without
 * splitting inside string literals ('...'/"..."/`...`) or comments (--, /* * /).
 * A doubled quote char inside a string ('') is treated as an escaped quote,
 * not the string's end. Fragments that turn out to be nothing but comments
 * (see `hasSqlContent`) are dropped rather than returned as an empty-looking
 * "statement" — they were never meant to reach the engine.
 */
export function splitStatements(sql: string): SqlStatement[] {
  const statements: SqlStatement[] = [];
  let start = 0;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === inString) {
        if (next === inString) {
          i++;
        } else {
          inString = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      continue;
    }
    if (ch === ';') {
      const text = sql.slice(start, i + 1);
      if (hasSqlContent(text)) statements.push({ text, startOffset: start });
      start = i + 1;
    }
  }

  if (start < sql.length) {
    const rest = sql.slice(start);
    if (hasSqlContent(rest)) statements.push({ text: rest, startOffset: start });
  }

  return statements;
}

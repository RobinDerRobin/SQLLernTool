interface SqlStatement {
  text: string;
  startOffset: number;
}

/**
 * Splits a block of SQL text into individual statements on `;`, without
 * splitting inside string literals ('...'/"..."/`...`) or comments (--, /* * /).
 * A doubled quote char inside a string ('') is treated as an escaped quote,
 * not the string's end.
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
      statements.push({ text: sql.slice(start, i + 1), startOffset: start });
      start = i + 1;
    }
  }

  if (start < sql.length) {
    const rest = sql.slice(start);
    if (rest.trim()) statements.push({ text: rest, startOffset: start });
  }

  return statements;
}

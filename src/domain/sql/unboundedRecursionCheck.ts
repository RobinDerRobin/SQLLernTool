const WITH_RECURSIVE_REGEX = /WITH\s+RECURSIVE\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:\([^)]*\))?\s*AS\s*\(/gi;

/**
 * Finds the span of the parenthesized body starting at `openParenIndex`
 * (which must point at an opening `(`), tracking string literals and
 * comments the same way `statementSplitter.ts`/`tableNames.ts` do, so a `)`
 * inside a string or comment doesn't end the match early.
 */
function findParenBody(sql: string, openParenIndex: number): { bodyStart: number; bodyEnd: number } | null {
  let depth = 0;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let bodyStart = -1;

  for (let i = openParenIndex; i < sql.length; i++) {
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
        if (next === inString) i++;
        else inString = null;
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
    if (ch === '(') {
      if (depth === 0) bodyStart = i + 1;
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth === 0) return { bodyStart, bodyEnd: i };
    }
  }
  return null;
}

/**
 * Splits `body` on top-level (paren-depth-0) `UNION` / `UNION ALL` keywords,
 * returning the text after the LAST such split — i.e. the recursive member
 * of a `WITH RECURSIVE anchor UNION ALL recursive` CTE body. Doesn't try to
 * handle CTEs with more than one recursive self-reference chained by
 * further UNIONs beyond the common two-part anchor/recursive shape. Expects
 * `body` to already have strings/comments blanked out by
 * `stripStringsAndComments` (see the caller) — a raw `(`/`)` inside a
 * comment would otherwise throw off the depth count this relies on.
 */
function recursiveMemberOf(body: string): string {
  let depth = 0;
  let lastSplitEnd = 0;
  let result = body;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      continue;
    }
    if (depth === 0) {
      const rest = body.slice(i);
      const match = /^UNION\s+ALL\b|^UNION\b/i.exec(rest);
      if (match) {
        lastSplitEnd = i + match[0].length;
        result = body.slice(lastSplitEnd);
      }
    }
  }
  return result;
}

/**
 * Blanks out string literals and comments in `text` (replacing their
 * contents with spaces, preserving all other offsets), so a `WHERE`/`LIMIT`
 * keyword written only inside a comment or a string literal — e.g. a
 * student's own `-- WHERE n < 100` note-to-self, or a stray mention in a
 * trailing remark — never satisfies the safety checks below. Only real,
 * executable SQL can turn off this guard.
 */
function stripStringsAndComments(text: string): string {
  let result = '';
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      result += ch === '\n' ? '\n' : ' ';
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        result += '  ';
        i++;
      } else {
        result += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (inString) {
      if (ch === inString) {
        if (next === inString) {
          result += '  ';
          i++;
        } else {
          inString = null;
          result += ' ';
        }
      } else {
        result += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      result += ' ';
      continue;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      result += '  ';
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      result += '  ';
      i++;
      continue;
    }
    result += ch;
  }
  return result;
}

/**
 * Pure, best-effort pre-flight check: flags a `WITH RECURSIVE` CTE whose
 * recursive member has no `WHERE` clause AND the rest of the statement after
 * the CTE has no `LIMIT` either — the shape that runs forever, since sql.js
 * 1.10.2 exposes no `sqlite3_interrupt`/progress handler to abort it once
 * started (see src/runtime/README notes). Not a full SQL parser — a
 * deliberately narrow heuristic matching this tool's own teaching content
 * (a single simple `WITH RECURSIVE name(cols) AS (anchor UNION ALL recursive)`
 * per statement), erring toward false negatives (letting through SQL it
 * doesn't recognize) rather than blocking legitimate queries it can't parse.
 */
export function findUnboundedRecursion(sql: string): string | null {
  WITH_RECURSIVE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WITH_RECURSIVE_REGEX.exec(sql)) !== null) {
    const openParenIndex = match.index + match[0].length - 1;
    const body = findParenBody(sql, openParenIndex);
    if (!body) continue;

    const cteBody = stripStringsAndComments(sql.slice(body.bodyStart, body.bodyEnd));
    const recursivePart = recursiveMemberOf(cteBody);
    const hasWhere = /\bWHERE\b/i.test(recursivePart);
    if (hasWhere) continue;

    const afterCte = sql.slice(body.bodyEnd + 1);
    const hasLimit = /\bLIMIT\b/i.test(stripStringsAndComments(afterCte));
    if (hasLimit) continue;

    return (
      'Diese WITH RECURSIVE-Abfrage hat im rekursiven Teil weder eine WHERE-Bedingung noch danach ein LIMIT — ' +
      'ohne eine der beiden Abbruchbedingungen läuft die Rekursion unendlich weiter und würde den Tab einfrieren. ' +
      'Ergänze eine WHERE-Bedingung im rekursiven Teil (z. B. "WHERE n < 100") oder ein LIMIT auf die Abfrage.'
    );
  }
  return null;
}

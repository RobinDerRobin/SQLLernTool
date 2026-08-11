import { describe, expect, it } from 'vitest';
import { hasSqlContent, splitStatements } from './statementSplitter';

describe('splitStatements', () => {
  it('splits two simple statements on the semicolon', () => {
    const result = splitStatements('SELECT 1;\nSELECT 2;');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;', '\nSELECT 2;']);
  });

  it('keeps a trailing statement without a closing semicolon', () => {
    const result = splitStatements('SELECT 1;\nSELECT 2');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;', '\nSELECT 2']);
  });

  it('does not split on a semicolon inside a single-quoted string', () => {
    const result = splitStatements("INSERT INTO t VALUES ('a;b');\nSELECT 1;");
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe("INSERT INTO t VALUES ('a;b');");
  });

  it('does not split on a semicolon inside a double-quoted identifier', () => {
    const result = splitStatements('SELECT "weird;name" FROM t;\nSELECT 1;');
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe('SELECT "weird;name" FROM t;');
  });

  it('does not split on a semicolon inside a backtick-quoted identifier', () => {
    const result = splitStatements('SELECT `weird;name` FROM t;\nSELECT 1;');
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe('SELECT `weird;name` FROM t;');
  });

  it('handles a doubled quote as an escaped quote inside a string', () => {
    const result = splitStatements("SELECT 'it''s; fine';\nSELECT 1;");
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe("SELECT 'it''s; fine';");
  });

  it('does not split on a semicolon inside a line comment, and resumes after the newline', () => {
    const result = splitStatements('SELECT 1; -- comment; still comment\nSELECT 2;');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;', ' -- comment; still comment\nSELECT 2;']);
  });

  it('does not split on a semicolon inside a block comment', () => {
    const result = splitStatements('SELECT 1; /* a; b */ SELECT 2;');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;', ' /* a; b */ SELECT 2;']);
  });

  it('ignores a whitespace-only trailing remainder after the last semicolon', () => {
    const result = splitStatements('SELECT 1;\n\n   ');
    expect(result).toHaveLength(1);
  });

  it('returns an empty array for empty or whitespace-only input', () => {
    expect(splitStatements('')).toEqual([]);
    expect(splitStatements('   \n  ')).toEqual([]);
  });

  // Regression: a trailing line comment after the last statement used to be
  // kept as its own "statement" (non-whitespace after .trim()), which then
  // reached engine.exec()/db.prepare() and blew up — sql.js throws a raw
  // string ("Nothing to prepare") for it, not an Error, surfacing to the user
  // as "Zeile N: undefined" for an otherwise entirely correct query.
  it('drops a trailing line comment after the last statement instead of treating it as its own statement', () => {
    const result = splitStatements('SELECT 1;\n-- all done here');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;']);
  });

  it('drops a trailing block comment after the last statement', () => {
    const result = splitStatements('SELECT 1;\n/* all done here */');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;']);
  });

  it('drops a comment-only fragment between two real statements', () => {
    const result = splitStatements('SELECT 1;\n-- a stray comment ends up terminated below\n;\nSELECT 2;');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;', '\nSELECT 2;']);
  });

  it('still keeps a trailing statement that has real SQL alongside a comment', () => {
    const result = splitStatements('SELECT 1;\n-- explains the next line\nSELECT 2');
    expect(result.map((s) => s.text)).toEqual(['SELECT 1;', '\n-- explains the next line\nSELECT 2']);
  });

  it('reports correct startOffset for each statement', () => {
    const sql = 'SELECT 1;\nSELECT 2;';
    const result = splitStatements(sql);
    expect(result[0]?.startOffset).toBe(0);
    expect(result[1]?.startOffset).toBe(9);
    result.forEach((stmt) => {
      expect(sql.slice(stmt.startOffset, stmt.startOffset + stmt.text.length)).toBe(stmt.text);
    });
  });
});

describe('hasSqlContent', () => {
  it('is false for empty or whitespace-only text', () => {
    expect(hasSqlContent('')).toBe(false);
    expect(hasSqlContent('   \n\t ')).toBe(false);
  });

  it('is false for a line-comment-only fragment', () => {
    expect(hasSqlContent('-- just a note\n')).toBe(false);
  });

  it('is false for a block-comment-only fragment', () => {
    expect(hasSqlContent('/* just a note */')).toBe(false);
  });

  it('is false for whitespace mixed with comments only', () => {
    expect(hasSqlContent('  -- note one\n  /* note two */  ')).toBe(false);
  });

  it('is false for a bare semicolon, or a comment followed by one', () => {
    expect(hasSqlContent(';')).toBe(false);
    expect(hasSqlContent('-- comment\n;')).toBe(false);
  });

  it('is true for real SQL', () => {
    expect(hasSqlContent('SELECT 1')).toBe(true);
  });

  it('is true for a statement that also contains a comment', () => {
    expect(hasSqlContent('SELECT 1 -- inline note')).toBe(true);
  });

  it('is true the moment a string literal starts, even if its content is only whitespace', () => {
    expect(hasSqlContent("'   '")).toBe(true);
  });
});

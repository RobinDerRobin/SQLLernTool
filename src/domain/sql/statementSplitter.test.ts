import { describe, expect, it } from 'vitest';
import { splitStatements } from './statementSplitter';

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

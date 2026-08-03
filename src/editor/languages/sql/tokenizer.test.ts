import { describe, expect, it } from 'vitest';
import { tokenizeSql } from './tokenizer';

function values(code: string) {
  return tokenizeSql(code).map((t) => t.value);
}

describe('tokenizeSql', () => {
  it('classifies clause keywords', () => {
    const tokens = tokenizeSql('SELECT');
    expect(tokens).toEqual([{ type: 'keyword', value: 'SELECT' }]);
  });

  it('classifies other keywords', () => {
    const tokens = tokenizeSql('AND');
    expect(tokens).toEqual([{ type: 'keywordAlt', value: 'AND' }]);
  });

  it('classifies datatypes', () => {
    const tokens = tokenizeSql('INTEGER');
    expect(tokens).toEqual([{ type: 'type', value: 'INTEGER' }]);
  });

  it('classifies function names', () => {
    const tokens = tokenizeSql('COUNT');
    expect(tokens).toEqual([{ type: 'function', value: 'COUNT' }]);
  });

  it('classifies unrecognized words as identifiers', () => {
    const tokens = tokenizeSql('users');
    expect(tokens).toEqual([{ type: 'ident', value: 'users' }]);
  });

  it('is case-insensitive when classifying keywords, but preserves original casing in the token value', () => {
    const tokens = tokenizeSql('select');
    expect(tokens).toEqual([{ type: 'keyword', value: 'select' }]);
  });

  it('classifies single- and double-quoted strings, including a doubled-quote escape', () => {
    expect(tokenizeSql("'it''s'")).toEqual([{ type: 'string', value: "'it''s'" }]);
    expect(tokenizeSql('"col"')).toEqual([{ type: 'string', value: '"col"' }]);
  });

  it('classifies integer and decimal numbers', () => {
    expect(tokenizeSql('42')).toEqual([{ type: 'number', value: '42' }]);
    expect(tokenizeSql('3.14')).toEqual([{ type: 'number', value: '3.14' }]);
  });

  it('classifies a line comment up to the newline', () => {
    const tokens = tokenizeSql('-- hi\nSELECT');
    expect(tokens[0]).toEqual({ type: 'comment', value: '-- hi' });
  });

  it('classifies a block comment', () => {
    const tokens = tokenizeSql('/* a\nb */SELECT');
    expect(tokens[0]).toEqual({ type: 'comment', value: '/* a\nb */' });
  });

  it('classifies multi-char and single-char operators', () => {
    expect(tokenizeSql('<=')).toEqual([{ type: 'operator', value: '<=' }]);
    expect(tokenizeSql('<>')).toEqual([{ type: 'operator', value: '<>' }]);
    expect(tokenizeSql('||')).toEqual([{ type: 'operator', value: '||' }]);
    expect(tokenizeSql('=')).toEqual([{ type: 'operator', value: '=' }]);
  });

  it('classifies punctuation and whitespace', () => {
    expect(tokenizeSql('(')).toEqual([{ type: 'punctuation', value: '(' }]);
    expect(tokenizeSql(', ')).toEqual([
      { type: 'punctuation', value: ',' },
      { type: 'whitespace', value: ' ' },
    ]);
  });

  it('tokenizes a realistic multi-token statement', () => {
    expect(values("SELECT name FROM users WHERE id = 1;")).toEqual([
      'SELECT', ' ', 'name', ' ', 'FROM', ' ', 'users', ' ', 'WHERE', ' ', 'id', ' ', '=', ' ', '1', ';',
    ]);
  });

  it('classifies any identifier followed by "(" as a function, even if not in the known function-name list', () => {
    const tokens = tokenizeSql('foo(');
    expect(tokens[0]).toEqual({ type: 'function', value: 'foo' });
  });

  it('still allows whitespace between the identifier and "(" when detecting a function call', () => {
    const tokens = tokenizeSql('foo (');
    expect(tokens[0]).toEqual({ type: 'function', value: 'foo' });
  });

  it('classifies a datatype word as a function when followed by "(", disambiguating DATE() the function from DATE the type', () => {
    expect(tokenizeSql('DATE(')[0]).toEqual({ type: 'function', value: 'DATE' });
    expect(tokenizeSql('DATE ')[0]).toEqual({ type: 'type', value: 'DATE' });
  });

  it('classifies a clause keyword as a function when directly followed by "(" (matches the original highlighter\'s priority)', () => {
    expect(tokenizeSql('SELECT(')[0]).toEqual({ type: 'function', value: 'SELECT' });
  });

  it('round-trips: concatenating all token values reconstructs the original code exactly', () => {
    const code = "SELECT name, COUNT(*) FROM users -- comment\nWHERE id >= 1 AND name = 'it''s';";
    const rebuilt = tokenizeSql(code).map((t) => t.value).join('');
    expect(rebuilt).toBe(code);
  });
});

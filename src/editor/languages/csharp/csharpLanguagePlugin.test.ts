import { describe, expect, it } from 'vitest';
import { computeEnterInsertion } from './autoIndent';
import { csharpLanguagePlugin } from './csharpLanguagePlugin';
import { highlightCSharp } from './highlight';
import { tokenizeCSharp } from './tokenizer';

describe('tokenizeCSharp', () => {
  it('classifies control-flow keywords distinctly from built-in types and true/false/null', () => {
    const tokens = tokenizeCSharp('if (true) { int x = 0; }');
    expect(tokens.find((t) => t.value === 'if')?.type).toBe('keyword');
    expect(tokens.find((t) => t.value === 'true')?.type).toBe('keywordAlt');
    expect(tokens.find((t) => t.value === 'int')?.type).toBe('type');
  });

  it('classifies any identifier immediately followed by "(" as a function call', () => {
    const tokens = tokenizeCSharp('BerechneAlter(2001)');
    expect(tokens.find((t) => t.value === 'BerechneAlter')?.type).toBe('function');
  });

  it('classifies "if" as a keyword even directly followed by "(" — unlike SQL/Python, reserved words win over the paren-call heuristic', () => {
    const tokens = tokenizeCSharp('if (x > 0) { }');
    expect(tokens.find((t) => t.value === 'if')?.type).toBe('keyword');
  });

  it('tokenizes a // comment to the end of the line', () => {
    const tokens = tokenizeCSharp('int x = 1; // ein Kommentar\nint y = 2;');
    expect(tokens.find((t) => t.type === 'comment')?.value).toBe('// ein Kommentar');
  });

  it('tokenizes a /* */ block comment spanning multiple lines', () => {
    const tokens = tokenizeCSharp('/* erste Zeile\nzweite Zeile */ int x = 1;');
    expect(tokens[0]).toEqual({ type: 'comment', value: '/* erste Zeile\nzweite Zeile */' });
  });

  it('tokenizes double-quoted strings, including escaped quotes', () => {
    const tokens = tokenizeCSharp(String.raw`string s = "sag \"hallo\"";`);
    expect(tokens.find((t) => t.type === 'string')?.value).toBe(String.raw`"sag \"hallo\""`);
  });

  it('tokenizes char literals', () => {
    const tokens = tokenizeCSharp("char c = 'x';");
    expect(tokens.find((t) => t.type === 'string')?.value).toBe("'x'");
  });

  it('tokenizes interpolated $"..." strings as a single string token', () => {
    const tokens = tokenizeCSharp('Console.WriteLine($"x = {x}");');
    expect(tokens.find((t) => t.type === 'string')?.value).toBe('$"x = {x}"');
  });

  it('tokenizes verbatim @"..." strings, where "" is the escape for a literal quote', () => {
    const tokens = tokenizeCSharp('string s = @"C:\\Temp ""quoted""";');
    expect(tokens.find((t) => t.type === 'string')?.value).toBe('@"C:\\Temp ""quoted"""');
  });

  it.each(['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '=>', '??'])(
    'tokenizes the two-character operator "%s" as a single operator token, not two',
    (op) => {
      const tokens = tokenizeCSharp(`x ${op} y`);
      const operatorTokens = tokens.filter((t) => t.type === 'operator');
      expect(operatorTokens).toEqual([{ type: 'operator', value: op }]);
    },
  );
});

describe('highlightCSharp', () => {
  it('HTML-escapes token values (e.g. a string literal containing a stray "<")', () => {
    const html = highlightCSharp(`string s = "<script>";`);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('computeEnterInsertion (C# auto-indent)', () => {
  it('adds one extra tab after a line ending in "{"', () => {
    const text = 'if (punkte >= 50) {';
    expect(computeEnterInsertion(text, text.length)).toBe('\n\t');
  });

  it('keeps the same indentation after a non-brace line', () => {
    const text = '\tKategorie = "bestanden";';
    expect(computeEnterInsertion(text, text.length)).toBe('\n\t');
  });

  it('does not add extra indentation for a top-level line not ending in "{"', () => {
    const text = 'int x = 1;';
    expect(computeEnterInsertion(text, text.length)).toBe('\n');
  });
});

describe('csharpLanguagePlugin', () => {
  it('has id "csharp" and wires all five LanguagePlugin methods', () => {
    expect(csharpLanguagePlugin.id).toBe('csharp');
    expect(typeof csharpLanguagePlugin.tokenize).toBe('function');
    expect(typeof csharpLanguagePlugin.highlight).toBe('function');
    expect(typeof csharpLanguagePlugin.computeEnterInsertion).toBe('function');
    expect(typeof csharpLanguagePlugin.applyAutoClose).toBe('function');
    expect(typeof csharpLanguagePlugin.maybeUppercaseLastWord).toBe('function');
  });

  it('maybeUppercaseLastWord is a no-op (C# keywords stay lowercase)', () => {
    expect(csharpLanguagePlugin.maybeUppercaseLastWord('if ', 3)).toBeNull();
  });

  it('applyAutoClose still closes brackets/quotes (reused from the SQL track)', () => {
    const result = csharpLanguagePlugin.applyAutoClose('(', { text: '', selectionStart: 0, selectionEnd: 0 });
    expect(result).toEqual({ text: '()', selectionStart: 1, selectionEnd: 1 });
  });
});

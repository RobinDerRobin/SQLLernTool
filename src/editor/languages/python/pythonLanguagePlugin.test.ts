import { describe, expect, it } from 'vitest';
import { computeEnterInsertion } from './autoIndent';
import { highlightPython } from './highlight';
import { pythonLanguagePlugin } from './pythonLanguagePlugin';
import { tokenizePython } from './tokenizer';

describe('tokenizePython', () => {
  it('classifies control-flow keywords distinctly from and/or/not/True/False/None', () => {
    const tokens = tokenizePython('if True and not False:');
    expect(tokens.find((t) => t.value === 'if')?.type).toBe('keyword');
    expect(tokens.find((t) => t.value === 'True')?.type).toBe('keywordAlt');
    expect(tokens.find((t) => t.value === 'and')?.type).toBe('keywordAlt');
    expect(tokens.find((t) => t.value === 'not')?.type).toBe('keywordAlt');
  });

  it('classifies a call to a known builtin as a function even without parens tracked separately', () => {
    const tokens = tokenizePython('print("hi")');
    expect(tokens.find((t) => t.value === 'print')?.type).toBe('function');
  });

  it('classifies any identifier immediately followed by "(" as a function call', () => {
    const tokens = tokenizePython('berechne_alter(2001)');
    expect(tokens.find((t) => t.value === 'berechne_alter')?.type).toBe('function');
  });

  it('tokenizes a # comment to the end of the line', () => {
    const tokens = tokenizePython('x = 1 # ein Kommentar\ny = 2');
    expect(tokens.find((t) => t.type === 'comment')?.value).toBe('# ein Kommentar');
  });

  it('tokenizes single- and double-quoted strings, including escaped quotes', () => {
    const tokens = tokenizePython(`a = 'hi'\nb = "sag \\"hallo\\""`);
    const strings = tokens.filter((t) => t.type === 'string').map((t) => t.value);
    expect(strings).toEqual([`'hi'`, `"sag \\"hallo\\""`]);
  });

  it('tokenizes triple-quoted strings spanning multiple lines', () => {
    const tokens = tokenizePython('"""erste Zeile\nzweite Zeile"""');
    expect(tokens[0]).toEqual({ type: 'string', value: '"""erste Zeile\nzweite Zeile"""' });
  });

  it.each(['==', '!=', '<=', '>=', '//', '**', '->', '+=', '-=', '*=', '/=', '%=', ':='])(
    'tokenizes the two-character operator "%s" as a single operator token, not two',
    (op) => {
      const tokens = tokenizePython(`x ${op} y`);
      const operatorTokens = tokens.filter((t) => t.type === 'operator');
      expect(operatorTokens).toEqual([{ type: 'operator', value: op }]);
    },
  );
});

describe('highlightPython', () => {
  it('HTML-escapes token values (e.g. a string literal containing a stray "<")', () => {
    const html = highlightPython(`x = "<script>"`);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('computeEnterInsertion (Python auto-indent)', () => {
  it('adds one extra tab after a line ending in ":"', () => {
    const text = 'if punkte >= 50:';
    expect(computeEnterInsertion(text, text.length)).toBe('\n\t');
  });

  it('keeps the same indentation after a non-colon line', () => {
    const text = '\tkategorie = "bestanden"';
    expect(computeEnterInsertion(text, text.length)).toBe('\n\t');
  });

  it('does not add extra indentation for a top-level line not ending in ":"', () => {
    const text = 'x = 1';
    expect(computeEnterInsertion(text, text.length)).toBe('\n');
  });
});

describe('pythonLanguagePlugin', () => {
  it('has id "python" and wires all five LanguagePlugin methods', () => {
    expect(pythonLanguagePlugin.id).toBe('python');
    expect(typeof pythonLanguagePlugin.tokenize).toBe('function');
    expect(typeof pythonLanguagePlugin.highlight).toBe('function');
    expect(typeof pythonLanguagePlugin.computeEnterInsertion).toBe('function');
    expect(typeof pythonLanguagePlugin.applyAutoClose).toBe('function');
    expect(typeof pythonLanguagePlugin.maybeUppercaseLastWord).toBe('function');
  });

  it('maybeUppercaseLastWord is a no-op (Python keywords stay lowercase)', () => {
    expect(pythonLanguagePlugin.maybeUppercaseLastWord('if ', 3)).toBeNull();
  });

  it('applyAutoClose still closes brackets/quotes (reused from the SQL track)', () => {
    const result = pythonLanguagePlugin.applyAutoClose('(', { text: '', selectionStart: 0, selectionEnd: 0 });
    expect(result).toEqual({ text: '()', selectionStart: 1, selectionEnd: 1 });
  });
});

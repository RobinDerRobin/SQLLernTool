import { describe, expect, it } from 'vitest';
import { highlightCodeForTrack, highlightContentHtml } from './contentHighlight';

describe('highlightCodeForTrack', () => {
  it('wraps SQL keywords in tok-keyword spans', () => {
    const result = highlightCodeForTrack('SELECT * FROM t', 'sqlite');
    expect(result).toContain('<span class="tok-keyword">SELECT</span>');
    expect(result).toContain('<span class="tok-keyword">FROM</span>');
  });

  it('wraps Python keywords in tok-keyword spans', () => {
    const result = highlightCodeForTrack('for x in range(3):', 'python');
    expect(result).toContain('<span class="tok-keyword">for</span>');
  });

  it('HTML-escapes code so it can never break out of the surrounding markup', () => {
    const result = highlightCodeForTrack(`SELECT '<script>' FROM t`, 'sqlite');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('wraps C# keywords in tok-keyword spans', () => {
    const result = highlightCodeForTrack('if (x > 0) return;', 'csharp');
    expect(result).toContain('<span class="tok-keyword">if</span>');
  });

  it('falls back to plain HTML-escaping for a track without any highlighter at all', () => {
    const result = highlightCodeForTrack('<b>hi</b>', 'nonexistent');
    expect(result).toBe('&lt;b&gt;hi&lt;/b&gt;');
  });
});

describe('highlightContentHtml', () => {
  it('highlights code inside a <pre> block while leaving surrounding prose markup intact', () => {
    const html = `Erklärung <b>fett</b>: <pre>SELECT * FROM t;</pre> weiter Text.`;
    const result = highlightContentHtml(html, 'sqlite');
    expect(result).toContain('<b>fett</b>');
    expect(result).toContain('<span class="tok-keyword">SELECT</span>');
    expect(result).toContain('weiter Text.');
  });

  it('highlights a standalone inline <code> snippet', () => {
    const html = `Das Schlüsselwort <code>WHERE</code> filtert Zeilen.`;
    const result = highlightContentHtml(html, 'sqlite');
    expect(result).toContain('<span class="tok-keyword">WHERE</span>');
    expect(result).toContain('filtert Zeilen.');
  });

  it('preserves multiline whitespace/newlines inside <pre> for the tokenizer', () => {
    const html = `<pre>WITH RECURSIVE seq(n) AS (\n  SELECT 1\n)\nSELECT * FROM seq;</pre>`;
    const result = highlightContentHtml(html, 'sqlite');
    expect(result).toContain('\n');
    expect(result).toContain('<span class="tok-keyword">WITH</span>');
  });

  it('handles multiple independent <code> snippets in the same string', () => {
    const html = `<code>SELECT</code> und <code>WHERE</code> sind beide Keywords.`;
    const result = highlightContentHtml(html, 'sqlite');
    const matches = result.match(/tok-keyword/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('highlights a C# code sample embedded in tutorial/hint content', () => {
    const html = `Text <code>if (x > 0) return;</code> mehr Text.`;
    const result = highlightContentHtml(html, 'csharp');
    expect(result).toContain('<span class="tok-keyword">if</span>');
    expect(result).toContain('mehr Text.');
  });

  it('is a no-op for an unknown track id', () => {
    const html = `<code>x</code>`;
    expect(highlightContentHtml(html, 'nonexistent')).toBe(html);
  });

  it('escapes a bare comparison operator like < inside a <pre> block correctly', () => {
    // Some existing content has unescaped `<` in raw code text (relying on
    // lenient HTML parsing) — the tokenizer path must render it correctly
    // regardless, since a real `<` here is a comparison operator, not markup.
    const html = `<pre>SELECT n + 1 FROM seq WHERE n < 5</pre>`;
    const result = highlightContentHtml(html, 'sqlite');
    expect(result).toContain('&lt;');
    expect(result).not.toMatch(/WHERE n <(?!\/)/);
  });
});

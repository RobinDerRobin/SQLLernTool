import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('wraps output in a .md container', () => {
    expect(renderMarkdown('hi')).toContain('<div class="md">');
  });

  it('renders inline code', () => {
    expect(renderMarkdown('use `SELECT`')).toContain('<code>SELECT</code>');
  });

  it('renders fenced code blocks', () => {
    expect(renderMarkdown('```\nSELECT 1;\n```')).toContain('<pre class="md-code">');
  });

  it('renders bold and italic', () => {
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
    expect(renderMarkdown('*ital*')).toContain('<em>ital</em>');
  });

  it('renders headings', () => {
    expect(renderMarkdown('## Titel')).toContain('<h3>Titel</h3>');
    expect(renderMarkdown('### Unter')).toContain('<h4>Unter</h4>');
  });

  it('renders unordered and ordered lists', () => {
    expect(renderMarkdown('- eins\n- zwei')).toContain('<ul><li>eins</li><li>zwei</li></ul>');
    expect(renderMarkdown('1. eins\n2. zwei')).toContain('<ol><li>eins</li><li>zwei</li></ol>');
  });

  it('escapes HTML in the source so a model reply cannot inject markup', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('escapes HTML inside code blocks too', () => {
    const html = renderMarkdown('`<script>`');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('turns blank-line-separated blocks into paragraphs', () => {
    const html = renderMarkdown('erste\n\nzweite');
    expect(html).toContain('<p>erste</p>');
    expect(html).toContain('<p>zweite</p>');
  });

  it('turns single newlines inside a paragraph into <br>', () => {
    expect(renderMarkdown('a\nb')).toContain('a<br>b');
  });
});

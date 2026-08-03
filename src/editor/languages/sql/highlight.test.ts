import { describe, expect, it } from 'vitest';
import { highlightSql } from './highlight';

describe('highlightSql', () => {
  it('wraps a keyword in a span with the matching token class', () => {
    expect(highlightSql('SELECT')).toBe('<span class="tok-keyword">SELECT</span>');
  });

  it('wraps each token category with its own class', () => {
    expect(highlightSql('COUNT')).toBe('<span class="tok-function">COUNT</span>');
    expect(highlightSql('INTEGER')).toBe('<span class="tok-type">INTEGER</span>');
    expect(highlightSql('AND')).toBe('<span class="tok-keywordAlt">AND</span>');
    expect(highlightSql('users')).toBe('<span class="tok-ident">users</span>');
    expect(highlightSql('42')).toBe('<span class="tok-number">42</span>');
    expect(highlightSql('=')).toBe('<span class="tok-operator">=</span>');
    expect(highlightSql('-- hi')).toBe('<span class="tok-comment">-- hi</span>');
  });

  it('leaves whitespace and punctuation unwrapped', () => {
    expect(highlightSql('(')).toBe('(');
    expect(highlightSql(', ')).toBe(', ');
  });

  it('HTML-escapes token content so it cannot break out of the overlay markup', () => {
    expect(highlightSql("'<script>alert(1)</script>'")).toBe(
      '<span class="tok-string">&#39;&lt;script&gt;alert(1)&lt;/script&gt;&#39;</span>',
    );
  });

  it('HTML-escapes an identifier containing an ampersand', () => {
    expect(highlightSql('a&b')).toBe('<span class="tok-ident">a</span>&amp;<span class="tok-ident">b</span>');
  });

  it('renders a realistic statement as the concatenation of its token spans', () => {
    const html = highlightSql('SELECT 1;');
    expect(html).toBe(
      '<span class="tok-keyword">SELECT</span> <span class="tok-number">1</span>;',
    );
  });
});

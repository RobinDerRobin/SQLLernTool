import { describe, expect, it } from 'vitest';
import { renderResultGlyph, renderResultsTable, renderStars } from './format';

describe('renderStars', () => {
  it('renders 3 filled stars for 3', () => {
    expect(renderStars(3)).toBe('★★★');
  });

  it('renders a mix of filled and empty stars', () => {
    expect(renderStars(1)).toBe('★☆☆');
  });

  it('renders 0 filled stars for 0', () => {
    expect(renderStars(0)).toBe('☆☆☆');
  });

  it('clamps values outside 0-3', () => {
    expect(renderStars(5)).toBe('★★★');
    expect(renderStars(-1)).toBe('☆☆☆');
  });
});

describe('renderResultGlyph', () => {
  it('renders a checkmark for "ok"', () => {
    expect(renderResultGlyph('ok')).toBe('<span class="run-result ok">✓</span>');
  });

  it('renders a cross for "err"', () => {
    expect(renderResultGlyph('err')).toBe('<span class="run-result fail">✗</span>');
  });

  it('renders an empty glyph for undefined (never played)', () => {
    expect(renderResultGlyph(undefined)).toBe('<span class="run-result"></span>');
  });
});

describe('renderResultsTable', () => {
  it('renders an empty-state message for null (no result set)', () => {
    expect(renderResultsTable(null)).toBe('<div class="empty-state">Query erfolgreich, aber 0 Zeilen zurückgegeben.</div>');
  });

  it('renders an empty-state message for a result set with 0 rows', () => {
    expect(renderResultsTable({ columns: ['id'], values: [] })).toBe(
      '<div class="empty-state">Query erfolgreich, aber 0 Zeilen zurückgegeben.</div>',
    );
  });

  it('renders a table with escaped headers and cell values', () => {
    const html = renderResultsTable({ columns: ['a&b'], values: [['<x>']] });
    expect(html).toContain('<th>a&amp;b</th>');
    expect(html).toContain('<td>&lt;x&gt;</td>');
  });

  it('renders NULL for a null cell value', () => {
    const html = renderResultsTable({ columns: ['x'], values: [[null]] });
    expect(html).toContain('<td>NULL</td>');
  });

  it('caps rows at the given limit and notes how many were hidden', () => {
    const values = Array.from({ length: 5 }, (_, i) => [i]);
    const html = renderResultsTable({ columns: ['n'], values }, 3);
    const bodyHtml = html.split('<tbody>')[1] ?? '';
    expect((bodyHtml.match(/<tr>/g) ?? []).length).toBe(3);
    expect(html).toContain('2 weitere Zeilen nicht angezeigt');
  });

  it('does not show an overflow note when everything fits', () => {
    const html = renderResultsTable({ columns: ['n'], values: [[1], [2]] }, 200);
    expect(html).not.toContain('weitere Zeilen');
  });
});

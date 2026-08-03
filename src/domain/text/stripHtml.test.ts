import { describe, expect, it } from 'vitest';
import { stripHtml } from './stripHtml';

describe('stripHtml', () => {
  it('removes simple tags', () => {
    expect(stripHtml('<b>hello</b>')).toBe('hello');
  });

  it('removes multiple and nested tags', () => {
    expect(stripHtml('<div><p>a <b>b</b> c</p></div>')).toBe('a b c');
  });

  it('leaves plain text untouched', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });

  it('removes tags with attributes', () => {
    expect(stripHtml('<a href="https://example.com">link</a>')).toBe('link');
  });
});

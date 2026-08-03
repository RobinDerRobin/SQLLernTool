import { describe, expect, it } from 'vitest';
import { applyThemeAttribute, DEFAULT_THEME_ID, THEMES } from './themes';

describe('THEMES', () => {
  it('has unique ids', () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the default theme', () => {
    expect(THEMES.some((t) => t.id === DEFAULT_THEME_ID)).toBe(true);
  });

  it('gives every theme a name and exactly four swatch colors', () => {
    for (const theme of THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.swatch).toHaveLength(4);
      for (const color of theme.swatch) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe('applyThemeAttribute', () => {
  it('removes the attribute for the default theme (it lives in :root)', () => {
    const el = document.createElement('div');
    el.setAttribute('data-theme', 'mono-ink');
    applyThemeAttribute(el, DEFAULT_THEME_ID);
    expect(el.hasAttribute('data-theme')).toBe(false);
  });

  it('sets the attribute for any non-default theme', () => {
    const el = document.createElement('div');
    applyThemeAttribute(el, 'ocean-depth');
    expect(el.getAttribute('data-theme')).toBe('ocean-depth');
  });
});

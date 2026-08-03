// @vitest-environment node
// (This suite only reads the stylesheet as text — jsdom would give a
// non-file import.meta.url and break the path resolution below.)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, THEMES } from './themes';

const css = readFileSync(fileURLToPath(new URL('./themes.css', import.meta.url)), 'utf8');

/**
 * The one automated check worth having for the themes: that the data and the
 * stylesheet cannot drift apart. Whether a palette actually *looks* good is a
 * manual review, not a test.
 */
describe('themes.css', () => {
  it('defines a palette block for every non-default theme id', () => {
    const missing = THEMES.filter((t) => t.id !== DEFAULT_THEME_ID).filter(
      (t) => !css.includes(`.sql-app[data-theme='${t.id}']`),
    );
    expect(missing.map((t) => t.id)).toEqual([]);
  });

  it('defines the default palette in :root, not behind a data-theme attribute', () => {
    expect(css).toContain(':root {');
    expect(css).not.toContain(`[data-theme='${DEFAULT_THEME_ID}']`);
  });

  it('has no data-theme block that is missing from the THEMES list', () => {
    const declared = [...css.matchAll(/\.sql-app\[data-theme='([^']+)'\]/g)].map((m) => m[1]!);
    const known = new Set(THEMES.map((t) => t.id));
    expect([...new Set(declared)].filter((id) => !known.has(id))).toEqual([]);
  });

  it('gives every theme block the same custom properties as :root', () => {
    const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
    const rootVars = new Set([...rootBlock.matchAll(/(--[\w-]+):/g)].map((m) => m[1]!));
    // --mono/--sans are font stacks shared by every theme, defined once in :root.
    rootVars.delete('--mono');
    rootVars.delete('--sans');

    for (const theme of THEMES.filter((t) => t.id !== DEFAULT_THEME_ID)) {
      const start = css.indexOf(`.sql-app[data-theme='${theme.id}']`);
      const block = css.slice(start, css.indexOf('}', start));
      const blockVars = new Set([...block.matchAll(/(--[\w-]+):/g)].map((m) => m[1]!));
      const missing = [...rootVars].filter((v) => !blockVars.has(v));
      expect(missing, `theme "${theme.id}" is missing ${missing.join(', ')}`).toEqual([]);
    }
  });

  it('styles every syntax-highlight token class the tokenizer can emit', () => {
    for (const tokenType of ['keyword', 'keywordAlt', 'type', 'function', 'string', 'ident', 'number', 'operator', 'comment']) {
      expect(css, `missing .tok-${tokenType}`).toContain(`.tok-${tokenType}`);
    }
  });
});

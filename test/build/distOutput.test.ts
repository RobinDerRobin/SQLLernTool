// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEMES } from '../../src/theme/themes';

const distDir = join(process.cwd(), 'dist');
const distIndex = join(distDir, 'index.html');
const built = existsSync(distIndex);

/**
 * Post-build gate for the one artifact that actually ships: a single
 * self-contained index.html that gets pasted into a claude.ai conversation.
 * Automates the manual checklist from challenge-anforderungen.md section 10
 * ("JS-Syntaxprüfung", "Prüfung auf doppelte HTML-IDs", browser test).
 *
 * Skipped when dist/ has not been built — `npm run build:check` builds first.
 */
describe.skipIf(!built)('dist/index.html', () => {
  const html = built ? readFileSync(distIndex, 'utf8') : '';

  it('is the only file emitted (nothing to host alongside it)', () => {
    const files = readdirSync(distDir).filter((f) => statSync(join(distDir, f)).isFile());
    expect(files).toEqual(['index.html']);
  });

  it('inlines the application script rather than referencing a separate bundle', () => {
    expect(html).not.toMatch(/<script[^>]+src="\.?\/assets\//);
    expect(html).toMatch(/<script[^>]*>[\s\S]*createElement[\s\S]*<\/script>/);
  });

  it('inlines the stylesheet rather than linking a separate css file', () => {
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="\.?\/assets\//);
    expect(html).toContain('--accent');
  });

  it('keeps the sql.js CDN script tag (the WASM engine is deliberately not inlined)', () => {
    expect(html).toContain('sql-wasm.js');
  });

  it('has a mount point for the app', () => {
    expect(html).toContain('id="app"');
  });

  it('has no duplicate element ids', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
    const seen = new Set<string>();
    const duplicates = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect([...new Set(duplicates)]).toEqual([]);
  });

  it('ships every theme palette', () => {
    for (const theme of THEMES) {
      expect(html, `theme "${theme.id}" missing from the bundle`).toContain(theme.name);
    }
  });

  it('ships the challenge content', () => {
    expect(html).toContain('Basis-INSERT');
    expect(html).toContain('Testdaten, die Constraints einhalten');
  });

  it('stays small enough to paste into a chat message', () => {
    const kb = Buffer.byteLength(html, 'utf8') / 1024;
    expect(kb).toBeLessThan(1024);
  });
});

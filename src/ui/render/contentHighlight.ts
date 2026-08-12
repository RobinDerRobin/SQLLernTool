import { escapeHtml } from '../../domain/text/escapeHtml';
import { highlightCSharp } from '../../editor/languages/csharp/highlight';
import { highlightPython } from '../../editor/languages/python/highlight';
import { highlightSql } from '../../editor/languages/sql/highlight';

type Highlighter = (code: string) => string;

/**
 * One highlighter per track that has an editor tokenizer. A track without an
 * entry here falls back to plain HTML-escaping everywhere below, so this
 * stays a no-op extension point for any future track rather than something
 * that needs updating in lockstep with every new tokenizer.
 */
const HIGHLIGHTERS: Record<string, Highlighter> = {
  sqlite: highlightSql,
  python: highlightPython,
  csharp: highlightCSharp,
};

/**
 * Renders a plain code string (e.g. a challenge's `solution` field) as HTML
 * for a given track, reusing the exact tokenizer the editor itself uses so
 * a shown solution looks like it does in the editor. Falls back to plain
 * HTML-escaping for tracks without a highlighter.
 */
export function highlightCodeForTrack(code: string, trackId: string): string {
  const highlight = HIGHLIGHTERS[trackId];
  return highlight ? highlight(code) : escapeHtml(code);
}

/**
 * Post-processes authored content HTML (tutorial text, hints, syntax
 * explanations — see challenge.types.ts) that mixes prose markup (`<b>`,
 * `<ul>`, ...) with `<pre>`/`<code>` code samples: re-renders the text
 * content of every such element through the track's tokenizer, so code
 * examples embedded in prose get the same syntax highlighting as the editor
 * instead of the previous flat single-color styling.
 *
 * `<pre>` elements are processed as a whole (their full text content,
 * preserving whitespace/newlines the tokenizer needs to see, e.g. indentation
 * inside a `WITH RECURSIVE` block). Standalone `<code>` elements are
 * processed too, but ones nested inside an already-processed `<pre>` are
 * skipped — content never actually nests `<pre><code>`, but this stays safe
 * if it ever does, rather than re-tokenizing already-tokenized markup.
 *
 * Falls back to returning `html` unchanged for tracks without a highlighter.
 */
export function highlightContentHtml(html: string, trackId: string): string {
  const highlight = HIGHLIGHTERS[trackId];
  if (!highlight) return html;

  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll('pre').forEach((el) => {
    el.innerHTML = highlight(el.textContent ?? '');
  });
  container.querySelectorAll('code').forEach((el) => {
    if (el.closest('pre')) return;
    el.innerHTML = highlight(el.textContent ?? '');
  });

  return container.innerHTML;
}

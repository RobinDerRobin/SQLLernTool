import { escapeHtml } from '../../../domain/text/escapeHtml';
import { tokenizeSql, type SqlTokenType } from './tokenizer';

const UNWRAPPED_TYPES: ReadonlySet<SqlTokenType> = new Set(['whitespace', 'punctuation']);

/**
 * Renders SQL as HTML for the editor's highlight overlay. Every token value
 * is HTML-escaped — the overlay is rendered via innerHTML, so unescaped user
 * SQL (e.g. a string literal containing `<script>`) would otherwise break out
 * of the markup.
 */
export function highlightSql(code: string): string {
  return tokenizeSql(code)
    .map((token) => {
      const escaped = escapeHtml(token.value);
      if (UNWRAPPED_TYPES.has(token.type)) return escaped;
      return `<span class="tok-${token.type}">${escaped}</span>`;
    })
    .join('');
}

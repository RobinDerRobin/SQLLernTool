import { escapeHtml } from '../../../domain/text/escapeHtml';
import { tokenizeCSharp, type CSharpTokenType } from './tokenizer';

const UNWRAPPED_TYPES: ReadonlySet<CSharpTokenType> = new Set(['whitespace', 'punctuation']);

/** Renders C# as HTML for the editor's highlight overlay — see sql/highlight.ts for why every value is escaped. */
export function highlightCSharp(code: string): string {
  return tokenizeCSharp(code)
    .map((token) => {
      const escaped = escapeHtml(token.value);
      if (UNWRAPPED_TYPES.has(token.type)) return escaped;
      return `<span class="tok-${token.type}">${escaped}</span>`;
    })
    .join('');
}

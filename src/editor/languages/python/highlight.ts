import { escapeHtml } from '../../../domain/text/escapeHtml';
import { tokenizePython, type PythonTokenType } from './tokenizer';

const UNWRAPPED_TYPES: ReadonlySet<PythonTokenType> = new Set(['whitespace', 'punctuation']);

/** Renders Python as HTML for the editor's highlight overlay — see sql/highlight.ts for why every value is escaped. */
export function highlightPython(code: string): string {
  return tokenizePython(code)
    .map((token) => {
      const escaped = escapeHtml(token.value);
      if (UNWRAPPED_TYPES.has(token.type)) return escaped;
      return `<span class="tok-${token.type}">${escaped}</span>`;
    })
    .join('');
}

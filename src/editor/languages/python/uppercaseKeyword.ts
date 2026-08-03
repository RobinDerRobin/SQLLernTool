import type { UppercaseResult } from '../LanguagePlugin';

/** Python keywords are conventionally lowercase — there is no SQL-style auto-uppercase behavior to port. */
export function maybeUppercaseLastWord(_text: string, _cursorPos: number): UppercaseResult | null {
  return null;
}

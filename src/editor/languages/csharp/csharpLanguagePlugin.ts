import type { LanguagePlugin } from '../LanguagePlugin';
import { applyAutoClose } from './autoClosePairs';
import { computeEnterInsertion } from './autoIndent';
import { highlightCSharp } from './highlight';
import { tokenizeCSharp } from './tokenizer';
import { maybeUppercaseLastWord } from './uppercaseKeyword';

/**
 * Not yet wired into domEditor.ts/editorTab.ts — the C# track itself isn't
 * registered in src/content/registry.ts's TRACKS yet either (see
 * docs/csharp-engine-poc.md step 5's "four wiring gaps"). This plugin is
 * one of those four gaps, built and unit-tested standalone so it's ready
 * the moment the others (engine wiring, registry, Blazor asset serving)
 * are closed.
 */
export const csharpLanguagePlugin: LanguagePlugin = {
  id: 'csharp',
  tokenize: tokenizeCSharp,
  highlight: highlightCSharp,
  computeEnterInsertion,
  applyAutoClose,
  maybeUppercaseLastWord,
};

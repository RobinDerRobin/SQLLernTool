import type { LanguagePlugin } from '../LanguagePlugin';
import { applyAutoClose } from './autoClosePairs';
import { computeEnterInsertion } from './autoIndent';
import { highlightPython } from './highlight';
import { tokenizePython } from './tokenizer';
import { maybeUppercaseLastWord } from './uppercaseKeyword';

export const pythonLanguagePlugin: LanguagePlugin = {
  id: 'python',
  tokenize: tokenizePython,
  highlight: highlightPython,
  computeEnterInsertion,
  applyAutoClose,
  maybeUppercaseLastWord,
};

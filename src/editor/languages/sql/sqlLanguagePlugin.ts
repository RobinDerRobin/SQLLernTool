import type { LanguagePlugin } from '../LanguagePlugin';
import { applyAutoClose } from './autoClosePairs';
import { computeEnterInsertion } from './autoIndent';
import { highlightSql } from './highlight';
import { tokenizeSql } from './tokenizer';
import { maybeUppercaseLastWord } from './uppercaseKeyword';

export const sqlLanguagePlugin: LanguagePlugin = {
  id: 'sql',
  tokenize: tokenizeSql,
  highlight: highlightSql,
  computeEnterInsertion,
  applyAutoClose,
  maybeUppercaseLastWord,
};

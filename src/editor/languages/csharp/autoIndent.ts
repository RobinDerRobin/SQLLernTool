/**
 * C#'s indentation is brace-delimited, not syntactically significant like
 * Python's — but this editor only auto-indents on Enter (there is no
 * keystroke-triggered dedent-on-`}` hook in LanguagePlugin), so the rule
 * mirrors Python's colon rule with `{` instead: Enter always copies the
 * current line's leading indentation, plus one extra tab if that line
 * (trimmed of trailing whitespace) ends with `{` — the start of a block.
 */
export function computeEnterInsertion(text: string, cursorPos: number): string {
  const beforeCursor = text.slice(0, cursorPos);
  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const currentLine = beforeCursor.slice(lineStart);

  const indentMatch = currentLine.match(/^[ \t]*/);
  let indent = indentMatch ? indentMatch[0] : '';
  if (currentLine.trimEnd().endsWith('{')) {
    indent += '\t';
  }
  return '\n' + indent;
}

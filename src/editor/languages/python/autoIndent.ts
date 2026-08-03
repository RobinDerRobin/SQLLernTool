/**
 * Python's indentation is syntactically significant, unlike SQL's (where the
 * equivalent rule is "reset after `;`"). Enter always copies the current
 * line's leading indentation, and adds one extra tab if that line (trimmed
 * of trailing whitespace) ends with `:` — the start of an `if`/`for`/`def`/…
 * block, which Python requires to be indented.
 */
export function computeEnterInsertion(text: string, cursorPos: number): string {
  const beforeCursor = text.slice(0, cursorPos);
  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const currentLine = beforeCursor.slice(lineStart);

  const indentMatch = currentLine.match(/^[ \t]*/);
  let indent = indentMatch ? indentMatch[0] : '';
  if (currentLine.trimEnd().endsWith(':')) {
    indent += '\t';
  }
  return '\n' + indent;
}

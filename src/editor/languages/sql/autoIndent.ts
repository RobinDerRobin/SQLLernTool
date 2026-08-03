/**
 * What to insert when Enter is pressed: copies the current line's leading
 * indentation (the part of the line up to the cursor), unless that line
 * (trimmed of trailing whitespace) ends with `;` — a finished statement
 * resets indentation for the next line. Otherwise, if the character right
 * before the cursor is `(`, one extra tab is added — starting an indented
 * block for whatever comes next inside the parens.
 */
export function computeEnterInsertion(text: string, cursorPos: number): string {
  const beforeCursor = text.slice(0, cursorPos);
  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const currentLine = beforeCursor.slice(lineStart);

  if (currentLine.trimEnd().endsWith(';')) {
    return '\n';
  }

  const indentMatch = currentLine.match(/^[ \t]*/);
  let indent = indentMatch ? indentMatch[0] : '';
  if (text[cursorPos - 1] === '(') {
    indent += '\t';
  }
  return '\n' + indent;
}

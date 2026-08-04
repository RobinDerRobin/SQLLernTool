interface TextSelectionState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

type TextOpResult = TextSelectionState;

/**
 * Language-agnostic Tab/Shift+Tab handling — not part of any SQL-specific
 * plugin, so every future language plugin gets identical behavior for free.
 */

/** Tab (no shift): inserts a single tab character at the cursor, replacing any active selection. */
export function insertTab(state: TextSelectionState): TextOpResult {
  const { text, selectionStart, selectionEnd } = state;
  const newText = text.slice(0, selectionStart) + '\t' + text.slice(selectionEnd);
  const pos = selectionStart + 1;
  return { text: newText, selectionStart: pos, selectionEnd: pos };
}

/**
 * Shift+Tab: removes a single leading tab from the line containing the
 * cursor, if present (spaces are left untouched — matches the original
 * behavior, which only recognizes a literal tab character as indentation
 * here). No-op otherwise. Always collapses to a single cursor position.
 */
export function dedentLine(state: TextSelectionState): TextOpResult {
  const { text, selectionStart } = state;
  const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
  if (text.slice(lineStart, lineStart + 1) !== '\t') {
    return state;
  }
  const newText = text.slice(0, lineStart) + text.slice(lineStart + 1);
  const pos = Math.max(lineStart, selectionStart - 1);
  return { text: newText, selectionStart: pos, selectionEnd: pos };
}

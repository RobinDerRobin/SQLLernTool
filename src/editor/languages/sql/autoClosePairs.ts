interface EditorSelectionState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

type AutoCloseOutcome = EditorSelectionState;

const OPEN_TO_CLOSE: Record<string, string> = { '(': ')', '[': ']', "'": "'", '"': '"' };
const CLOSE_CHARS = new Set(Object.values(OPEN_TO_CLOSE));

/**
 * Pure port of the prototype's bracket/quote auto-closing (`PAIRS`). Returns
 * null when the typed character needs no special handling — the caller
 * should then fall back to inserting it normally.
 */
export function applyAutoClose(typedChar: string, state: EditorSelectionState): AutoCloseOutcome | null {
  const { text, selectionStart, selectionEnd } = state;
  const hasSelection = selectionStart !== selectionEnd;
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);
  const closeChar = OPEN_TO_CLOSE[typedChar];

  if (hasSelection && closeChar) {
    const insertion = `${typedChar}${selected}${closeChar}`;
    const newText = text.slice(0, selectionStart) + insertion + after;
    return {
      text: newText,
      selectionStart: selectionStart + 1,
      selectionEnd: selectionStart + 1 + selected.length,
    };
  }

  if (!hasSelection && CLOSE_CHARS.has(typedChar) && after.startsWith(typedChar)) {
    return { text, selectionStart: selectionStart + 1, selectionEnd: selectionStart + 1 };
  }

  if (!hasSelection && closeChar) {
    const newText = text.slice(0, selectionStart) + typedChar + closeChar + after;
    return { text: newText, selectionStart: selectionStart + 1, selectionEnd: selectionStart + 1 };
  }

  return null;
}

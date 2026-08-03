export interface EditorToken {
  type: string;
  value: string;
}

export interface EditorSelectionState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface UppercaseResult {
  text: string;
  cursorPos: number;
}

/**
 * Everything domEditor.ts needs to drive a code editor for one language,
 * without knowing anything about that language itself. The SQL plugin
 * (./sql/sqlLanguagePlugin.ts) is the only implementation today; a future
 * Python/C# plugin would implement the same shape.
 */
export interface LanguagePlugin {
  id: string;
  tokenize(code: string): EditorToken[];
  highlight(code: string): string;
  computeEnterInsertion(text: string, cursorPos: number): string;
  applyAutoClose(typedChar: string, state: EditorSelectionState): EditorSelectionState | null;
  maybeUppercaseLastWord(text: string, cursorPos: number): UppercaseResult | null;
}

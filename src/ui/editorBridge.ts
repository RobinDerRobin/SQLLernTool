/**
 * The narrow slice of the code editor that non-editor views need (insert the
 * model solution, read the current draft to diff against it). `DomEditor`
 * satisfies this structurally, so `app.ts` can pass the real editor straight
 * in while tests pass a two-line fake.
 */
export interface EditorBridge {
  getValue(): string;
  setValue(value: string): void;
}

/**
 * Generic timing utility shared by lower layers (e.g. `editor/domEditor.ts`)
 * and the UI layer — lives outside both so neither creates a wrong-direction
 * dependency on the other.
 */
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

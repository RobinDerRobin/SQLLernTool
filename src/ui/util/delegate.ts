import type { Unsubscribe } from '../state/store';

/**
 * Binds one listener on a stable `root` at mount time and dispatches to
 * `handler` only when the event's target (or an ancestor of it, up to and
 * including `root`) matches `selector`. Replaces the prototype's pattern of
 * re-querying and re-attaching a listener per element after every
 * `innerHTML` re-render — nothing here ever needs re-binding, because the
 * listener lives above whatever subtree gets regenerated.
 */
export function on<K extends keyof HTMLElementEventMap>(
  root: HTMLElement,
  eventType: K,
  selector: string,
  handler: (event: HTMLElementEventMap[K], target: HTMLElement) => void,
): Unsubscribe {
  function listener(event: Event): void {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) return;
    const matched = eventTarget.closest(selector);
    if (matched && root.contains(matched)) {
      handler(event as HTMLElementEventMap[K], matched as HTMLElement);
    }
  }

  root.addEventListener(eventType, listener);
  return () => root.removeEventListener(eventType, listener);
}

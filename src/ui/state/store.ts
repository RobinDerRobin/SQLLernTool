type Listener<T> = (next: T, prev: T) => void;
export type Unsubscribe = () => void;

export interface Store<T> {
  getState(): T;
  subscribe(fn: Listener<T>): Unsubscribe;
  update(fn: (state: T) => T): void;
}

/**
 * Plain pub-sub state container — no reducer/action-type machinery, no
 * selector-subscription framework. `update()` only notifies on reference
 * inequality, which is cheap and correct here because every state-producing
 * function in this codebase (progressModel.ts's `with*` functions, and this
 * layer's own updaters) already returns new objects via structural sharing
 * rather than mutating in place.
 */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();

  function getState(): T {
    return state;
  }

  function subscribe(fn: Listener<T>): Unsubscribe {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  function update(fn: (s: T) => T): void {
    const prev = state;
    const next = fn(prev);
    if (next === prev) return;
    state = next;
    for (const listener of listeners) {
      listener(next, prev);
    }
  }

  return { getState, subscribe, update };
}

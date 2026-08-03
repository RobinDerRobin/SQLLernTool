import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store';

describe('createStore', () => {
  it('getState() returns the initial state', () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('update() replaces the state with the function\'s return value', () => {
    const store = createStore({ count: 0 });
    store.update((s) => ({ count: s.count + 1 }));
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('notifies subscribers with (next, prev) when update() produces a new reference', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((s) => ({ count: s.count + 1 }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it('does not notify subscribers when update() returns the exact same reference', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((s) => s);

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies every subscriber', () => {
    const store = createStore({ count: 0 });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    store.update((s) => ({ count: s.count + 1 }));

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('subscribe() returns an unsubscribe function that stops further notifications', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.update((s) => ({ count: s.count + 1 }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribing one listener does not affect others', () => {
    const store = createStore({ count: 0 });
    const a = vi.fn();
    const b = vi.fn();
    const unsubscribeA = store.subscribe(a);
    store.subscribe(b);

    unsubscribeA();
    store.update((s) => ({ count: s.count + 1 }));

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});

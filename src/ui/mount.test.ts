import { describe, expect, it, vi } from 'vitest';
import { createStore } from './state/store';
import { mountView } from './mount';

interface State {
  count: number;
  other: string;
}

describe('mountView', () => {
  it('renders the sliced state into root.innerHTML on mount', () => {
    const store = createStore<State>({ count: 1, other: 'x' });
    const root = document.createElement('div');

    mountView(root, store, (s) => s.count, { render: (n) => `<span>${n}</span>` }, undefined);

    expect(root.innerHTML).toBe('<span>1</span>');
  });

  it('calls bind() exactly once at mount time, with (root, ctx)', () => {
    const store = createStore<State>({ count: 1, other: 'x' });
    const root = document.createElement('div');
    const bind = vi.fn();
    const ctx = { some: 'context' };

    mountView(root, store, (s) => s.count, { render: () => '', bind }, ctx);
    store.update((s) => ({ ...s, count: s.count + 1 }));
    store.update((s) => ({ ...s, count: s.count + 1 }));

    expect(bind).toHaveBeenCalledTimes(1);
    expect(bind).toHaveBeenCalledWith(root, ctx);
  });

  it('re-renders when the sliced value changes by reference (default shouldUpdate)', () => {
    const store = createStore<State>({ count: 1, other: 'x' });
    const root = document.createElement('div');
    const render = vi.fn((n: number) => `<span>${n}</span>`);

    mountView(root, store, (s) => s.count, { render }, undefined);
    store.update((s) => ({ ...s, count: 2 }));

    expect(root.innerHTML).toBe('<span>2</span>');
    expect(render).toHaveBeenCalledTimes(2); // initial + one update
  });

  it('does not re-render when the sliced value is unchanged', () => {
    const store = createStore<State>({ count: 1, other: 'x' });
    const root = document.createElement('div');
    const render = vi.fn((n: number) => `<span>${n}</span>`);

    mountView(root, store, (s) => s.count, { render }, undefined);
    store.update((s) => ({ ...s, other: 'y' })); // count slice unchanged

    expect(render).toHaveBeenCalledTimes(1);
  });

  it('honors a custom shouldUpdate function', () => {
    const store = createStore<State>({ count: 1, other: 'x' });
    const root = document.createElement('div');
    const render = vi.fn(() => 'rendered');

    mountView(
      root,
      store,
      (s) => s.count,
      { render, shouldUpdate: () => false },
      undefined,
    );
    store.update((s) => ({ ...s, count: 2 }));

    expect(render).toHaveBeenCalledTimes(1); // only the initial render
  });

  it('calls afterRender after each actual render, but not when a render is skipped', () => {
    const store = createStore<State>({ count: 1, other: 'x' });
    const root = document.createElement('div');
    const afterRender = vi.fn();

    mountView(root, store, (s) => s.count, { render: (n) => `${n}`, afterRender }, undefined);
    store.update((s) => ({ ...s, other: 'y' })); // no-op update, count slice unchanged
    store.update((s) => ({ ...s, count: 2 })); // real update

    expect(afterRender).toHaveBeenCalledTimes(2); // initial render + the one real update
  });

  it('the returned unsubscribe function stops further re-renders', () => {
    const store = createStore<State>({ count: 1, other: 'x' });
    const root = document.createElement('div');

    const unmount = mountView(root, store, (s) => s.count, { render: (n) => `<span>${n}</span>` }, undefined);
    unmount();
    store.update((s) => ({ ...s, count: 99 }));

    expect(root.innerHTML).toBe('<span>1</span>');
  });
});

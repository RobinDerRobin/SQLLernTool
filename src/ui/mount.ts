import type { Store, Unsubscribe } from './state/store';

interface ViewDef<TSlice, TCtx> {
  render(state: TSlice): string;
  /** Called exactly once, at mount time — binds delegated event listeners. */
  bind?(root: HTMLElement, ctx: TCtx): void;
  /** Default: reference inequality against the last actually-rendered slice. */
  shouldUpdate?(prevRendered: TSlice, next: TSlice): boolean;
  /** Called after every actual render (not when a render is skipped) — e.g. scroll-to-bottom, focus. */
  afterRender?(root: HTMLElement, state: TSlice): void;
}

/**
 * The shared subscribe→diff→render→bind-once glue every view module would
 * otherwise duplicate. Deliberately minimal: no nested child-view support,
 * no keyed-list diffing — `innerHTML` replacement plus event delegation
 * (see `util/delegate.ts`) is enough at this app's scale. Generic over the
 * store's state type and the context type so it has no dependency on
 * `AppState`/`AppContext`.
 */
export function mountView<TState, TSlice, TCtx>(
  root: HTMLElement,
  store: Store<TState>,
  slice: (state: TState) => TSlice,
  view: ViewDef<TSlice, TCtx>,
  ctx: TCtx,
): Unsubscribe {
  let lastRendered: TSlice;

  function renderNow(nextSlice: TSlice): void {
    root.innerHTML = view.render(nextSlice);
    lastRendered = nextSlice;
    view.afterRender?.(root, nextSlice);
  }

  view.bind?.(root, ctx);
  renderNow(slice(store.getState()));

  return store.subscribe((next) => {
    const nextSlice = slice(next);
    const shouldUpdate = view.shouldUpdate ? view.shouldUpdate(lastRendered, nextSlice) : lastRendered !== nextSlice;
    if (shouldUpdate) {
      renderNow(nextSlice);
    }
  });
}

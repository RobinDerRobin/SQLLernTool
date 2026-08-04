import { escapeHtml } from '../../../domain/text/escapeHtml';
import { THEMES } from '../../../theme/themes';
import type { AppContext } from '../../context';
import { mountView } from '../../mount';
import { setTheme, toggleThemePicker } from '../../state/actions';
import type { AppState } from '../../state/appState';
import type { Unsubscribe } from '../../state/store';
import { on } from '../../util/delegate';

interface ThemePickerSlice {
  open: boolean;
  activeTheme: string;
}

function sliceThemePicker(state: AppState): ThemePickerSlice {
  return { open: state.session.themePickerOpen, activeTheme: state.progress.app.theme };
}

function renderOption(id: string, name: string, swatch: readonly string[], active: boolean): string {
  const cells = swatch.map((color) => `<div style="background:${escapeHtml(color)}"></div>`).join('');
  return `
    <button type="button" class="theme-option ${active ? 'selected' : ''}" data-theme-id="${escapeHtml(id)}" aria-pressed="${active}">
      <div class="theme-swatch">${cells}</div>
      <span class="theme-option-name">${escapeHtml(name)}</span>
    </button>`;
}

function renderThemePicker(slice: ThemePickerSlice): string {
  const options = THEMES.map((t) => renderOption(t.id, t.name, t.swatch, t.id === slice.activeTheme)).join('');
  return `
    <div class="theme-picker-overlay ${slice.open ? 'open' : ''}">
      <div class="theme-picker">
        <div class="theme-picker-title">
          <span>Design wählen</span>
          <button type="button" class="theme-picker-close" title="Schließen" aria-label="Design-Auswahl schließen">✕</button>
        </div>
        <div class="theme-grid">${options}</div>
      </div>
    </div>`;
}

/**
 * Modal theme picker. Owns its own overlay markup (it sits outside the
 * sidebar's normal flow); the open/closed flag lives in session state only
 * because the button that opens it lives in a different module.
 */
export function mountThemePicker(root: HTMLElement, ctx: AppContext): Unsubscribe {
  const unsubscribeStore = mountView(
    root,
    ctx.store,
    sliceThemePicker,
    {
      render: renderThemePicker,
      shouldUpdate: (prev, next) => prev.open !== next.open || prev.activeTheme !== next.activeTheme,
      bind: (rootEl) => {
        on(rootEl, 'click', '.theme-option', (_e, target) => {
          const id = target.dataset.themeId;
          if (id) setTheme(ctx, id);
        });
        on(rootEl, 'click', '.theme-picker-close', () => toggleThemePicker(ctx, false));
        // Backdrop-only close: a click that reached the overlay without passing
        // through the panel means the user clicked outside it.
        on(rootEl, 'click', '.theme-picker-overlay', (e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('theme-picker-overlay')) toggleThemePicker(ctx, false);
        });
      },
    },
    ctx,
  );

  // Escape closes the modal, matching standard dialog behavior — the picker
  // has no other keyboard-reachable close control besides Tab-ing to the ✕.
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && ctx.store.getState().session.themePickerOpen) toggleThemePicker(ctx, false);
  }
  document.addEventListener('keydown', onKeydown);

  return () => {
    unsubscribeStore();
    document.removeEventListener('keydown', onKeydown);
  };
}

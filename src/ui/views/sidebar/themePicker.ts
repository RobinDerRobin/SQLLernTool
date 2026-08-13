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
      <div class="theme-picker" role="dialog" aria-modal="true" aria-labelledby="theme-picker-title">
        <div class="theme-picker-title">
          <span id="theme-picker-title">Design wählen</span>
          <button type="button" class="theme-picker-close" title="Schließen" aria-label="Design-Auswahl schließen">✕</button>
        </div>
        <div class="theme-grid">${options}</div>
      </div>
    </div>`;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
}

/**
 * Modal theme picker. Owns its own overlay markup (it sits outside the
 * sidebar's normal flow); the open/closed flag lives in session state only
 * because the button that opens it lives in a different module.
 */
export function mountThemePicker(root: HTMLElement, ctx: AppContext): Unsubscribe {
  // Set the moment the modal opens, to whatever had focus just before — restored on close so a
  // keyboard user lands back where they were instead of losing their place (the browser resets
  // focus to <body> when the previously-focused element is display:none'd away, which is what
  // closing the overlay does).
  let elementToRestoreFocusTo: HTMLElement | null = null;
  let wasOpen = false;

  const unsubscribeStore = mountView(
    root,
    ctx.store,
    sliceThemePicker,
    {
      render: renderThemePicker,
      shouldUpdate: (prev, next) => prev.open !== next.open || prev.activeTheme !== next.activeTheme,
      afterRender: (rootEl, slice) => {
        if (slice.open && !wasOpen) {
          elementToRestoreFocusTo = document.activeElement as HTMLElement | null;
          rootEl.querySelector<HTMLElement>('.theme-picker-close')?.focus();
        } else if (!slice.open && wasOpen) {
          elementToRestoreFocusTo?.focus();
          elementToRestoreFocusTo = null;
        }
        wasOpen = slice.open;
      },
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

  // Escape closes the modal, matching standard dialog behavior. Tab/Shift+Tab is trapped within
  // the panel while open — the modal's own content (close button + theme options) is static, so
  // wrapping at the first/last focusable element is enough; no need to re-scan on every keystroke.
  function onKeydown(e: KeyboardEvent): void {
    if (!ctx.store.getState().session.themePickerOpen) return;
    if (e.key === 'Escape') {
      toggleThemePicker(ctx, false);
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = root.querySelector<HTMLElement>('.theme-picker');
    if (!panel) return;
    const focusable = getFocusableElements(panel);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', onKeydown);

  return () => {
    unsubscribeStore();
    document.removeEventListener('keydown', onKeydown);
  };
}

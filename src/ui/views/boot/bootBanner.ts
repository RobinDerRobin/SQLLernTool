import { escapeHtml } from '../../../domain/text/escapeHtml';
import type { AppContext } from '../../context';
import { mountView } from '../../mount';
import type { AppState } from '../../state/appState';
import type { InitStatus } from '../../state/sessionState';
import type { Unsubscribe } from '../../state/store';

function renderBanner(status: InitStatus): string {
  if (status === 'ready') return '';
  if (status === 'loading') return '<div class="loading-banner">SQLite-Engine wird geladen …</div>';
  return `<div class="loading-banner loading-banner-error">Fehler beim Laden der SQLite-Engine: ${escapeHtml(status.error)}</div>`;
}

/**
 * Boot status strip. Also dims the app shell (`.booting`) while the engine is
 * still loading, so the UI is visible but obviously not yet interactive —
 * the same effect the prototype achieved with an inline opacity change.
 */
export function mountBootBanner(root: HTMLElement, appShell: HTMLElement, ctx: AppContext): Unsubscribe {
  return mountView(
    root,
    ctx.store,
    (state: AppState) => state.session.initStatus,
    {
      render: renderBanner,
      afterRender: (_rootEl, status) => {
        appShell.classList.toggle('booting', status === 'loading');
      },
    },
    ctx,
  );
}

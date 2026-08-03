import { escapeHtml } from '../../../../domain/text/escapeHtml';
import type { AppContext } from '../../../context';
import { mountView } from '../../../mount';
import { renderMarkdown } from '../../../render/markdown';
import { sendPgAskMessage } from '../../../state/actions';
import type { AppState } from '../../../state/appState';
import { findChallengeInRegistry } from '../../../state/challengeLookup';
import type { Unsubscribe } from '../../../state/store';
import { on } from '../../../util/delegate';

interface PgAskSlice {
  num: string | null;
  pg: string;
}

/** SQL-track-only panel: only the sqlite track's challenges have a Postgres-difference note in `extra`. */
function slicePgAsk(state: AppState, registry: AppContext['registry']): PgAskSlice {
  const selection = state.session.selection;
  if (!selection || selection.trackId !== 'sqlite') return { num: null, pg: '' };
  const challenge = findChallengeInRegistry(registry, selection.trackId, selection.courseId, selection.challengeNum);
  const pg = challenge && typeof challenge.extra['pg'] === 'string' ? (challenge.extra['pg'] as string) : '';
  return { num: challenge?.num ?? null, pg };
}

function renderPgAsk(slice: PgAskSlice): string {
  if (!slice.num) return '';
  // Multi-line notes are code samples in the prototype's content, so they keep
  // their formatting; single-line notes are prose.
  const noteBody = slice.pg.includes('\n')
    ? `<pre>${escapeHtml(slice.pg)}</pre>`
    : `<div class="pg-text">${escapeHtml(slice.pg)}</div>`;

  return `
    <div class="pg-note">
      <div class="pg-label">So sieht es in PostgreSQL aus</div>
      ${noteBody}
      <div class="ask-section">
        <button class="btn pg-ask-toggle-btn">Claude hierzu befragen</button>
        <div class="ask-panel">
          <textarea class="ask-textarea" rows="2" placeholder="Frage zum Postgres-Unterschied …"></textarea>
          <button class="btn pg-ask-submit-btn">Fragen</button>
          <div class="ask-status"></div>
          <div class="ask-answer"></div>
        </div>
      </div>
    </div>`;
}

/**
 * The Postgres-difference note plus its own small one-off Q&A flow. This is
 * deliberately separate from the per-challenge chat thread: the prototype
 * kept these questions out of the shared history, and so does
 * `sendPgAskMessage`.
 */
export function mountPgAskPanel(root: HTMLElement, ctx: AppContext): Unsubscribe {
  return mountView(
    root,
    ctx.store,
    (state: AppState) => slicePgAsk(state, ctx.registry),
    {
      render: renderPgAsk,
      shouldUpdate: (prev, next) => prev.num !== next.num,
      bind: (rootEl) => {
        on(rootEl, 'click', '.pg-ask-toggle-btn', () => {
          rootEl.querySelector('.ask-panel')?.classList.toggle('open');
        });

        on(rootEl, 'click', '.pg-ask-submit-btn', (_e, target) => {
          const textarea = rootEl.querySelector<HTMLTextAreaElement>('.ask-textarea');
          const status = rootEl.querySelector('.ask-status');
          const answer = rootEl.querySelector('.ask-answer');
          const question = textarea?.value.trim() ?? '';
          if (!question) return;

          const submitBtn = target as HTMLButtonElement;
          submitBtn.disabled = true;
          if (status) status.textContent = 'Claude denkt nach …';
          if (answer) answer.innerHTML = '';

          void sendPgAskMessage(ctx, question)
            .then((text) => {
              if (answer) answer.innerHTML = renderMarkdown(text);
            })
            .catch((e: Error) => {
              if (answer) answer.textContent = `Fehler beim Abfragen von Claude: ${e.message}`;
            })
            .finally(() => {
              if (status) status.textContent = '';
              submitBtn.disabled = false;
            });
        });
      },
    },
    ctx,
  );
}

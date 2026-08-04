import type { ChatMessage } from '../../../domain/progress/progressModel';
import { escapeHtml } from '../../../domain/text/escapeHtml';
import type { AppContext } from '../../context';
import { mountView } from '../../mount';
import { renderMarkdown } from '../../render/markdown';
import { sendChatMessage } from '../../state/actions';
import { selectChallengeProgress, type AppState } from '../../state/appState';
import { withChatDraftPrefill } from '../../state/sessionState';
import type { Unsubscribe } from '../../state/store';
import { on } from '../../util/delegate';

interface ChatSlice {
  history: ChatMessage[];
  prefill: string | null;
}

function sliceChat(state: AppState): ChatSlice {
  return {
    history: selectChallengeProgress(state)?.chatHistory ?? [],
    prefill: state.session.chatDraftPrefill,
  };
}

function renderTranscript(history: ChatMessage[]): string {
  if (!history.length) {
    return '<div class="empty-state">Noch keine Nachrichten. Frag etwas oder fordere einen Tipp an.</div>';
  }
  return history
    .map(
      (msg) => `
      <div class="chat-msg chat-${msg.role}">
        <div class="chat-msg-role">${msg.role === 'user' ? 'Du' : 'Claude'}</div>
        <div class="chat-msg-body">${msg.role === 'assistant' ? renderMarkdown(msg.content) : escapeHtml(msg.content)}</div>
      </div>`,
    )
    .join('');
}

function renderChat(slice: ChatSlice): string {
  return `
    <div class="chat-section">
      <div class="chat-header">Claude zu dieser Challenge (Verlauf bleibt erhalten)</div>
      <div class="chat-transcript">${renderTranscript(slice.history)}</div>
      <div class="chat-status"></div>
      <div class="chat-input-row">
        <textarea class="chat-input" rows="2" placeholder="Frag Claude etwas zu dieser Challenge …"></textarea>
        <button type="button" class="btn chat-feedback-btn" title="Feedback zu deinem Code">Code-Feedback</button>
        <button type="button" class="btn chat-send-btn">Senden</button>
      </div>
    </div>`;
}

/**
 * Per-challenge chat thread. The transcript is store-derived, but the input
 * box's text is live DOM state — so a re-render must not clobber whatever the
 * user is mid-way through typing; `afterRender` restores it, and only a
 * pending `chatDraftPrefill` (handed over by the compare view) replaces it.
 */
export function mountChatTab(root: HTMLElement, ctx: AppContext): Unsubscribe {
  let pendingInput = '';

  function currentInput(rootEl: HTMLElement): HTMLTextAreaElement | null {
    return rootEl.querySelector<HTMLTextAreaElement>('.chat-input');
  }

  function send(rootEl: HTMLElement, text: string): void {
    if (!text.trim()) return;
    const input = currentInput(rootEl);
    if (input) {
      input.value = '';
      pendingInput = '';
    }
    const status = rootEl.querySelector('.chat-status');
    if (status) status.textContent = 'Claude denkt nach …';
    void sendChatMessage(ctx, text).finally(() => {
      const liveStatus = rootEl.querySelector('.chat-status');
      if (liveStatus) liveStatus.textContent = '';
    });
  }

  return mountView(
    root,
    ctx.store,
    sliceChat,
    {
      render: renderChat,
      shouldUpdate: (prev, next) => prev.history !== next.history || prev.prefill !== next.prefill,
      afterRender: (rootEl, slice) => {
        const input = currentInput(rootEl);
        if (input) {
          if (slice.prefill) {
            pendingInput = slice.prefill;
            // Consume the handoff so it is applied exactly once.
            ctx.store.update((s) => ({ ...s, session: withChatDraftPrefill(s.session, null) }));
            input.focus();
          }
          input.value = pendingInput;
        }
        const transcript = rootEl.querySelector('.chat-transcript');
        if (transcript) transcript.scrollTop = transcript.scrollHeight;
      },
      bind: (rootEl) => {
        on(rootEl, 'input', '.chat-input', (_e, target) => {
          pendingInput = (target as HTMLTextAreaElement).value;
        });
        on(rootEl, 'click', '.chat-send-btn', () => send(rootEl, currentInput(rootEl)?.value ?? ''));
        on(rootEl, 'click', '.chat-feedback-btn', () =>
          send(rootEl, 'Claude, gib mir Rückmeldung zu diesem Code.'),
        );
        on(rootEl, 'keydown', '.chat-input', (e) => {
          const event = e as KeyboardEvent;
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            send(rootEl, currentInput(rootEl)?.value ?? '');
          }
        });
      },
    },
    ctx,
  );
}

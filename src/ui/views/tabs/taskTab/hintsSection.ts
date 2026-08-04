import { getCourseSettings } from '../../../../domain/progress/progressModel';
import type { AppContext } from '../../../context';
import { mountView } from '../../../mount';
import { revealHint } from '../../../state/actions';
import { selectChallengeProgress, type AppState } from '../../../state/appState';
import { findChallengeInRegistry } from '../../../state/challengeLookup';
import type { Unsubscribe } from '../../../state/store';
import { on } from '../../../util/delegate';

interface HintsSlice {
  num: string | null;
  hints: readonly string[];
  hintsUsed: number;
  mode: 'study' | 'exam';
  examTipsRemaining: number;
}

function sliceHints(state: AppState, registry: AppContext['registry']): HintsSlice {
  const selection = state.session.selection;
  const challenge = selection
    ? findChallengeInRegistry(registry, selection.trackId, selection.courseId, selection.challengeNum)
    : undefined;
  const settings = selection
    ? getCourseSettings(state.progress, selection.trackId, selection.courseId)
    : { mode: 'study' as const, examTipsRemaining: 3 };
  return {
    num: challenge?.num ?? null,
    hints: challenge?.hints ?? [],
    hintsUsed: selectChallengeProgress(state)?.hintsUsed ?? 0,
    mode: settings.mode,
    examTipsRemaining: settings.examTipsRemaining,
  };
}

/**
 * Shows the challenge's own authored hint text inline as soon as it is
 * revealed. The prototype only ever showed "already requested — see chat",
 * which silently made all 96 authored hints dead content and left the user
 * with nothing at all whenever the Claude chat was unavailable (i.e. anywhere
 * outside a claude.ai conversation). Claude still elaborates on the same hint
 * in the chat — see `revealHint` in state/actions.ts, which passes the
 * authored text along as grounding.
 */
function renderHints(slice: HintsSlice): string {
  if (!slice.num) return '';

  const label =
    slice.mode === 'exam'
      ? `Tipps (gemeinsamer Pool: ${slice.examTipsRemaining} von 3 für den ganzen Kurs übrig)`
      : 'Tipps (kosten je 1 Stern; Claude vertieft sie im Chat)';

  const poolEmpty = slice.mode === 'exam' && slice.examTipsRemaining <= 0;

  const items = slice.hints
    .map((hintHtml, idx) => {
      if (idx < slice.hintsUsed) {
        return `
          <div class="hint-revealed">
            <span class="hint-num">Tipp ${idx + 1}</span>
            <div class="hint-text">${hintHtml}</div>
          </div>`;
      }
      const locked = idx > slice.hintsUsed || poolEmpty;
      return `<button type="button" class="btn hint-btn" data-hint-idx="${idx}" ${locked ? 'disabled' : ''}>Tipp ${idx + 1} anfordern</button>`;
    })
    .join('');

  return `
    <div class="hints-section">
      <div class="hints-label">${label}</div>
      ${items}
    </div>`;
}

export function mountHintsSection(root: HTMLElement, ctx: AppContext): Unsubscribe {
  return mountView(
    root,
    ctx.store,
    (state: AppState) => sliceHints(state, ctx.registry),
    {
      render: renderHints,
      shouldUpdate: (prev, next) =>
        prev.num !== next.num ||
        prev.hintsUsed !== next.hintsUsed ||
        prev.mode !== next.mode ||
        prev.examTipsRemaining !== next.examTipsRemaining,
      bind: (rootEl) => {
        on(rootEl, 'click', '.hint-btn', (_e, target) => {
          if ((target as HTMLButtonElement).disabled) return;
          const idx = Number(target.dataset.hintIdx);
          if (Number.isInteger(idx)) revealHint(ctx, idx);
        });
      },
    },
    ctx,
  );
}

import { getCourseSettings } from '../../../../domain/progress/progressModel';
import type { AppContext } from '../../../context';
import type { EditorBridge } from '../../../editorBridge';
import { mountView } from '../../../mount';
import { highlightCodeForTrack, highlightContentHtml } from '../../../render/contentHighlight';
import { markSolutionViewed } from '../../../state/actions';
import { selectChallengeProgress, type AppState } from '../../../state/appState';
import { findChallengeInRegistry } from '../../../state/challengeLookup';
import type { Unsubscribe } from '../../../state/store';
import { on } from '../../../util/delegate';

interface SolutionSlice {
  num: string | null;
  solution: string;
  syntaxExplanation: string;
  solutionViewed: boolean;
  mode: 'study' | 'exam';
  trackId: string;
}

function sliceSolution(state: AppState, registry: AppContext['registry']): SolutionSlice {
  const selection = state.session.selection;
  const challenge = selection
    ? findChallengeInRegistry(registry, selection.trackId, selection.courseId, selection.challengeNum)
    : undefined;
  const settings = selection
    ? getCourseSettings(state.progress, selection.trackId, selection.courseId)
    : { mode: 'study' as const, examTipsRemaining: 3 };
  return {
    num: challenge?.num ?? null,
    solution: challenge?.solution ?? '',
    syntaxExplanation: challenge?.syntaxExplanation ?? '',
    solutionViewed: selectChallengeProgress(state)?.solutionViewed ?? false,
    mode: settings.mode,
    trackId: selection?.trackId ?? '',
  };
}

/**
 * Exam mode hides the reveal control entirely (you cannot peek). The panel's
 * open/closed state is deliberately local DOM state — re-rendering on a
 * challenge change resets it to closed, which is exactly the behavior the
 * prototype had.
 */
function renderSolution(slice: SolutionSlice): string {
  if (!slice.num || slice.mode === 'exam') return '';
  return `
    <div class="solution-block">
      <button type="button" class="btn solution-toggle-btn">Lösung anzeigen</button>
      <div class="solution-panel">
        ${slice.solutionViewed ? '<div class="solution-cost-note">Lösung angesehen — diese Challenge zählt mit 0 Sternen.</div>' : ''}
        <span class="sp-label">Musterlösung</span>
        <pre>${highlightCodeForTrack(slice.solution, slice.trackId)}</pre>
        <div class="solution-explanation">
          <div class="se-label">Syntax erklärt</div>
          <div class="se-text">${highlightContentHtml(slice.syntaxExplanation, slice.trackId)}</div>
        </div>
        <button type="button" class="btn solution-insert-btn">In den Editor übernehmen</button>
      </div>
    </div>`;
}

export function mountSolutionSection(root: HTMLElement, ctx: AppContext, editor: EditorBridge): Unsubscribe {
  // Panel open/closed is local view state, not store state — but revealing the
  // solution *does* change store state (solutionViewed/bestStars), which
  // re-renders this view and would otherwise wipe the freshly-opened panel.
  // So the flag lives in this closure and is re-applied after every render.
  let panelOpen = false;
  let renderedNum: string | null = null;

  function applyPanelState(rootEl: HTMLElement): void {
    rootEl.querySelector('.solution-panel')?.classList.toggle('open', panelOpen);
    const toggle = rootEl.querySelector('.solution-toggle-btn');
    if (toggle) toggle.textContent = panelOpen ? 'Lösung verbergen' : 'Lösung anzeigen';
  }

  return mountView(
    root,
    ctx.store,
    (state: AppState) => sliceSolution(state, ctx.registry),
    {
      render: renderSolution,
      shouldUpdate: (prev, next) =>
        prev.num !== next.num ||
        prev.trackId !== next.trackId ||
        prev.solutionViewed !== next.solutionViewed ||
        prev.mode !== next.mode,
      afterRender: (rootEl, slice) => {
        if (slice.num !== renderedNum) {
          renderedNum = slice.num;
          panelOpen = false; // a different challenge always starts closed
        }
        applyPanelState(rootEl);
      },
      bind: (rootEl) => {
        on(rootEl, 'click', '.solution-toggle-btn', () => {
          panelOpen = !panelOpen;
          applyPanelState(rootEl);
          if (panelOpen) markSolutionViewed(ctx);
        });
        on(rootEl, 'click', '.solution-insert-btn', () => {
          const solution = sliceSolution(ctx.store.getState(), ctx.registry).solution;
          if (solution) editor.setValue(solution);
        });
      },
    },
    ctx,
  );
}

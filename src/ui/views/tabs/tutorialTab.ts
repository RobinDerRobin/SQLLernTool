import type { AppContext } from '../../context';
import { mountView } from '../../mount';
import type { AppState } from '../../state/appState';
import { findChallengeInRegistry } from '../../state/challengeLookup';
import type { Unsubscribe } from '../../state/store';

interface TutorialSlice {
  num: string | null;
  tutorial: string;
  successCriteria: string;
}

function sliceTutorial(state: AppState, registry: AppContext['registry']): TutorialSlice {
  const selection = state.session.selection;
  const challenge = selection
    ? findChallengeInRegistry(registry, selection.trackId, selection.courseId, selection.challengeNum)
    : undefined;
  return {
    num: challenge?.num ?? null,
    tutorial: challenge?.tutorial ?? '',
    successCriteria: challenge?.successCriteria ?? '',
  };
}

/**
 * Tutorial/successCriteria are authored HTML from the content files (not user
 * input), so they are injected as markup on purpose — that is what makes
 * `<code>`/`<pre>` examples render. Anything user-supplied goes through
 * `escapeHtml` instead (see render/format.ts).
 */
function renderTutorial(slice: TutorialSlice): string {
  if (!slice.num) return '';
  return `
    <div class="tutorial-text">${slice.tutorial}</div>
    <div class="success-criteria">
      <div class="sc-label">Erfolgskriterium</div>
      <div class="sc-text">${slice.successCriteria}</div>
    </div>`;
}

export function mountTutorialTab(root: HTMLElement, ctx: AppContext): Unsubscribe {
  return mountView(
    root,
    ctx.store,
    (state: AppState) => sliceTutorial(state, ctx.registry),
    {
      render: renderTutorial,
      shouldUpdate: (prev, next) => prev.num !== next.num,
    },
    ctx,
  );
}

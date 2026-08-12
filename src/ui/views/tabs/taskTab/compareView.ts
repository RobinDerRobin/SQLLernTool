import { getCourseSettings } from '../../../../domain/progress/progressModel';
import { escapeHtml } from '../../../../domain/text/escapeHtml';
import type { AppContext } from '../../../context';
import type { EditorBridge } from '../../../editorBridge';
import { mountView } from '../../../mount';
import { computeLineDiff, type DiffLine } from '../../../render/diff';
import { compareToSolution } from '../../../state/actions';
import type { AppState } from '../../../state/appState';
import { findChallengeInRegistry } from '../../../state/challengeLookup';
import type { Unsubscribe } from '../../../state/store';
import { on } from '../../../util/delegate';

interface CompareSlice {
  num: string | null;
  solution: string;
  mode: 'study' | 'exam';
}

function sliceCompare(state: AppState, registry: AppContext['registry']): CompareSlice {
  const selection = state.session.selection;
  const challenge = selection
    ? findChallengeInRegistry(registry, selection.trackId, selection.courseId, selection.challengeNum)
    : undefined;
  const settings = selection
    ? getCourseSettings(state.progress, selection.trackId, selection.courseId)
    : { mode: 'study' as const, examTipsRemaining: 3 };
  return { num: challenge?.num ?? null, solution: challenge?.solution ?? '', mode: settings.mode };
}

function renderCompare(slice: CompareSlice): string {
  if (!slice.num || slice.mode === 'exam') return '';
  return `
    <div class="compare-block">
      <button type="button" class="btn compare-btn" aria-expanded="false">Mit Musterlösung vergleichen</button>
      <div class="compare-panel">
        <div class="compare-cols">
          <div class="compare-col compare-col-mine">
            <div class="compare-col-label">Dein Code</div>
          </div>
          <div class="compare-col compare-col-solution">
            <div class="compare-col-label">Musterlösung</div>
          </div>
        </div>
      </div>
    </div>`;
}

/** User code is escaped here — unlike authored challenge content, it is untrusted input. */
function renderColumn(lines: DiffLine[]): string {
  return lines
    .map((line) => `<div class="cmp-line ${line.differs ? 'cmp-diff' : ''}">${escapeHtml(line.text) || '&nbsp;'}</div>`)
    .join('');
}

export function mountCompareView(root: HTMLElement, ctx: AppContext, editor: EditorBridge): Unsubscribe {
  let renderedNum: string | null = null;

  return mountView(
    root,
    ctx.store,
    (state: AppState) => sliceCompare(state, ctx.registry),
    {
      render: renderCompare,
      shouldUpdate: (prev, next) => prev.num !== next.num || prev.mode !== next.mode,
      afterRender: (_rootEl, slice) => {
        // A re-render means a new challenge (or mode switch) — the previous
        // comparison is stale, so the panel starts closed and empty again.
        renderedNum = slice.num;
      },
      bind: (rootEl) => {
        on(rootEl, 'click', '.compare-btn', (_e, target) => {
          const slice = sliceCompare(ctx.store.getState(), ctx.registry);
          if (!slice.num || slice.num !== renderedNum) return;

          const diff = computeLineDiff(editor.getValue(), slice.solution);
          const mineCol = rootEl.querySelector('.compare-col-mine');
          const solutionCol = rootEl.querySelector('.compare-col-solution');
          if (mineCol) mineCol.innerHTML = `<div class="compare-col-label">Dein Code</div>${renderColumn(diff.mine)}`;
          if (solutionCol) {
            solutionCol.innerHTML = `<div class="compare-col-label">Musterlösung</div>${renderColumn(diff.theirs)}`;
          }
          rootEl.querySelector('.compare-panel')?.classList.add('open');
          target.setAttribute('aria-expanded', 'true');

          compareToSolution(ctx);
        });
      },
    },
    ctx,
  );
}

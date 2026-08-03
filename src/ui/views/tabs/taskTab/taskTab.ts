import type { AppContext } from '../../../context';
import type { EditorBridge } from '../../../editorBridge';
import { mountView } from '../../../mount';
import type { AppState } from '../../../state/appState';
import { findChallengeInRegistry } from '../../../state/challengeLookup';
import type { Unsubscribe } from '../../../state/store';
import { mountCompareView } from './compareView';
import { mountHintsSection } from './hintsSection';
import { mountPgAskPanel } from './pgAskPanel';
import { mountSolutionSection } from './solutionSection';

interface TaskGoalSlice {
  num: string | null;
  task: string;
  prereqNote: string | null;
  successCriteria: string;
}

function sliceTaskGoal(state: AppState, registry: AppContext['registry']): TaskGoalSlice {
  const selection = state.session.selection;
  const challenge = selection
    ? findChallengeInRegistry(registry, selection.trackId, selection.courseId, selection.challengeNum)
    : undefined;
  return {
    num: challenge?.num ?? null,
    task: challenge?.task ?? '',
    prereqNote: challenge?.prereqNote ?? null,
    successCriteria: challenge?.successCriteria ?? '',
  };
}

function renderTaskGoal(slice: TaskGoalSlice): string {
  if (!slice.num) return '';
  return `
    <div class="task-goal">${slice.task}</div>
    ${slice.prereqNote ? `<div class="prereq">${slice.prereqNote}</div>` : ''}
    <div class="success-criteria">
      <div class="sc-label">Erfolgskriterium</div>
      <div class="sc-text">${slice.successCriteria}</div>
    </div>`;
}

/**
 * Orchestrates the Aufgabe tab. Each sub-region gets its own stable container
 * that is created once and never replaced — child views own their container's
 * innerHTML, so no child is ever destroyed by a parent re-render. (Only the
 * task-goal region is re-rendered by this module itself.)
 */
export function mountTaskTab(root: HTMLElement, ctx: AppContext, editor: EditorBridge): Unsubscribe {
  root.innerHTML = `
    <div class="task-goal-region"></div>
    <div class="hints-region"></div>
    <div class="solution-region"></div>
    <div class="compare-region"></div>
    <div class="pg-region"></div>`;

  const goalRoot = root.querySelector<HTMLElement>('.task-goal-region')!;
  const hintsRoot = root.querySelector<HTMLElement>('.hints-region')!;
  const solutionRoot = root.querySelector<HTMLElement>('.solution-region')!;
  const compareRoot = root.querySelector<HTMLElement>('.compare-region')!;
  const pgRoot = root.querySelector<HTMLElement>('.pg-region')!;

  const unmounts = [
    mountView(
      goalRoot,
      ctx.store,
      (state: AppState) => sliceTaskGoal(state, ctx.registry),
      { render: renderTaskGoal, shouldUpdate: (prev, next) => prev.num !== next.num },
      ctx,
    ),
    mountHintsSection(hintsRoot, ctx),
    mountSolutionSection(solutionRoot, ctx, editor),
    mountCompareView(compareRoot, ctx, editor),
    mountPgAskPanel(pgRoot, ctx),
  ];

  return () => {
    for (const unmount of unmounts) unmount();
  };
}

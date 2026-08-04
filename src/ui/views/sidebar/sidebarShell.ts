import { getCourseSettings } from '../../../domain/progress/progressModel';
import type { AppContext } from '../../context';
import { mountView } from '../../mount';
import { resetSchema, selectChallenge, setMode, toggleSidebar, toggleThemePicker } from '../../state/actions';
import type { AppState } from '../../state/appState';
import type { Unsubscribe } from '../../state/store';
import { on } from '../../util/delegate';
import { parseTrackCourseValue, renderTrackCourseHeader } from './trackCoursePicker';

interface SidebarShellElements {
  /** The element that carries the `collapsed` class — an ancestor of both roots. */
  sidebarContainer: HTMLElement;
  headRoot: HTMLElement;
  footRoot: HTMLElement;
  /** Mobile-only overlay backdrop, shown via CSS while the sidebar is expanded on a narrow viewport. */
  backdrop: HTMLElement;
}

interface HeadSlice {
  collapsed: boolean;
  mode: 'study' | 'exam';
  examTipsRemaining: number;
  trackId: string | null;
  courseId: string | null;
}

function sliceHead(state: AppState): HeadSlice {
  const selection = state.session.selection;
  const settings = selection
    ? getCourseSettings(state.progress, selection.trackId, selection.courseId)
    : { mode: 'study' as const, examTipsRemaining: 3 };
  return {
    collapsed: state.progress.app.sidebarCollapsed,
    mode: settings.mode,
    examTipsRemaining: settings.examTipsRemaining,
    trackId: selection?.trackId ?? null,
    courseId: selection?.courseId ?? null,
  };
}

function renderHead(slice: HeadSlice, ctx: AppContext): string {
  return `
    <button type="button" class="sidebar-toggle-btn" title="Seitenleiste ein-/ausklappen" aria-label="Seitenleiste ${slice.collapsed ? 'ausklappen' : 'einklappen'}">${slice.collapsed ? '›' : '‹'}</button>
    <div class="sidebar-head">
      ${renderTrackCourseHeader({ registry: ctx.registry, trackId: slice.trackId, courseId: slice.courseId })}
      <div class="mode-toggle">
        <button type="button" class="mode-btn ${slice.mode === 'study' ? 'active' : ''}" data-mode="study" aria-pressed="${slice.mode === 'study'}">Study</button>
        <button type="button" class="mode-btn ${slice.mode === 'exam' ? 'active' : ''}" data-mode="exam" aria-pressed="${slice.mode === 'exam'}">Exam</button>
      </div>
    </div>`;
}

const FOOT_HTML = `
  <button type="button" class="theme-btn">🎨 Design wechseln</button>
  <button type="button" class="reset-btn">Schema komplett zurücksetzen</button>
  <div class="reset-confirm-row">
    <span class="reset-confirm-text">Wirklich alles löschen?</span>
    <button type="button" class="btn reset-confirm-yes">Ja, löschen</button>
    <button type="button" class="btn reset-confirm-no">Abbrechen</button>
  </div>`;

function firstChallengeNum(ctx: AppContext, trackId: string, courseId: string): string | null {
  const course = ctx.registry[trackId]?.courses.find((c) => c.id === courseId);
  const first = course?.challenges[0] as { num?: string } | undefined;
  return first?.num ?? null;
}

/**
 * The sidebar's non-list chrome: collapse toggle, course header + study/exam
 * mode toggle, and the footer's theme button + inline reset confirmation.
 * The confirm row's open/closed state is deliberately local DOM state (a
 * class toggle) rather than store state — nothing outside this module needs
 * to read it.
 */
export function mountSidebarShell(elements: SidebarShellElements, ctx: AppContext): Unsubscribe {
  const { sidebarContainer, headRoot, footRoot, backdrop } = elements;

  const unmountHead = mountView(
    headRoot,
    ctx.store,
    sliceHead,
    {
      render: (slice) => renderHead(slice, ctx),
      shouldUpdate: (prev, next) =>
        prev.collapsed !== next.collapsed ||
        prev.mode !== next.mode ||
        prev.examTipsRemaining !== next.examTipsRemaining ||
        prev.trackId !== next.trackId ||
        prev.courseId !== next.courseId,
      afterRender: (_root, slice) => {
        sidebarContainer.classList.toggle('collapsed', slice.collapsed);
      },
      bind: (root) => {
        on(root, 'click', '.sidebar-toggle-btn', () => toggleSidebar(ctx));
        on(root, 'click', '.mode-btn', (_e, target) => {
          const mode = target.dataset.mode;
          if (mode === 'study' || mode === 'exam') setMode(ctx, mode);
        });
        on(root, 'change', '[data-track-course]', (_e, target) => {
          const parsed = parseTrackCourseValue((target as HTMLSelectElement).value);
          if (!parsed) return;
          const num = firstChallengeNum(ctx, parsed.trackId, parsed.courseId);
          if (num) selectChallenge(ctx, parsed.trackId, parsed.courseId, num);
        });
      },
    },
    ctx,
  );

  footRoot.innerHTML = FOOT_HTML;
  const confirmRow = footRoot.querySelector('.reset-confirm-row');

  const offTheme = on(footRoot, 'click', '.theme-btn', () => toggleThemePicker(ctx, true));
  const offReset = on(footRoot, 'click', '.reset-btn', () => confirmRow?.classList.add('open'));
  const offYes = on(footRoot, 'click', '.reset-confirm-yes', () => {
    confirmRow?.classList.remove('open');
    resetSchema(ctx);
  });
  const offNo = on(footRoot, 'click', '.reset-confirm-no', () => confirmRow?.classList.remove('open'));

  // The backdrop only renders (via CSS) on narrow viewports while the sidebar
  // is expanded, so a click on it always means "close the drawer".
  function onBackdropClick(): void {
    if (!ctx.store.getState().progress.app.sidebarCollapsed) toggleSidebar(ctx);
  }
  backdrop.addEventListener('click', onBackdropClick);

  return () => {
    unmountHead();
    offTheme();
    offReset();
    offYes();
    offNo();
    backdrop.removeEventListener('click', onBackdropClick);
  };
}

import { escapeHtml } from '../../../domain/text/escapeHtml';
import { hasRealCode } from '../../../domain/text/hasRealCode';
import { getChallengeProgress } from '../../../domain/progress/progressModel';
import { makeProgressKey } from '../../../domain/progress/progressKey';
import type { AppContext } from '../../context';
import { mountView } from '../../mount';
import { renderResultGlyph, renderStars } from '../../render/format';
import { playChallenge, selectChallenge, toggleSidebar } from '../../state/actions';
import type { AppState } from '../../state/appState';
import { getCourseChallenges, getDefaultTrackAndCourse } from '../../state/challengeLookup';
import type { PlayResult } from '../../state/sessionState';
import type { Unsubscribe } from '../../state/store';

interface ChallengeRow {
  trackId: string;
  courseId: string;
  num: string;
  title: string;
  stars: number;
  hasCode: boolean;
  playResult: PlayResult | undefined;
  active: boolean;
  completed: boolean;
}

interface ChallengeListSlice {
  signature: string;
  rows: ChallengeRow[];
}

// Neither bestStars nor solutionViewed alone perfectly distinguishes "never
// attempted" from "attempted, ended up with 0 stars" — there's no dedicated
// "attempted" flag in the persisted model. This is a deliberate, minor
// simplification: a challenge only completed by exhausting all 3 hints (and
// never viewing the solution) shows a blank rating instead of "☆☆☆" until
// the solution is viewed or it's re-run this session.
function hasBeenCompleted(state: AppState, trackId: string, courseId: string, num: string): boolean {
  const progress = getChallengeProgress(state.progress, trackId, courseId, num);
  return progress.bestStars > 0 || progress.solutionViewed;
}

/** Shows the currently selected course's challenges — falls back to the first track/course before any selection exists. */
function sliceChallengeList(state: AppState, registry: AppContext['registry']): ChallengeListSlice {
  const selection = state.session.selection;
  const shown = selection
    ? { trackId: selection.trackId, courseId: selection.courseId }
    : getDefaultTrackAndCourse(registry);
  if (!shown) return { signature: '', rows: [] };

  const challenges = getCourseChallenges(registry, shown.trackId, shown.courseId);
  const rows: ChallengeRow[] = challenges.map((c) => {
    const progress = getChallengeProgress(state.progress, shown.trackId, shown.courseId, c.num);
    const key = makeProgressKey(shown.trackId, shown.courseId, c.num);
    return {
      trackId: shown.trackId,
      courseId: shown.courseId,
      num: c.num,
      title: c.title,
      stars: progress.bestStars,
      hasCode: hasRealCode(progress.draftSql),
      playResult: state.session.playResults[key],
      active: Boolean(
        selection && selection.trackId === shown.trackId && selection.courseId === shown.courseId && selection.challengeNum === c.num,
      ),
      completed: hasBeenCompleted(state, shown.trackId, shown.courseId, c.num),
    };
  });
  const signature = rows
    .map((r) => `${r.num}:${r.hasCode ? 1 : 0}:${r.stars}:${r.playResult ?? ''}:${r.active ? 1 : 0}:${r.completed ? 1 : 0}`)
    .join('|');
  return { signature, rows };
}

function renderRow(row: ChallengeRow): string {
  return `
    <li class="challenge-item ${row.active ? 'active' : ''}" data-track="${escapeHtml(row.trackId)}" data-course="${escapeHtml(row.courseId)}" data-num="${escapeHtml(row.num)}" tabindex="0" aria-current="${row.active ? 'true' : 'false'}">
      <div class="ci-top">
        <span class="challenge-num">${escapeHtml(row.num)}</span>
        <span class="challenge-title">${escapeHtml(row.title)}</span>
      </div>
      <div class="ci-bottom">
        <span class="stars">${row.completed ? renderStars(row.stars) : ''}</span>
        <span class="ci-actions">
          <button type="button" class="play-btn" data-play-num="${escapeHtml(row.num)}" ${row.hasCode ? '' : 'disabled'} title="Diese Challenge ausführen" aria-label="Challenge ${escapeHtml(row.num)} ausführen">▶</button>
          ${renderResultGlyph(row.playResult)}
        </span>
      </div>
    </li>`;
}

// Must match src/theme/themes.css's `@media (max-width: 760px)` sidebar-overlay
// breakpoint. Below it the sidebar becomes a fixed overlay drawer with a backdrop
// (see sidebarShell.ts) — without closing it here, selecting a challenge would
// leave the drawer covering the task/editor content the selection was supposed
// to reveal, forcing an extra manual close tap before the user can see anything.
const MOBILE_SIDEBAR_BREAKPOINT_QUERY = '(max-width: 760px)';

function closeSidebarIfMobileOverlay(ctx: AppContext): void {
  // jsdom (used by this file's own tests) doesn't implement matchMedia — treat
  // "can't tell" the same as "not mobile" rather than throwing.
  if (typeof window.matchMedia !== 'function') return;
  if (!window.matchMedia(MOBILE_SIDEBAR_BREAKPOINT_QUERY).matches) return;
  if (ctx.store.getState().progress.app.sidebarCollapsed) return;
  toggleSidebar(ctx);
}

export function mountChallengeList(root: HTMLElement, ctx: AppContext): Unsubscribe {
  return mountView(
    root,
    ctx.store,
    (state: AppState) => sliceChallengeList(state, ctx.registry),
    {
      render: (slice) => slice.rows.map(renderRow).join(''),
      shouldUpdate: (prev, next) => prev.signature !== next.signature,
      bind: (rootEl) => {
        rootEl.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const item = target.closest('.challenge-item') as HTMLElement | null;
          if (!item || !rootEl.contains(item)) return;
          const trackId = item.dataset.track;
          const courseId = item.dataset.course;
          const num = item.dataset.num;
          if (!trackId || !courseId || !num) return;

          const playBtn = target.closest('.play-btn') as HTMLButtonElement | null;
          if (playBtn) {
            if (playBtn.disabled) return;
            playChallenge(ctx, trackId, courseId, num);
            return;
          }

          selectChallenge(ctx, trackId, courseId, num);
          closeSidebarIfMobileOverlay(ctx);
        });

        // Keyboard equivalent of clicking a row. Scoped to keydown events whose
        // target *is* the item (not a nested control like .play-btn, which
        // already gets its own native Enter/Space→click behavior as a real
        // <button> — handling it here too would fire both actions at once).
        rootEl.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          const target = e.target as HTMLElement;
          if (!target.classList.contains('challenge-item')) return;
          e.preventDefault();
          const trackId = target.dataset.track;
          const courseId = target.dataset.course;
          const num = target.dataset.num;
          if (!trackId || !courseId || !num) return;
          selectChallenge(ctx, trackId, courseId, num);
          closeSidebarIfMobileOverlay(ctx);
        });
      },
    },
    ctx,
  );
}

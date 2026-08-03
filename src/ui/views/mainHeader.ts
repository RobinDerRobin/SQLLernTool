import { escapeHtml } from '../../domain/text/escapeHtml';
import type { AppContext } from '../context';
import { mountView } from '../mount';
import { switchTab } from '../state/actions';
import type { AppState } from '../state/appState';
import { getCourseChallenges } from '../state/challengeLookup';
import type { ActiveTab } from '../state/sessionState';
import type { Unsubscribe } from '../state/store';
import { on } from '../util/delegate';

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'task', label: 'Aufgabe' },
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'editor', label: 'Editor' },
  { id: 'chat', label: 'Chat' },
];

interface MainHeaderSlice {
  num: string | null;
  title: string;
  position: number;
  total: number;
  activeTab: ActiveTab;
  chatUnread: boolean;
}

function sliceMainHeader(state: AppState, registry: AppContext['registry']): MainHeaderSlice {
  const selection = state.session.selection;
  const challenges = selection ? getCourseChallenges(registry, selection.trackId, selection.courseId) : [];
  const index = selection ? challenges.findIndex((c) => c.num === selection.challengeNum) : -1;
  const challenge = index >= 0 ? challenges[index] : undefined;
  return {
    num: challenge?.num ?? null,
    title: challenge?.title ?? 'Challenge wird geladen …',
    position: index + 1,
    total: challenges.length,
    activeTab: state.session.activeTab,
    chatUnread: state.session.chatUnread,
  };
}

function renderMainHeader(slice: MainHeaderSlice): string {
  const kicker = slice.num
    ? `Challenge ${escapeHtml(slice.num)} · ${slice.position} / ${slice.total}`
    : `${slice.total} Challenges`;
  const tabs = TABS.map((tab) => {
    const badge = tab.id === 'chat' && slice.chatUnread ? '<span class="tab-badge"></span>' : '';
    return `<button class="tab-btn ${slice.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">${tab.label}${badge}</button>`;
  }).join('');

  return `
    <div class="kicker">${kicker}</div>
    <h2>${escapeHtml(slice.title)}</h2>
    <div class="tab-row">${tabs}</div>`;
}

export function mountMainHeader(root: HTMLElement, ctx: AppContext): Unsubscribe {
  return mountView(
    root,
    ctx.store,
    (state: AppState) => sliceMainHeader(state, ctx.registry),
    {
      render: renderMainHeader,
      shouldUpdate: (prev, next) =>
        prev.num !== next.num ||
        prev.title !== next.title ||
        prev.position !== next.position ||
        prev.activeTab !== next.activeTab ||
        prev.chatUnread !== next.chatUnread,
      bind: (rootEl) => {
        on(rootEl, 'click', '.tab-btn', (_e, target) => {
          const tab = target.dataset.tab as ActiveTab | undefined;
          if (tab) switchTab(ctx, tab);
        });
      },
    },
    ctx,
  );
}

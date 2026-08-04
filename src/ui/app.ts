import type { ClaudeChatClient } from '../chat/claudeChatClient';
import { createClaudeChatClient } from '../chat/claudeChatClient';
import { TRACKS, type ContentTrack } from '../content/registry';
import { createLocalStorageProgressStore } from '../persistence/localStorageProgressStore';
import type { ProgressStore } from '../persistence/ProgressStore';
import type { SqlJsStatic } from '../runtime/sql/sqlJsEngine';
import { applyThemeAttribute } from '../theme/themes';
import { withTimeout } from '../util/withTimeout';
import { createAppContext, type AppContext, type EngineFactory } from './context';
import { initApp } from './state/actions';
import type { ActiveTab } from './state/sessionState';
import type { Unsubscribe } from './state/store';
import { mountBootBanner } from './views/boot/bootBanner';
import { mountMainHeader } from './views/mainHeader';
import { mountChallengeList } from './views/sidebar/challengeList';
import { mountSidebarShell } from './views/sidebar/sidebarShell';
import { mountThemePicker } from './views/sidebar/themePicker';
import { mountChatTab } from './views/tabs/chatTab';
import { mountEditorTab } from './views/tabs/editorTab/editorTab';
import { mountTaskTab } from './views/tabs/taskTab/taskTab';
import { mountTutorialTab } from './views/tabs/tutorialTab';

const SQL_JS_CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/';
const SQL_JS_LOAD_TIMEOUT_MS = 10_000;
const SQL_JS_TIMEOUT_MESSAGE =
  'sql.js hat nach 10 Sekunden nicht geantwortet. Vermutlich blockiert eine Browser-Erweiterung ' +
  '(Werbeblocker, Datenschutz-/Sicherheits-Add-on) oder eine Content-Security-Policy das Laden externer ' +
  'Skripte von cdnjs.cloudflare.com. Prüfe die Browser-Konsole (F12) auf eine CSP-Fehlermeldung und ' +
  'versuche es notfalls in einem Inkognito-Fenster ohne Erweiterungen.';

declare global {
  interface Window {
    initSqlJs?: (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}

const SHELL_HTML = `
  <div class="sql-app">
    <div class="sidebar">
      <div class="sidebar-head-region"></div>
      <ul class="challenge-list"></ul>
      <div class="sidebar-foot"></div>
    </div>
    <div class="sidebar-backdrop"></div>
    <div class="main">
      <div class="boot-banner-region"></div>
      <div class="main-header"></div>
      <div class="tab-content-area">
        <div class="tab-content tab-content-task" id="tabpanel-task" role="tabpanel" aria-labelledby="tab-task"></div>
        <div class="tab-content tab-content-tutorial" id="tabpanel-tutorial" role="tabpanel" aria-labelledby="tab-tutorial"></div>
        <div class="tab-content tab-content-editor" id="tabpanel-editor" role="tabpanel" aria-labelledby="tab-editor"></div>
        <div class="tab-content tab-content-chat" id="tabpanel-chat" role="tabpanel" aria-labelledby="tab-chat"></div>
      </div>
    </div>
    <div class="theme-picker-region"></div>
  </div>`;

const TAB_CLASS: Record<ActiveTab, string> = {
  task: 'tab-content-task',
  tutorial: 'tab-content-tutorial',
  editor: 'tab-content-editor',
  chat: 'tab-content-chat',
};

interface CreateAppDeps {
  progressStore?: ProgressStore;
  chatClient?: ClaudeChatClient;
  registry?: Record<string, ContentTrack>;
  loadSqlJs?: () => Promise<SqlJsStatic>;
  /** Test seam: lets a suite swap in a Node-backed engine instead of real WASM. */
  engineFactory?: EngineFactory;
}

interface MountedApp {
  ctx: AppContext;
  /** Resolves once the boot sequence has finished (successfully or not). */
  ready: Promise<void>;
  unmount: Unsubscribe;
}

/**
 * Loading is wrapped in a timeout because a blocked `<script>` tag (browser
 * extension or corporate CSP enforcing e.g. `script-src-elem 'none'`) does
 * not reliably fire the element's `error` event in every browser — without
 * a timeout, `window.initSqlJs` staying undefined would otherwise leave
 * this promise (and the boot banner's "wird geladen" state) hanging forever
 * with no indication of what went wrong.
 */
async function loadSqlJsFromCdn(): Promise<SqlJsStatic> {
  return withTimeout(
    (async () => {
      const init = window.initSqlJs;
      if (!init) {
        throw new Error('sql.js wurde nicht geladen — das CDN-Skript fehlt oder wurde blockiert.');
      }
      return init({ locateFile: (file) => `${SQL_JS_CDN_BASE}${file}` });
    })(),
    SQL_JS_LOAD_TIMEOUT_MS,
    SQL_JS_TIMEOUT_MESSAGE,
  );
}

/**
 * Composition root: builds the DOM shell, constructs the one AppContext, and
 * mounts every view against it. All four tab panels stay mounted for the whole
 * session — switching tabs only toggles visibility, which is what lets each
 * tab keep its own local DOM state (editor caret, open panels, chat draft).
 */
export function createApp(root: HTMLElement, deps: CreateAppDeps = {}): MountedApp {
  root.innerHTML = SHELL_HTML;

  const sqlApp = root.querySelector<HTMLElement>('.sql-app')!;
  const sidebar = root.querySelector<HTMLElement>('.sidebar')!;
  const sidebarHead = root.querySelector<HTMLElement>('.sidebar-head-region')!;
  const sidebarFoot = root.querySelector<HTMLElement>('.sidebar-foot')!;
  const sidebarBackdrop = root.querySelector<HTMLElement>('.sidebar-backdrop')!;
  const challengeList = root.querySelector<HTMLElement>('.challenge-list')!;
  const bootRegion = root.querySelector<HTMLElement>('.boot-banner-region')!;
  const headerRegion = root.querySelector<HTMLElement>('.main-header')!;
  const themeRegion = root.querySelector<HTMLElement>('.theme-picker-region')!;
  const tabRoots: Record<ActiveTab, HTMLElement> = {
    task: root.querySelector<HTMLElement>('.tab-content-task')!,
    tutorial: root.querySelector<HTMLElement>('.tab-content-tutorial')!,
    editor: root.querySelector<HTMLElement>('.tab-content-editor')!,
    chat: root.querySelector<HTMLElement>('.tab-content-chat')!,
  };

  const ctx = createAppContext({
    progressStore: deps.progressStore ?? createLocalStorageProgressStore(),
    chatClient: deps.chatClient ?? createClaudeChatClient(),
    registry: deps.registry ?? TRACKS,
  });
  if (deps.engineFactory) ctx.engines = deps.engineFactory;

  // The editor is mounted first because the task tab needs it (insert solution,
  // compare against the current draft).
  const editorTab = mountEditorTab(tabRoots.editor, ctx);

  const unmounts: Unsubscribe[] = [
    mountBootBanner(bootRegion, sqlApp, ctx),
    mountSidebarShell({ sidebarContainer: sidebar, headRoot: sidebarHead, footRoot: sidebarFoot, backdrop: sidebarBackdrop }, ctx),
    mountChallengeList(challengeList, ctx),
    mountThemePicker(themeRegion, ctx),
    mountMainHeader(headerRegion, ctx),
    mountTaskTab(tabRoots.task, ctx, editorTab.editor),
    mountTutorialTab(tabRoots.tutorial, ctx),
    mountChatTab(tabRoots.chat, ctx),
    editorTab.unmount,
  ];

  function syncTabVisibility(): void {
    const active = ctx.store.getState().session.activeTab;
    for (const [tab, element] of Object.entries(tabRoots)) {
      element.classList.toggle('active', tab === active);
    }
  }

  function syncTheme(): void {
    applyThemeAttribute(sqlApp, ctx.store.getState().progress.app.theme);
  }

  const unsubscribeChrome = ctx.store.subscribe(() => {
    syncTabVisibility();
    syncTheme();
  });
  syncTabVisibility();
  syncTheme();

  const ready = initApp(ctx, deps.loadSqlJs ?? loadSqlJsFromCdn);

  return {
    ctx,
    ready,
    unmount: () => {
      unsubscribeChrome();
      for (const unmount of unmounts) unmount();
      root.innerHTML = '';
    },
  };
}

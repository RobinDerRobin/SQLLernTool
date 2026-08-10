import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../chat/claudeChatClient';
import { sqlLernenToolCourse } from '../content/tracks/sqlite/courses/sqlLernenTool/course';
import { createDefaultProgressState, withAppSettings, type ProgressState } from '../domain/progress/progressModel';
import type { ProgressStore } from '../persistence/ProgressStore';
import type { SqlJsStatic } from '../runtime/sql/sqlJsEngine';
import { createApp } from './app';
import type { EngineFactory } from './context';

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")), getMainCSharp: () => null, ensureCSharpEngine: () => Promise.reject(new Error("csharp engine not available in this test fixture")) };
}

function mountApp(progress: ProgressState = createDefaultProgressState(), loadSqlJs?: () => Promise<SqlJsStatic>) {
  const root = document.createElement('div');
  document.body.append(root);
  const saved: ProgressState[] = [];
  const progressStore: ProgressStore = {
    load: () => progress,
    save: (s) => {
      saved.push(s);
    },
  };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const app = createApp(root, {
    progressStore,
    chatClient,
    engineFactory: testEngineFactory(),
    loadSqlJs: loadSqlJs ?? (async () => ({}) as SqlJsStatic),
  });
  return { root, app, saved };
}

describe('createApp', () => {
  const originalInitSqlJs = window.initSqlJs;

  afterEach(() => {
    document.body.innerHTML = '';
    window.initSqlJs = originalInitSqlJs;
    vi.useRealTimers();
  });

  it('renders the full shell: sidebar, header and all four tab panels', async () => {
    const { root, app } = mountApp();
    await app.ready;

    expect(root.querySelector('.sidebar')).not.toBeNull();
    expect(root.querySelector('.main-header')).not.toBeNull();
    expect(root.querySelectorAll('.tab-content')).toHaveLength(4);
    expect(root.querySelector('.theme-picker-overlay')).not.toBeNull();
  });

  it('nests the theme picker inside .sql-app so it inherits the active theme\'s CSS variables', async () => {
    // Regression test: the theme picker used to be a DOM sibling of .sql-app,
    // outside the [data-theme='X'] scope that overrides --panel etc. — so its
    // modal always rendered in the default palette no matter which theme was
    // actually selected. It's position:fixed, so nesting it doesn't change
    // where it's painted, only which theme variables it resolves against.
    const { root, app } = mountApp();
    await app.ready;

    const sqlApp = root.querySelector('.sql-app');
    const themeRegion = root.querySelector('.theme-picker-region');
    expect(sqlApp?.contains(themeRegion)).toBe(true);
  });

  it('lists every challenge in the sidebar', async () => {
    const { root, app } = mountApp();
    await app.ready;

    expect(root.querySelectorAll('.challenge-item')).toHaveLength(sqlLernenToolCourse.challenges.length);
  });

  it('opens the first challenge on a fresh start and reports ready', async () => {
    const { root, app } = mountApp();
    await app.ready;

    expect(app.ctx.store.getState().session.initStatus).toBe('ready');
    expect(app.ctx.store.getState().session.selection?.challengeNum).toBe(sqlLernenToolCourse.challenges[0]!.num);
    expect(root.querySelector('.main-header h2')?.textContent).toBe(sqlLernenToolCourse.challenges[0]!.title);
  });

  it('resumes the last-opened challenge from saved progress', async () => {
    const progress = withAppSettings(createDefaultProgressState(), {
      lastChallenge: { trackId: 'sqlite', courseId: 'sqlLernenTool', num: '03' },
    });
    const { app } = mountApp(progress);
    await app.ready;

    expect(app.ctx.store.getState().session.selection?.challengeNum).toBe('03');
  });

  it('falls back to the first challenge when the saved one no longer exists', async () => {
    const progress = withAppSettings(createDefaultProgressState(), {
      lastChallenge: { trackId: 'sqlite', courseId: 'sqlLernenTool', num: 'entfernt' },
    });
    const { app } = mountApp(progress);
    await app.ready;

    expect(app.ctx.store.getState().session.selection?.challengeNum).toBe(sqlLernenToolCourse.challenges[0]!.num);
  });

  it('shows the task tab first and switches panels on a tab click', async () => {
    const { root, app } = mountApp();
    await app.ready;

    expect(root.querySelector('.tab-content-task')?.classList.contains('active')).toBe(true);

    root.querySelector('[data-tab="editor"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(root.querySelector('.tab-content-editor')?.classList.contains('active')).toBe(true);
    expect(root.querySelector('.tab-content-task')?.classList.contains('active')).toBe(false);
  });

  it('applies a saved non-default theme to the app root', async () => {
    const progress = withAppSettings(createDefaultProgressState(), { theme: 'ocean-depth' });
    const { root, app } = mountApp(progress);
    await app.ready;

    expect(root.querySelector('.sql-app')?.getAttribute('data-theme')).toBe('ocean-depth');
  });

  it('surfaces a boot failure instead of throwing', async () => {
    const { root, app } = mountApp(createDefaultProgressState(), async () => {
      throw new Error('CDN blockiert');
    });
    await app.ready;

    expect(root.textContent).toContain('CDN blockiert');
    expect(app.ctx.store.getState().session.initStatus).toEqual({ error: 'CDN blockiert' });
  });

  it('wires the sidebar to the editor: selecting a challenge loads its draft', async () => {
    const { root, app } = mountApp();
    await app.ready;

    root.querySelector('[data-num="2.2"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea.editor')!;
    expect(app.ctx.store.getState().session.selection?.challengeNum).toBe('2.2');
    expect(textarea.value).toContain('UNION ALL');
  });

  it('replaces whatever the mount point already contained', async () => {
    // index.html seeds #app with a "you opened this file directly" fallback;
    // it must disappear as soon as the app actually mounts.
    const root = document.createElement('div');
    root.innerHTML = '<p class="static-fallback">Diese Datei lässt sich nicht direkt öffnen</p>';
    document.body.append(root);
    const progressStore: ProgressStore = { load: () => createDefaultProgressState(), save: () => {} };
    const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };

    const app = createApp(root, {
      progressStore,
      chatClient,
      engineFactory: testEngineFactory(),
      loadSqlJs: async () => ({}) as SqlJsStatic,
    });
    await app.ready;

    expect(root.querySelector('.static-fallback')).toBeNull();
    expect(root.querySelector('.sql-app')).not.toBeNull();
  });

  it('unmount() tears the shell back down', async () => {
    const { root, app } = mountApp();
    await app.ready;

    app.unmount();

    expect(root.innerHTML).toBe('');
  });

  describe('default sql.js loader (loadSqlJsFromCdn, no deps.loadSqlJs override)', () => {
    // F-011: every other test in this file injects deps.loadSqlJs, so the real
    // default loader (window.initSqlJs + withTimeout) never actually ran.
    // These exercise it directly, the way pyodideEngine.test.ts already does
    // for the analogous Python-side CDN loader.
    function mountAppWithoutLoadSqlJsOverride(progress: ProgressState = createDefaultProgressState()) {
      const root = document.createElement('div');
      document.body.append(root);
      const progressStore: ProgressStore = { load: () => progress, save: () => {} };
      const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
      const app = createApp(root, { progressStore, chatClient, engineFactory: testEngineFactory() });
      return { root, app };
    }

    it('boots successfully via window.initSqlJs, passing a locateFile pointed at the cdnjs sql.js base', async () => {
      const init = vi.fn().mockResolvedValue({} as SqlJsStatic);
      window.initSqlJs = init;

      const { root, app } = mountAppWithoutLoadSqlJsOverride();
      await app.ready;

      expect(app.ctx.store.getState().session.initStatus).toBe('ready');
      expect(root.querySelector('.sql-app')).not.toBeNull();
      expect(init).toHaveBeenCalledTimes(1);
      const { locateFile } = init.mock.calls[0]![0] as { locateFile: (file: string) => string };
      expect(locateFile('sql-wasm.wasm')).toBe('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm');
    });

    it('surfaces a clear error when window.initSqlJs was never set (CDN script blocked)', async () => {
      delete window.initSqlJs;

      const { root, app } = mountAppWithoutLoadSqlJsOverride();
      await app.ready;

      expect(root.textContent).toContain('sql.js wurde nicht geladen');
      expect(app.ctx.store.getState().session.initStatus).toEqual({ error: expect.stringContaining('sql.js wurde nicht geladen') });
    });

    it('surfaces the 10s timeout message when window.initSqlJs never resolves', async () => {
      vi.useFakeTimers();
      window.initSqlJs = vi.fn(() => new Promise<SqlJsStatic>(() => {}));

      const { root, app } = mountAppWithoutLoadSqlJsOverride();
      await vi.advanceTimersByTimeAsync(10_000);
      await app.ready;

      expect(root.textContent).toContain('nach 10 Sekunden nicht geantwortet');
    });
  });
});

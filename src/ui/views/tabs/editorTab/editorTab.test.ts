import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeCSharpEngine } from '../../../../../test/helpers/nodeCSharpEngine';
import { createNodePythonEngine } from '../../../../../test/helpers/nodePythonEngine';
import { createNodeSqliteEngine } from '../../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../../chat/claudeChatClient';
import { TRACKS } from '../../../../content/registry';
import { csharpGrundlagenCourse } from '../../../../content/tracks/csharp/courses/csharpGrundlagen/course';
import { pythonGrundlagenCourse } from '../../../../content/tracks/python/courses/pythonGrundlagen/course';
import { sqlLernenToolCourse } from '../../../../content/tracks/sqlite/courses/sqlLernenTool/course';
import {
  createDefaultProgressState,
  getChallengeProgress,
  withChallengeProgress,
  type ProgressState,
} from '../../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../../context';
import { selectChallenge } from '../../../state/actions';
import { mountEditorTab } from './editorTab';

const c01 = sqlLernenToolCourse.challenges.find((c) => c.num === '01')!;
const py01 = pythonGrundlagenCourse.challenges.find((c) => c.num === '01')!;
const cs01 = csharpGrundlagenCourse.challenges.find((c) => c.num === '01')!;

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")), getMainCSharp: () => null, ensureCSharpEngine: () => Promise.reject(new Error("csharp engine not available in this test fixture")) };
}

function testEngineFactoryWithPython(): EngineFactory {
  const main = createNodeSqliteEngine();
  const py = createNodePythonEngine();
  return {
    getMain: () => main,
    setMainFromSqlJs: () => {},
    createDisposable: () => createNodeSqliteEngine(),
    getMainPython: () => py,
    ensurePythonEngine: () => Promise.resolve(py),
    getMainCSharp: () => null,
    ensureCSharpEngine: () => Promise.reject(new Error('csharp engine not available in this test fixture')),
  };
}

function testEngineFactoryWithCSharp(): EngineFactory {
  const main = createNodeSqliteEngine();
  const cs = createNodeCSharpEngine();
  return {
    getMain: () => main,
    setMainFromSqlJs: () => {},
    createDisposable: () => createNodeSqliteEngine(),
    getMainPython: () => null,
    ensurePythonEngine: () => Promise.reject(new Error('python engine not available in this test fixture')),
    getMainCSharp: () => cs,
    ensureCSharpEngine: () => Promise.resolve(cs),
  };
}

function makeCtx(progress: ProgressState = createDefaultProgressState()): AppContext {
  const progressStore: ProgressStore = { load: () => progress, save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
  return ctx;
}

function makeCtxWithPython(progress: ProgressState = createDefaultProgressState()): AppContext {
  const progressStore: ProgressStore = { load: () => progress, save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactoryWithPython();
  return ctx;
}

function makeCtxWithCSharp(progress: ProgressState = createDefaultProgressState()): AppContext {
  const progressStore: ProgressStore = { load: () => progress, save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactoryWithCSharp();
  return ctx;
}

describe('mountEditorTab', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('renders the editor shell, toolbar and results area', () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);

    expect(root.querySelector('textarea.editor')).not.toBeNull();
    expect(root.querySelector('.highlight-layer')).not.toBeNull();
    expect(root.querySelector('.line-numbers')).not.toBeNull();
    expect(root.querySelector('.run-btn')).not.toBeNull();
    expect(root.querySelector('.results-wrap')).not.toBeNull();
  });

  it('marks the results area and engine-status banner as ARIA live regions so screen readers announce run outcomes and loading/error status', () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);

    expect(root.querySelector('.results-body')?.getAttribute('role')).toBe('status');
    expect(root.querySelector('.python-engine-status')?.getAttribute('role')).toBe('status');
  });

  it('loads the saved draft for the opened challenge into the editor', () => {
    const progress = withChallengeProgress(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', '01', {
      draftSql: 'SELECT 42;',
    });
    const ctx = makeCtx(progress);
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(editor.getValue()).toBe('SELECT 42;');
  });

  it("shows the challenge's successCriteria as an expected-result banner above the editor", () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const banner = root.querySelector('.expected-result-banner')!;
    expect(banner.textContent).toContain('Erwartetes Ergebnis');
    expect(banner.innerHTML).toContain(c01.successCriteria);
  });

  it('seeds a placeholder comment when the challenge has no draft yet', () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(editor.getValue()).toContain('--');
    expect(editor.getValue()).toContain(c01.title);
  });

  it("flushes the outgoing challenge's text before loading the next one", () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    editor.setValue('-- meine Arbeit\nSELECT 1;');

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');

    const saved = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').draftSql;
    expect(saved).toBe('-- meine Arbeit\nSELECT 1;');
  });

  it('running a correct solution shows a success status with stars', async () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    editor.setValue(c01.solution);

    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(root.querySelector('.status-ok')).not.toBeNull();
    expect(root.querySelector('.status-stars')?.textContent).toBe('★★★');
    expect(root.querySelector('.result-table')).not.toBeNull();
  });

  it('running invalid SQL shows the error status with the line number', async () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    editor.setValue('SELEKT nope;');

    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(root.querySelector('.status-err')?.textContent).toContain('Zeile 1');
  });

  it('clears the previous run result when a different challenge is opened', () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    editor.setValue(c01.solution);
    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');

    expect(root.querySelector('.status-ok')).toBeNull();
  });

  it('shows a Python-engine error banner when Pyodide fails to load for a Python challenge', async () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);
    selectChallenge(ctx, 'python', 'pythonGrundlagen', '01');

    // ensurePythonEngine() in the test fixture rejects immediately — flush the microtask queue.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const banner = root.querySelector('.python-engine-status')!;
    expect(banner.textContent).toContain('Python-Umgebung konnte nicht geladen werden');
  });

  it('running a Python challenge while the engine is still loading shows the loading placeholder', async () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'python', 'pythonGrundlagen', '01');
    editor.setValue(py01.solution);

    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(root.querySelector('.results-body')?.textContent).toContain('Python-Umgebung wird geladen');
  });

  it('running a correct Python solution shows a success status with stdout', async () => {
    const ctx = makeCtxWithPython();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'python', 'pythonGrundlagen', '01');
    editor.setValue(py01.solution);

    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(root.querySelector('.status-ok')).not.toBeNull();
    expect(root.querySelector('.results-body pre')).not.toBeNull();
  });

  it(
    'running a correct C# solution shows a success status with stdout',
    async () => {
      const ctx = makeCtxWithCSharp();
      const { editor } = mountEditorTab(root, ctx);
      selectChallenge(ctx, 'csharp', 'csharpGrundlagen', '01');
      editor.setValue(cs01.solution);

      root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // A real `dotnet exec` compile+run (via createNodeCSharpEngine), unlike SQL/Python's
      // synchronous engines — poll instead of a single microtask flush.
      const deadline = Date.now() + 15_000;
      while (!root.querySelector('.status-ok') && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(root.querySelector('.status-ok')).not.toBeNull();
      expect(root.querySelector('.results-body pre')).not.toBeNull();
    },
    20_000,
  );

  it('running a C# challenge while the engine is still loading shows the loading placeholder', async () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'csharp', 'csharpGrundlagen', '01');
    editor.setValue(cs01.solution);

    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(root.querySelector('.results-body')?.textContent).toContain('C#-Umgebung wird geladen');
  });

  it('shows a track-appropriate empty-state before the first run — "Query" for SQL, "Code" for Python', () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(root.querySelector('.results-body')?.textContent).toBe('Noch keine Query ausgeführt.');

    selectChallenge(ctx, 'python', 'pythonGrundlagen', '01');
    expect(root.querySelector('.results-body')?.textContent).toBe('Noch kein Code ausgeführt.');
  });

  it('shows no Python-engine banner for the SQL track', () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.python-engine-status')!.innerHTML.trim()).toBe('');
  });

  it('toggles the tables inspector panel', () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);
    expect(root.querySelector('.tables-panel')?.classList.contains('open')).toBe(false);

    root.querySelector('.tables-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(root.querySelector('.tables-panel')?.classList.contains('open')).toBe(true);
  });

  it('reflects the tables panel open/closed state via aria-expanded on its toggle button', () => {
    const ctx = makeCtx();
    mountEditorTab(root, ctx);
    const toggleBtn = root.querySelector('.tables-toggle-btn')!;
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('gives the code editor an accessible name that reflects the active track', async () => {
    const ctx = makeCtxWithPython();
    mountEditorTab(root, ctx);
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea.editor')!;
    expect(textarea.getAttribute('aria-label')).toBe('SQL-Code-Editor');

    selectChallenge(ctx, 'python', 'pythonGrundlagen', '01');
    expect(textarea.getAttribute('aria-label')).toBe('Python-Code-Editor');
  });

  it('persists edits through the debounced onChange', () => {
    vi.useFakeTimers();
    const ctx = makeCtx();
    mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea.editor')!;
    textarea.value = 'SELECT 99;';
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(600);

    expect(getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').draftSql).toBe(
      'SELECT 99;',
    );
  });
});

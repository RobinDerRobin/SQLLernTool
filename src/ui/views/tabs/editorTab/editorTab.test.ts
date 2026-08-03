import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../../chat/claudeChatClient';
import { TRACKS } from '../../../../content/registry';
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

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")) };
}

function makeCtx(progress: ProgressState = createDefaultProgressState()): AppContext {
  const progressStore: ProgressStore = { load: () => progress, save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
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

  it('running a correct solution shows a success status with stars', () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    editor.setValue(c01.solution);

    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(root.querySelector('.status-ok')).not.toBeNull();
    expect(root.querySelector('.status-stars')?.textContent).toBe('★★★');
    expect(root.querySelector('.result-table')).not.toBeNull();
  });

  it('running invalid SQL shows the error status with the line number', () => {
    const ctx = makeCtx();
    const { editor } = mountEditorTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    editor.setValue('SELEKT nope;');

    root.querySelector('.run-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

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

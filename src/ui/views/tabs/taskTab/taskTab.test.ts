import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../../chat/claudeChatClient';
import { TRACKS } from '../../../../content/registry';
import { createDefaultProgressState } from '../../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../../context';
import type { EditorBridge } from '../../../editorBridge';
import { selectChallenge } from '../../../state/actions';
import { mountTaskTab } from './taskTab';

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")) };
}

function makeCtx(): AppContext {
  const progressStore: ProgressStore = { load: () => createDefaultProgressState(), save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
  return ctx;
}

const fakeEditor: EditorBridge = { getValue: () => '', setValue: () => {} };

describe('mountTaskTab', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the task text, hints, solution, compare and postgres regions together', () => {
    const ctx = makeCtx();
    mountTaskTab(root, ctx, fakeEditor);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.task-goal')).not.toBeNull();
    expect(root.querySelector('.hints-section')).not.toBeNull();
    expect(root.querySelector('.solution-block')).not.toBeNull();
    expect(root.querySelector('.compare-block')).not.toBeNull();
    expect(root.querySelector('.pg-note')).not.toBeNull();
  });

  it('renders the success criteria for the open challenge', () => {
    const ctx = makeCtx();
    mountTaskTab(root, ctx, fakeEditor);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.success-criteria')?.textContent).toContain('users');
  });

  it('shows the prereq note only for challenges that declare one', () => {
    const ctx = makeCtx();
    mountTaskTab(root, ctx, fakeEditor);

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(root.querySelector('.prereq')).toBeNull();

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '1.1');
    expect(root.querySelector('.prereq')?.textContent).toContain('Challenge 1');
  });

  it('keeps each region mounted across challenge switches (child views survive re-render)', () => {
    const ctx = makeCtx();
    mountTaskTab(root, ctx, fakeEditor);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');

    expect(root.querySelector('.hints-section')).not.toBeNull();
    expect(root.querySelector('.task-goal')?.textContent).toContain('UNION ALL');
  });

  it('unmounting detaches every child region', () => {
    const ctx = makeCtx();
    const unmount = mountTaskTab(root, ctx, fakeEditor);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    const before = root.innerHTML;

    unmount();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');

    expect(root.innerHTML).toBe(before);
  });
});

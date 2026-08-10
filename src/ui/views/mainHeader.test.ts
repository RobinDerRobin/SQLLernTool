import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../chat/claudeChatClient';
import { TRACKS } from '../../content/registry';
import { sqlLernenToolCourse } from '../../content/tracks/sqlite/courses/sqlLernenTool/course';
import { createDefaultProgressState } from '../../domain/progress/progressModel';
import type { ProgressStore } from '../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../context';
import { selectChallenge, switchTab } from '../state/actions';
import { mountMainHeader } from './mainHeader';

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")), getMainCSharp: () => null, ensureCSharpEngine: () => Promise.reject(new Error("csharp engine not available in this test fixture")) };
}

function makeCtx(): AppContext {
  const progressStore: ProgressStore = { load: () => createDefaultProgressState(), save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
  return ctx;
}

describe('mountMainHeader', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the challenge number, position and title once a challenge is open', () => {
    const ctx = makeCtx();
    mountMainHeader(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.kicker')?.textContent).toContain('01');
    expect(root.querySelector('.kicker')?.textContent).toContain(String(sqlLernenToolCourse.challenges.length));
    expect(root.querySelector('h2')?.textContent).toBe('Basis-INSERT');
  });

  it('renders all four tabs, with task active by default', () => {
    const ctx = makeCtx();
    mountMainHeader(root, ctx);
    expect(root.querySelectorAll('.tab-btn')).toHaveLength(4);
    expect(root.querySelector('[data-tab="task"]')?.classList.contains('active')).toBe(true);
  });

  it('exposes tab semantics via role and aria-selected', () => {
    const ctx = makeCtx();
    mountMainHeader(root, ctx);

    expect(root.querySelector('.tab-row')?.getAttribute('role')).toBe('tablist');
    const taskTab = root.querySelector('[data-tab="task"]');
    expect(taskTab?.getAttribute('role')).toBe('tab');
    expect(taskTab?.getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('[data-tab="editor"]')?.getAttribute('aria-selected')).toBe('false');
  });

  it('clicking a tab switches to it', () => {
    const ctx = makeCtx();
    mountMainHeader(root, ctx);

    root.querySelector('[data-tab="editor"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().session.activeTab).toBe('editor');
    expect(root.querySelector('[data-tab="editor"]')?.classList.contains('active')).toBe(true);
  });

  it('shows an unread badge on the chat tab only when there is an unread reply', () => {
    const ctx = makeCtx();
    mountMainHeader(root, ctx);
    expect(root.querySelector('.tab-badge')).toBeNull();

    ctx.store.update((s) => ({ ...s, session: { ...s.session, chatUnread: true } }));
    expect(root.querySelector('[data-tab="chat"] .tab-badge')).not.toBeNull();
  });

  it('clears the unread badge when the chat tab is opened', () => {
    const ctx = makeCtx();
    mountMainHeader(root, ctx);
    ctx.store.update((s) => ({ ...s, session: { ...s.session, chatUnread: true } }));

    switchTab(ctx, 'chat');

    expect(root.querySelector('.tab-badge')).toBeNull();
  });

  it('renders a placeholder title before any challenge is selected', () => {
    const ctx = makeCtx();
    mountMainHeader(root, ctx);
    expect(root.querySelector('h2')).not.toBeNull();
  });
});

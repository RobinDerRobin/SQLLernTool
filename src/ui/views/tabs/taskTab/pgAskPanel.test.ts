import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../../chat/claudeChatClient';
import { TRACKS } from '../../../../content/registry';
import { sqlLernenToolCourse } from '../../../../content/tracks/sqlite/courses/sqlLernenTool/course';
import { createDefaultProgressState, getChallengeProgress } from '../../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../../context';
import { selectChallenge } from '../../../state/actions';
import { mountPgAskPanel } from './pgAskPanel';

const c03 = sqlLernenToolCourse.challenges.find((c) => c.num === '03')!;

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")), getMainCSharp: () => null, ensureCSharpEngine: () => Promise.reject(new Error("csharp engine not available in this test fixture")) };
}

function makeCtx(reply = 'In Postgres geht das so.') {
  const progressStore: ProgressStore = { load: () => createDefaultProgressState(), save: () => {} };
  const sendMessage = vi.fn().mockResolvedValue(reply);
  const chatClient: ClaudeChatClient = { sendMessage };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
  return { ctx, sendMessage };
}

/** Drains the pending promise chain (a macrotask tick runs all queued microtasks first). */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('mountPgAskPanel', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("renders the challenge's Postgres note", () => {
    const { ctx } = makeCtx();
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(root.querySelector('.pg-note')?.textContent).toContain('Postgres');
  });

  it('renders a multi-line Postgres note as preformatted text', () => {
    const { ctx } = makeCtx();
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '03');

    expect(c03.extra.pg).toContain('\n');
    expect(root.querySelector('.pg-note pre')).not.toBeNull();
  });

  it('the ask panel starts closed and opens on the toggle', () => {
    const { ctx } = makeCtx();
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.ask-panel')?.classList.contains('open')).toBe(false);
    root.querySelector('.pg-ask-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.querySelector('.ask-panel')?.classList.contains('open')).toBe(true);
  });

  it('reflects the panel state via aria-expanded on the toggle button', () => {
    const { ctx } = makeCtx();
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const toggle = root.querySelector('.pg-ask-toggle-btn')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('submitting a question renders the answer as markdown', async () => {
    const { ctx, sendMessage } = makeCtx('Antwort mit `code`.');
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.pg-ask-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector<HTMLTextAreaElement>('.ask-textarea')!.value = 'Warum?';
    root.querySelector('.pg-ask-submit-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.ask-answer')?.querySelector('code')?.textContent).toBe('code');
  });

  it('does not pollute the main chat history', async () => {
    const { ctx } = makeCtx();
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.pg-ask-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector<HTMLTextAreaElement>('.ask-textarea')!.value = 'Warum?';
    root.querySelector('.pg-ask-submit-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').chatHistory).toEqual([]);
  });

  it('ignores an empty question', async () => {
    const { ctx, sendMessage } = makeCtx();
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.pg-ask-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector<HTMLTextAreaElement>('.ask-textarea')!.value = '   ';
    root.querySelector('.pg-ask-submit-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('shows an error message when the request fails', async () => {
    const { ctx } = makeCtx();
    ctx.chatClient.sendMessage = vi.fn().mockRejectedValue(new Error('offline'));
    mountPgAskPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.pg-ask-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector<HTMLTextAreaElement>('.ask-textarea')!.value = 'Warum?';
    root.querySelector('.pg-ask-submit-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(root.querySelector('.ask-answer')?.textContent).toContain('Fehler');
  });
});

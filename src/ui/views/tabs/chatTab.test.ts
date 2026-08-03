import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../chat/claudeChatClient';
import { TRACKS } from '../../../content/registry';
import {
  createDefaultProgressState,
  getChallengeProgress,
  withChallengeProgress,
  type ProgressState,
} from '../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../context';
import { compareToSolution, selectChallenge } from '../../state/actions';
import { mountChatTab } from './chatTab';

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")) };
}

function makeCtx(progress: ProgressState = createDefaultProgressState(), reply = 'Antwort mit `code`.') {
  const progressStore: ProgressStore = { load: () => progress, save: () => {} };
  const sendMessage = vi.fn().mockResolvedValue(reply);
  const chatClient: ClaudeChatClient = { sendMessage };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
  return { ctx, sendMessage };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('mountChatTab', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows an empty state when there are no messages yet', () => {
    const { ctx } = makeCtx();
    mountChatTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.chat-transcript')?.textContent).toContain('Noch keine Nachrichten');
  });

  it('renders the stored history, labelling user and assistant turns', () => {
    const progress = withChallengeProgress(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', '01', {
      chatHistory: [
        { role: 'user', content: 'Frage?' },
        { role: 'assistant', content: 'Antwort.' },
      ],
    });
    const { ctx } = makeCtx(progress);
    mountChatTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelectorAll('.chat-msg')).toHaveLength(2);
    expect(root.querySelector('.chat-user')?.textContent).toContain('Frage?');
    expect(root.querySelector('.chat-assistant')?.textContent).toContain('Antwort.');
  });

  it('escapes user messages but renders assistant replies as markdown', () => {
    const progress = withChallengeProgress(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', '01', {
      chatHistory: [
        { role: 'user', content: '<img src=x>' },
        { role: 'assistant', content: 'nutze `SELECT`' },
      ],
    });
    const { ctx } = makeCtx(progress);
    mountChatTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.chat-user')?.querySelector('img')).toBeNull();
    expect(root.querySelector('.chat-assistant')?.querySelector('code')?.textContent).toBe('SELECT');
  });

  it('sending a message appends it and clears the input', async () => {
    const { ctx, sendMessage } = makeCtx();
    mountChatTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const input = root.querySelector<HTMLTextAreaElement>('.chat-input')!;
    input.value = 'Wie geht das?';
    root.querySelector('.chat-send-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
    const history = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').chatHistory;
    expect(history).toHaveLength(2);
  });

  it('the code-feedback shortcut sends a message without typing', async () => {
    const { ctx, sendMessage } = makeCtx();
    mountChatTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.chat-feedback-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('picks up a prefilled draft handed over by the compare view', () => {
    const { ctx } = makeCtx();
    mountChatTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    compareToSolution(ctx);

    expect(root.querySelector<HTMLTextAreaElement>('.chat-input')!.value).toContain('Musterlösung');
    expect(ctx.store.getState().session.chatDraftPrefill).toBeNull();
  });

  it('shows a separate history per challenge', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', {
      chatHistory: [{ role: 'user', content: 'nur bei 01' }],
    });
    const { ctx } = makeCtx(progress);
    mountChatTab(root, ctx);

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(root.textContent).toContain('nur bei 01');

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');
    expect(root.textContent).not.toContain('nur bei 01');
  });

  it('ignores an empty message', async () => {
    const { ctx, sendMessage } = makeCtx();
    mountChatTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector<HTMLTextAreaElement>('.chat-input')!.value = '   ';
    root.querySelector('.chat-send-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

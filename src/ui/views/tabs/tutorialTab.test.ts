import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../chat/claudeChatClient';
import { TRACKS } from '../../../content/registry';
import { sqlLernenToolCourse } from '../../../content/tracks/sqlite/courses/sqlLernenTool/course';
import { createDefaultProgressState } from '../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../context';
import { selectChallenge } from '../../state/actions';
import { mountTutorialTab } from './tutorialTab';

const c01 = sqlLernenToolCourse.challenges.find((c) => c.num === '01')!;

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

describe('mountTutorialTab', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the challenge tutorial as rich markup (authored HTML is trusted)', () => {
    const ctx = makeCtx();
    mountTutorialTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const tutorial = root.querySelector('.tutorial-text');
    expect(tutorial?.querySelector('code')).not.toBeNull();
    expect(tutorial?.textContent).toContain('Tabelle');
  });

  it('repeats the success criteria alongside the tutorial', () => {
    const ctx = makeCtx();
    mountTutorialTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.success-criteria')?.textContent).toContain('users');
  });

  it('switches content when a different challenge is opened', () => {
    const ctx = makeCtx();
    mountTutorialTab(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');

    expect(root.querySelector('.tutorial-text')?.textContent).toContain('UNION ALL');
    expect(root.querySelector('.tutorial-text')?.textContent).not.toContain(c01.tutorial.slice(0, 40));
  });

  it('renders an empty container before any challenge is selected', () => {
    const ctx = makeCtx();
    mountTutorialTab(root, ctx);
    expect(root.innerHTML).toBe('');
  });
});

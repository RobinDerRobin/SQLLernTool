import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../../chat/claudeChatClient';
import { TRACKS } from '../../../../content/registry';
import { sqlLernenToolCourse } from '../../../../content/tracks/sqlite/courses/sqlLernenTool/course';
import {
  createDefaultProgressState,
  getChallengeProgress,
  withChallengeProgress,
  withCourseSettings,
  type ProgressState,
} from '../../../../domain/progress/progressModel';
import { stripHtml } from '../../../../domain/text/stripHtml';
import type { ProgressStore } from '../../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../../context';
import { selectChallenge } from '../../../state/actions';
import { mountHintsSection } from './hintsSection';

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

describe('mountHintsSection', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('offers three hint buttons, only the first one enabled', () => {
    const ctx = makeCtx();
    mountHintsSection(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const buttons = root.querySelectorAll<HTMLButtonElement>('.hint-btn');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]!.disabled).toBe(false);
    expect(buttons[1]!.disabled).toBe(true);
    expect(buttons[2]!.disabled).toBe(true);
  });

  it("displays the challenge's own authored hint text inline once revealed", () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 1 });
    const ctx = makeCtx(progress);
    mountHintsSection(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const revealed = root.querySelector('.hint-revealed');
    expect(revealed).not.toBeNull();
    expect(revealed?.querySelector('.hint-num')?.textContent).toContain('1');
    expect(revealed?.querySelector('.hint-text')?.textContent).toContain(stripHtml(c01.hints[0]).slice(0, 30));
  });

  it('renders authored hint markup (code samples) rather than escaping it', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 1 });
    const ctx = makeCtx(progress);
    mountHintsSection(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.hint-text code')).not.toBeNull();
  });

  it('shows revealed hints and still offers the next one', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 2 });
    const ctx = makeCtx(progress);
    mountHintsSection(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelectorAll('.hint-revealed')).toHaveLength(2);
    expect(root.querySelectorAll('.hint-btn')).toHaveLength(1);
    expect(root.querySelector<HTMLButtonElement>('.hint-btn')!.disabled).toBe(false);
  });

  it('clicking the next hint button reveals it', () => {
    const ctx = makeCtx();
    mountHintsSection(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.hint-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').hintsUsed).toBe(1);
    expect(root.querySelector('.hint-revealed')).not.toBeNull();
  });

  it('shows the shared pool size in the label in exam mode', () => {
    const progress = withCourseSettings(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', {
      mode: 'exam',
      examTipsRemaining: 2,
    });
    const ctx = makeCtx(progress);
    mountHintsSection(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.hints-label')?.textContent).toContain('2');
    expect(root.querySelector('.hints-label')?.textContent?.toLowerCase()).toContain('pool');
  });

  it('disables all hint buttons when the exam pool is exhausted', () => {
    const progress = withCourseSettings(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', {
      mode: 'exam',
      examTipsRemaining: 0,
    });
    const ctx = makeCtx(progress);
    mountHintsSection(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    for (const btn of root.querySelectorAll<HTMLButtonElement>('.hint-btn')) {
      expect(btn.disabled).toBe(true);
    }
  });

  it('renders nothing before a challenge is selected', () => {
    const ctx = makeCtx();
    mountHintsSection(root, ctx);
    expect(root.innerHTML).toBe('');
  });
});

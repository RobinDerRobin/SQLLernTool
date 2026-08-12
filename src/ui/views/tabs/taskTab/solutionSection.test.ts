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
import type { ProgressStore } from '../../../../persistence/ProgressStore';
import type { EditorBridge } from '../../../editorBridge';
import { createAppContext, type AppContext, type EngineFactory } from '../../../context';
import { selectChallenge } from '../../../state/actions';
import { mountSolutionSection } from './solutionSection';

const c01 = sqlLernenToolCourse.challenges.find((c) => c.num === '01')!;

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")), getMainCSharp: () => null, ensureCSharpEngine: () => Promise.reject(new Error("csharp engine not available in this test fixture")) };
}

function makeCtx(progress: ProgressState = createDefaultProgressState()): AppContext {
  const progressStore: ProgressStore = { load: () => progress, save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
  return ctx;
}

function fakeEditor(): EditorBridge & { value: string } {
  return {
    value: '',
    getValue() {
      return this.value;
    },
    setValue(v: string) {
      this.value = v;
    },
  };
}

describe('mountSolutionSection', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('offers a reveal toggle in study mode, with the panel closed', () => {
    const ctx = makeCtx();
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.solution-toggle-btn')).not.toBeNull();
    expect(root.querySelector('.solution-panel')?.classList.contains('open')).toBe(false);
  });

  it('hides the reveal toggle entirely in exam mode', () => {
    const progress = withCourseSettings(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', {
      mode: 'exam',
      examTipsRemaining: 3,
    });
    const ctx = makeCtx(progress);
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.solution-toggle-btn')).toBeNull();
  });

  it('revealing the solution opens the panel, marks it viewed and zeroes the stars', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { bestStars: 3 });
    const ctx = makeCtx(progress);
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.solution-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(root.querySelector('.solution-panel')?.classList.contains('open')).toBe(true);
    const after = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01');
    expect(after.solutionViewed).toBe(true);
    expect(after.bestStars).toBe(0);
  });

  it('shows the solution code and its syntax explanation', () => {
    const ctx = makeCtx();
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.solution-panel pre')?.textContent).toBe(c01.solution);
    expect(root.querySelector('.solution-explanation')?.querySelector('li')).not.toBeNull();
  });

  it('syntax-highlights the solution code and its explanation using the same tokenizer as the editor', () => {
    const ctx = makeCtx();
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.solution-panel pre .tok-keyword')).not.toBeNull();
    expect(root.querySelector('.solution-explanation .tok-keyword')).not.toBeNull();
  });

  it('shows the star-cost note once the solution has been viewed', () => {
    const progress = withChallengeProgress(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', '01', {
      solutionViewed: true,
    });
    const ctx = makeCtx(progress);
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.solution-cost-note')).not.toBeNull();
  });

  it('the insert button copies the model solution into the editor', () => {
    const ctx = makeCtx();
    const editor = fakeEditor();
    mountSolutionSection(root, ctx, editor);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.solution-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector('.solution-insert-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editor.getValue()).toBe(c01.solution);
  });

  it('reflects the panel state via aria-expanded on the toggle button', () => {
    // Revealing the solution marks it viewed, which changes store state and
    // re-renders this view (replacing the button element) — re-query after
    // each click instead of holding a single stale reference.
    const ctx = makeCtx();
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(root.querySelector('.solution-toggle-btn')!.getAttribute('aria-expanded')).toBe('false');

    root.querySelector('.solution-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.querySelector('.solution-toggle-btn')!.getAttribute('aria-expanded')).toBe('true');

    root.querySelector('.solution-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.querySelector('.solution-toggle-btn')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the panel again when a different challenge is opened', () => {
    const ctx = makeCtx();
    mountSolutionSection(root, ctx, fakeEditor());
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    root.querySelector('.solution-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');

    expect(root.querySelector('.solution-panel')?.classList.contains('open')).toBe(false);
  });
});

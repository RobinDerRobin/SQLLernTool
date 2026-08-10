import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../../chat/claudeChatClient';
import { TRACKS } from '../../../../content/registry';
import { sqlLernenToolCourse } from '../../../../content/tracks/sqlite/courses/sqlLernenTool/course';
import { createDefaultProgressState, withCourseSettings, type ProgressState } from '../../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../../context';
import type { EditorBridge } from '../../../editorBridge';
import { selectChallenge } from '../../../state/actions';
import { mountCompareView } from './compareView';

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

function fakeEditor(value: string): EditorBridge {
  return { getValue: () => value, setValue: () => {} };
}

describe('mountCompareView', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('offers a compare button in study mode', () => {
    const ctx = makeCtx();
    mountCompareView(root, ctx, fakeEditor(''));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(root.querySelector('.compare-btn')).not.toBeNull();
  });

  it('hides the compare button in exam mode', () => {
    const progress = withCourseSettings(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', {
      mode: 'exam',
      examTipsRemaining: 3,
    });
    const ctx = makeCtx(progress);
    mountCompareView(root, ctx, fakeEditor(''));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(root.querySelector('.compare-btn')).toBeNull();
  });

  it('renders both columns line by line when compared', () => {
    const ctx = makeCtx();
    mountCompareView(root, ctx, fakeEditor(c01.solution));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.compare-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const expectedLines = c01.solution.split('\n').length;
    expect(root.querySelectorAll('.compare-col-mine .cmp-line')).toHaveLength(expectedLines);
    expect(root.querySelectorAll('.compare-col-solution .cmp-line')).toHaveLength(expectedLines);
    expect(root.querySelector('.compare-panel')?.classList.contains('open')).toBe(true);
  });

  it('highlights only the lines that actually differ', () => {
    const ctx = makeCtx();
    mountCompareView(root, ctx, fakeEditor('SELECT 1;\nGARBAGE'));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.compare-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const highlighted = root.querySelectorAll('.compare-col-mine .cmp-diff');
    expect(highlighted.length).toBeGreaterThan(0);
    expect(highlighted.length).toBeLessThan(root.querySelectorAll('.compare-col-mine .cmp-line').length);
  });

  it('prefills the chat with a comparison question', () => {
    const ctx = makeCtx();
    mountCompareView(root, ctx, fakeEditor('SELECT 1;'));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.compare-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().session.chatDraftPrefill).toContain(c01.title);
  });

  it('escapes the user\'s own code rather than rendering it as markup', () => {
    const ctx = makeCtx();
    mountCompareView(root, ctx, fakeEditor('<img src=x>'));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    root.querySelector('.compare-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(root.querySelector('.compare-col-mine')?.querySelector('img')).toBeNull();
  });

  it('closes the panel again when a different challenge is opened', () => {
    const ctx = makeCtx();
    mountCompareView(root, ctx, fakeEditor('SELECT 1;'));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    root.querySelector('.compare-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '2.2');

    expect(root.querySelector('.compare-panel')?.classList.contains('open')).toBe(false);
  });
});

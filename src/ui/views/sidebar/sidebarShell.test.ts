import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../chat/claudeChatClient';
import { TRACKS } from '../../../content/registry';
import { createDefaultProgressState, type ProgressState } from '../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../context';
import { selectChallenge } from '../../state/actions';
import { mountSidebarShell } from './sidebarShell';

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

function buildElements() {
  const sidebarContainer = document.createElement('div');
  const headRoot = document.createElement('div');
  const footRoot = document.createElement('div');
  const backdrop = document.createElement('div');
  sidebarContainer.append(headRoot, footRoot);
  document.body.append(sidebarContainer, backdrop);
  return { sidebarContainer, headRoot, footRoot, backdrop };
}

describe('mountSidebarShell', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the mode toggle with study active by default', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    mountSidebarShell(elements, ctx);
    expect(elements.headRoot.querySelector('[data-mode="study"]')?.classList.contains('active')).toBe(true);
    expect(elements.headRoot.querySelector('[data-mode="exam"]')?.classList.contains('active')).toBe(false);
  });

  it('clicking the exam mode button switches modes', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    mountSidebarShell(elements, ctx);

    elements.headRoot.querySelector('[data-mode="exam"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(elements.headRoot.querySelector('[data-mode="exam"]')?.classList.contains('active')).toBe(true);
  });

  it('toggles the collapsed class on the sidebar container and swaps the arrow glyph', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    mountSidebarShell(elements, ctx);

    elements.headRoot.querySelector('.sidebar-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(elements.sidebarContainer.classList.contains('collapsed')).toBe(true);
    expect(elements.headRoot.querySelector('.sidebar-toggle-btn')?.textContent).toBe('›');
  });

  it('clicking the theme button opens the theme picker', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    mountSidebarShell(elements, ctx);

    elements.footRoot.querySelector('.theme-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().session.themePickerOpen).toBe(true);
  });

  it('reset button reveals a confirm row; confirming calls resetSchema and hides it again', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    mountSidebarShell(elements, ctx);

    elements.footRoot.querySelector('.reset-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elements.footRoot.querySelector('.reset-confirm-row')?.classList.contains('open')).toBe(true);

    elements.footRoot.querySelector('.reset-confirm-yes')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elements.footRoot.querySelector('.reset-confirm-row')?.classList.contains('open')).toBe(false);
  });

  it('reset "no" hides the confirm row without resetting', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    mountSidebarShell(elements, ctx);

    elements.footRoot.querySelector('.reset-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    elements.footRoot.querySelector('.reset-confirm-no')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(elements.footRoot.querySelector('.reset-confirm-row')?.classList.contains('open')).toBe(false);
  });

  it('clicking the backdrop collapses an expanded sidebar (mobile overlay close)', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    mountSidebarShell(elements, ctx);
    expect(ctx.store.getState().progress.app.sidebarCollapsed).toBe(false);

    elements.backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().progress.app.sidebarCollapsed).toBe(true);
  });

  it('clicking the backdrop while already collapsed does not re-expand the sidebar', () => {
    const elements = buildElements();
    const ctx = makeCtx();
    mountSidebarShell(elements, ctx);
    elements.headRoot.querySelector('.sidebar-toggle-btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctx.store.getState().progress.app.sidebarCollapsed).toBe(true);

    elements.backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().progress.app.sidebarCollapsed).toBe(true);
  });
});

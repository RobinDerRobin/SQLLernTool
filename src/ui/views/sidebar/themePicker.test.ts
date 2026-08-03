import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../chat/claudeChatClient';
import { TRACKS } from '../../../content/registry';
import { createDefaultProgressState, withAppSettings, type ProgressState } from '../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../persistence/ProgressStore';
import { THEMES } from '../../../theme/themes';
import { createAppContext, type AppContext, type EngineFactory } from '../../context';
import { toggleThemePicker } from '../../state/actions';
import { mountThemePicker } from './themePicker';

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

describe('mountThemePicker', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is closed initially', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    expect(root.querySelector('.theme-picker-overlay')?.classList.contains('open')).toBe(false);
  });

  it('opens when the session flag is set, listing every theme', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);
    expect(root.querySelector('.theme-picker-overlay')?.classList.contains('open')).toBe(true);
    expect(root.querySelectorAll('.theme-option')).toHaveLength(THEMES.length);
  });

  it('marks the currently active theme as selected', () => {
    const ctx = makeCtx(withAppSettings(createDefaultProgressState(), { theme: 'ocean-depth' }));
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);
    const selected = root.querySelector('.theme-option.selected');
    expect(selected?.getAttribute('data-theme-id')).toBe('ocean-depth');
  });

  it('clicking a theme option applies that theme', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    root.querySelector('[data-theme-id="retro-amber"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().progress.app.theme).toBe('retro-amber');
  });

  it('clicking the close button closes the picker', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    root.querySelector('.theme-picker-close')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().session.themePickerOpen).toBe(false);
  });

  it('clicking the backdrop closes the picker', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    root.querySelector('.theme-picker-overlay')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().session.themePickerOpen).toBe(false);
  });

  it('clicking inside the panel does not close the picker', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    root.querySelector('.theme-picker')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().session.themePickerOpen).toBe(true);
  });
});

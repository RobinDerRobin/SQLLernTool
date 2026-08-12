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
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")), getMainCSharp: () => null, ensureCSharpEngine: () => Promise.reject(new Error("csharp engine not available in this test fixture")) };
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

  it('pressing Escape closes the picker', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(ctx.store.getState().session.themePickerOpen).toBe(false);
  });

  it('pressing Escape while already closed is a no-op', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(ctx.store.getState().session.themePickerOpen).toBe(false);
  });

  it('stops listening for Escape after unmount', () => {
    const ctx = makeCtx();
    const unmount = mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);
    unmount();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(ctx.store.getState().session.themePickerOpen).toBe(true);
  });

  it('marks the active theme option with aria-pressed', () => {
    const ctx = makeCtx(withAppSettings(createDefaultProgressState(), { theme: 'ocean-depth' }));
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    expect(root.querySelector('[data-theme-id="ocean-depth"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-theme-id="retro-amber"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('has dialog semantics (role="dialog", aria-modal, labelled by its own title)', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    const panel = root.querySelector('.theme-picker');
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    const labelId = panel?.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toBe('Design wählen');
  });

  it('moves focus to the close button when opened', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    expect(document.activeElement).toBe(root.querySelector('.theme-picker-close'));
  });

  it('restores focus to whatever had it before opening, once closed', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();

    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);
    expect(document.activeElement).not.toBe(trigger);

    toggleThemePicker(ctx, false);
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab within the panel: Tab from the last focusable element wraps to the first', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    const panel = root.querySelector('.theme-picker')!;
    const focusable = panel.querySelectorAll<HTMLElement>('button');
    focusable[focusable.length - 1]!.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(focusable[0]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('traps Shift+Tab within the panel: Shift+Tab from the first focusable element wraps to the last', () => {
    const ctx = makeCtx();
    mountThemePicker(root, ctx);
    toggleThemePicker(ctx, true);

    const panel = root.querySelector('.theme-picker')!;
    const focusable = panel.querySelectorAll<HTMLElement>('button');
    focusable[0]!.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not intercept Tab when the picker is closed', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();

    const ctx = makeCtx();
    mountThemePicker(root, ctx);

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

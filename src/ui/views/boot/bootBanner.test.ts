import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../chat/claudeChatClient';
import { TRACKS } from '../../../content/registry';
import { createDefaultProgressState } from '../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../context';
import { withInitStatus } from '../../state/sessionState';
import { mountBootBanner } from './bootBanner';

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

describe('mountBootBanner', () => {
  let root: HTMLElement;
  let appShell: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    appShell = document.createElement('div');
    document.body.append(root, appShell);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows a loading message and dims the app while the engine loads', () => {
    const ctx = makeCtx();
    mountBootBanner(root, appShell, ctx);

    expect(root.textContent).toContain('SQLite-Engine wird geladen');
    expect(appShell.classList.contains('booting')).toBe(true);
  });

  it('clears the banner and undims once ready', () => {
    const ctx = makeCtx();
    mountBootBanner(root, appShell, ctx);

    ctx.store.update((s) => ({ ...s, session: withInitStatus(s.session, 'ready') }));

    expect(root.innerHTML).toBe('');
    expect(appShell.classList.contains('booting')).toBe(false);
  });

  it('shows the failure reason when the engine cannot load', () => {
    const ctx = makeCtx();
    mountBootBanner(root, appShell, ctx);

    ctx.store.update((s) => ({ ...s, session: withInitStatus(s.session, { error: 'CDN blockiert' }) }));

    expect(root.textContent).toContain('CDN blockiert');
    expect(root.querySelector('.loading-banner-error')).not.toBeNull();
  });

  it('escapes the error text', () => {
    const ctx = makeCtx();
    mountBootBanner(root, appShell, ctx);

    ctx.store.update((s) => ({ ...s, session: withInitStatus(s.session, { error: '<img src=x>' }) }));

    expect(root.querySelector('img')).toBeNull();
  });
});

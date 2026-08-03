import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../../chat/claudeChatClient';
import { TRACKS } from '../../../../content/registry';
import { createDefaultProgressState } from '../../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../../persistence/ProgressStore';
import { createAppContext, type AppContext, type EngineFactory } from '../../../context';
import { selectChallenge } from '../../../state/actions';
import { mountTablesPanel } from './tablesPanel';

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

describe('mountTablesPanel', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows an empty state when no tables exist yet', () => {
    const ctx = makeCtx();
    mountTablesPanel(root, ctx);
    expect(root.textContent).toContain('Noch keine Tabellen');
  });

  it('lists each table with its columns, their types, and the row count', () => {
    const ctx = makeCtx();
    mountTablesPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '5.2'); // setup creates zutaten/saucen

    const entries = root.querySelectorAll('.table-entry');
    expect(entries.length).toBeGreaterThan(0);
    const text = root.textContent ?? '';
    expect(text).toContain('zutaten');
    expect(text).toContain('TEXT');
    expect(text).toContain('3 Zeile');
  });

  it('marks tables materialized by the challenge\'s own setup as "vorgegeben"', () => {
    const ctx = makeCtx();
    mountTablesPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '5.2'); // setup creates zutaten/saucen, no solution run yet

    const badges = root.querySelectorAll('.t-given-badge');
    expect(badges.length).toBe(2); // zutaten + saucen, both from setup
  });

  it('does not mark a table the user\'s own solution creates as "vorgegeben"', () => {
    const ctx = makeCtx();
    mountTablesPanel(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01'); // no setup — challenge 01's own solution creates "users"
    expect(root.querySelectorAll('.t-given-badge').length).toBe(0);

    ctx.engines.getMain()!.exec('CREATE TABLE users (id INTEGER);');
    ctx.store.update((s) => ({ ...s, session: { ...s.session, tablesInfo: ctx.engines.getMain()!.getTablesInfo() } }));

    expect(root.querySelectorAll('.t-given-badge').length).toBe(0);
  });

  it('escapes table names', () => {
    const ctx = makeCtx();
    mountTablesPanel(root, ctx);
    ctx.store.update((s) => ({
      ...s,
      session: { ...s.session, tablesInfo: [{ name: '<img>', columns: [], rowCount: 0 }] },
    }));
    expect(root.querySelector('img')).toBeNull();
  });
});

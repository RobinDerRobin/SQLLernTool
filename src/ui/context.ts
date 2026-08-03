import type { ContentTrack } from '../content/registry';
import type { ClaudeChatClient } from '../chat/claudeChatClient';
import { createDefaultAppState, type AppState } from './state/appState';
import { createStore, type Store } from './state/store';
import type { ProgressStore } from '../persistence/ProgressStore';
import { createPyodideEngine, type PyodideInterface } from '../runtime/python/pyodideEngine';
import type { PythonRuntime } from '../runtime/python/PythonRuntime';
import { createSqlJsEngine, type SqlJsStatic } from '../runtime/sql/sqlJsEngine';
import type { SqlEngine } from '../runtime/sql/SqlEngine';

/**
 * Owns the shared "main" SQL engine (the one behind the currently open
 * challenge) plus the ability to mint fresh, throwaway engines (used by the
 * sidebar's play button, so checking another challenge's solution can never
 * disturb the main editing session). Both need the same `SqlJsStatic`, which
 * only becomes available once sql.js's WASM finishes loading — held here
 * rather than as a fixed AppContext field for exactly that reason.
 */
export interface EngineFactory {
  getMain(): SqlEngine | null;
  setMainFromSqlJs(SQL: SqlJsStatic): void;
  createDisposable(): SqlEngine;
  /** null until a Python-track challenge has triggered `ensurePythonEngine`. */
  getMainPython(): PythonRuntime | null;
  /**
   * Loads Pyodide (via `loadPyodide`, only once, cached thereafter) and
   * returns the resulting engine — Pyodide is deliberately not loaded at app
   * boot (~10 MB, several seconds) but only once a Python-track challenge is
   * actually opened. Python has no shared mutable interpreter state between
   * `exec()` calls (every run gets a fresh namespace, see PythonRuntime), so
   * unlike the SQL track there is no separate "disposable" engine — the main
   * engine is always safe to reuse for the sidebar's play-button check too.
   */
  ensurePythonEngine(loadPyodide: () => Promise<PyodideInterface>): Promise<PythonRuntime>;
}

export function createEngineFactory(): EngineFactory {
  let sqlStatic: SqlJsStatic | null = null;
  let main: SqlEngine | null = null;
  let mainPython: PythonRuntime | null = null;
  let pythonLoadPromise: Promise<PythonRuntime> | null = null;

  return {
    getMain: () => main,
    setMainFromSqlJs: (SQL: SqlJsStatic) => {
      sqlStatic = SQL;
      main = createSqlJsEngine(SQL);
    },
    createDisposable: () => {
      if (!sqlStatic) {
        throw new Error('Cannot create a disposable SQL engine before sql.js has finished loading.');
      }
      return createSqlJsEngine(sqlStatic);
    },
    getMainPython: () => mainPython,
    ensurePythonEngine: (loadPyodide: () => Promise<PyodideInterface>) => {
      if (mainPython) return Promise.resolve(mainPython);
      if (pythonLoadPromise) return pythonLoadPromise;
      pythonLoadPromise = loadPyodide()
        .then((pyodide) => {
          mainPython = createPyodideEngine(pyodide);
          return mainPython;
        })
        .catch((e) => {
          pythonLoadPromise = null;
          throw e;
        });
      return pythonLoadPromise;
    },
  };
}

export interface AppContext {
  store: Store<AppState>;
  progressStore: ProgressStore;
  chatClient: ClaudeChatClient;
  engines: EngineFactory;
  registry: Record<string, ContentTrack>;
}

export interface CreateAppContextDeps {
  progressStore: ProgressStore;
  chatClient: ClaudeChatClient;
  registry: Record<string, ContentTrack>;
}

export function createAppContext(deps: CreateAppContextDeps): AppContext {
  return {
    store: createStore<AppState>(createDefaultAppState(deps.progressStore.load())),
    progressStore: deps.progressStore,
    chatClient: deps.chatClient,
    engines: createEngineFactory(),
    registry: deps.registry,
  };
}

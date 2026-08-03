import { describe, expect, it, vi } from 'vitest';
import { createEngineFactory } from './context';
import type { SqlJsStatic } from '../runtime/sql/sqlJsEngine';

function fakeSqlJsStatic(): SqlJsStatic {
  return {
    Database: class {
      exec(): { columns: string[]; values: unknown[][] }[] {
        return [];
      }
      close(): void {}
    } as unknown as SqlJsStatic['Database'],
  };
}

describe('createEngineFactory', () => {
  it('has no main engine before setMainFromSqlJs() is called', () => {
    const factory = createEngineFactory();
    expect(factory.getMain()).toBeNull();
  });

  it('creates and stores a main engine from a SqlJsStatic', () => {
    const factory = createEngineFactory();
    factory.setMainFromSqlJs(fakeSqlJsStatic());
    expect(factory.getMain()).not.toBeNull();
  });

  it('throws creating a disposable engine before SQL has loaded', () => {
    const factory = createEngineFactory();
    expect(() => factory.createDisposable()).toThrow();
  });

  it('creates independent disposable engines once SQL is loaded, distinct from the main engine', () => {
    const factory = createEngineFactory();
    factory.setMainFromSqlJs(fakeSqlJsStatic());
    const disposable = factory.createDisposable();
    expect(disposable).not.toBe(factory.getMain());
  });

  it('has no main Python engine before ensurePythonEngine() resolves', () => {
    const factory = createEngineFactory();
    expect(factory.getMainPython()).toBeNull();
  });

  it('ensurePythonEngine() loads and caches the Python engine, calling the loader only once', async () => {
    const factory = createEngineFactory();
    const fakePyodide = { globals: { set: () => {} }, runPython: () => '{}' };
    const loader = vi.fn().mockResolvedValue(fakePyodide);

    const [first, second] = await Promise.all([factory.ensurePythonEngine(loader), factory.ensurePythonEngine(loader)]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(factory.getMainPython()).toBe(first);
  });

  it('ensurePythonEngine() allows retrying after a failed load', async () => {
    const factory = createEngineFactory();
    const failing = vi.fn().mockRejectedValue(new Error('CDN blocked'));
    await expect(factory.ensurePythonEngine(failing)).rejects.toThrow('CDN blocked');
    expect(factory.getMainPython()).toBeNull();

    const fakePyodide = { globals: { set: () => {} }, runPython: () => '{}' };
    const succeeding = vi.fn().mockResolvedValue(fakePyodide);
    const engine = await factory.ensurePythonEngine(succeeding);
    expect(engine).not.toBeNull();
  });
});

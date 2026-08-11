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

  it('has no main C# engine before ensureCSharpEngine() resolves', () => {
    const factory = createEngineFactory();
    expect(factory.getMainCSharp()).toBeNull();
  });

  it('ensureCSharpEngine() loads and caches the C# engine, calling the loader only once', async () => {
    const factory = createEngineFactory();
    const fakeExports = { RunCode: vi.fn().mockResolvedValue('{"stdout":"x = 4\\n","error":null}') };
    const loader = vi.fn().mockResolvedValue(fakeExports);

    const [first, second] = await Promise.all([factory.ensureCSharpEngine(loader), factory.ensureCSharpEngine(loader)]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(factory.getMainCSharp()).toBe(first);
  });

  it('ensureCSharpEngine() returns a working engine that delegates exec() to the loaded exports', async () => {
    const factory = createEngineFactory();
    const fakeExports = { RunCode: vi.fn().mockResolvedValue('{"stdout":"hallo\\n","error":null}') };
    const loader = vi.fn().mockResolvedValue(fakeExports);

    const engine = await factory.ensureCSharpEngine(loader);
    const result = await engine.exec('Console.WriteLine("hallo");');

    expect(result).toEqual({ stdout: 'hallo\n', error: null });
  });

  it('ensureCSharpEngine() allows retrying after a failed load', async () => {
    const factory = createEngineFactory();
    const failing = vi.fn().mockRejectedValue(new Error('Blazor-Skript blockiert'));
    await expect(factory.ensureCSharpEngine(failing)).rejects.toThrow('Blazor-Skript blockiert');
    expect(factory.getMainCSharp()).toBeNull();

    const fakeExports = { RunCode: vi.fn().mockResolvedValue('{"stdout":"","error":null}') };
    const succeeding = vi.fn().mockResolvedValue(fakeExports);
    const engine = await factory.ensureCSharpEngine(succeeding);
    expect(engine).not.toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlazorInterface, CSharpEngineExports } from './csharpEngine';
import { createCSharpEngine, loadCSharpEngineFromServer } from './csharpEngine';

function fakeExports(runCodeResult: string): CSharpEngineExports & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    RunCode: async (userCode: string) => {
      calls.push(userCode);
      return runCodeResult;
    },
  };
}

describe('createCSharpEngine', () => {
  it('exec() hands the code to RunCode and parses the driver JSON result', async () => {
    const json = JSON.stringify({ stdout: 'x = 4\n', error: null });
    const exports = fakeExports(json);
    const engine = createCSharpEngine(exports);

    const result = await engine.exec('int x = 2 + 2; Console.WriteLine($"x = {x}");');

    expect(exports.calls).toEqual(['int x = 2 + 2; Console.WriteLine($"x = {x}");']);
    expect(result).toEqual({ stdout: 'x = 4\n', error: null });
  });

  it('surfaces a compiler-diagnostic error unchanged', async () => {
    const json = JSON.stringify({ stdout: '', error: "(1,1): error CS0029: Cannot implicitly convert type 'string' to 'int'" });
    const engine = createCSharpEngine(fakeExports(json));

    const result = await engine.exec('int x = "not a number";');

    expect(result.error).toContain('CS0029');
  });

  it('reset() is a no-op that never throws (every exec() already compiles a fresh program)', () => {
    const engine = createCSharpEngine(fakeExports('{}'));
    expect(() => engine.reset()).not.toThrow();
    expect(engine.reset()).toBeUndefined();
  });
});

describe('loadCSharpEngineFromServer', () => {
  const originalBlazor = window.Blazor;

  beforeEach(() => {
    vi.resetModules();
    delete window.Blazor;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.Blazor = originalBlazor;
    document.body.innerHTML = '';
  });

  function installFakeBlazor(runCodeResult = '{}'): BlazorInterface & { started: boolean } {
    const blazor = {
      started: false,
      start: vi.fn().mockImplementation(async () => {
        blazor.started = true;
      }),
      runtime: {
        getAssemblyExports: vi.fn().mockResolvedValue({
          CSharpEngineBlazor: { CSharpEngine: fakeExports(runCodeResult) },
        }),
      },
    };
    return blazor;
  }

  it('reuses an already-loaded window.Blazor without injecting a script tag', async () => {
    window.Blazor = installFakeBlazor();

    const { loadCSharpEngineFromServer } = await import('./csharpEngine');
    const exports = await loadCSharpEngineFromServer('/csharp-engine/');

    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect(window.Blazor.start).toHaveBeenCalledTimes(1);
    expect(window.Blazor.runtime.getAssemblyExports).toHaveBeenCalledWith('CSharpEngineBlazor');
    expect(await exports.RunCode('irrelevant')).toBe('{}');
  });

  it('injects a script tag pointing at the given base URL and resolves once it loads', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    const script = document.querySelector('script')!;
    expect(script.src).toContain('/csharp-engine/_framework/blazor.webassembly.js');
    expect(script.getAttribute('autostart')).toBe('false');

    window.Blazor = installFakeBlazor();
    script.onload?.(new Event('load'));

    await expect(pending).resolves.toBeDefined();
  });

  it('rejects with a friendly German message when the Blazor script fails to load', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    document.querySelector('script')!.onerror?.(new Event('error'));

    await expect(pending).rejects.toThrow(/C#-Motor konnte nicht geladen werden/);
  });

  it('allows a retry after a failed load instead of staying stuck on the first rejection', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const firstAttempt = loadCSharpEngineFromServer('/csharp-engine/');
    document.querySelector('script')!.onerror?.(new Event('error'));
    await expect(firstAttempt).rejects.toThrow();

    const secondAttempt = loadCSharpEngineFromServer('/csharp-engine/');
    expect(document.querySelectorAll('script')).toHaveLength(2);
    window.Blazor = installFakeBlazor();
    document.querySelectorAll('script')[1]!.onload?.(new Event('load'));

    await expect(secondAttempt).resolves.toBeDefined();
  });

  it('shares one in-flight script load across concurrent callers', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const first = loadCSharpEngineFromServer('/csharp-engine/');
    const second = loadCSharpEngineFromServer('/csharp-engine/');
    expect(document.querySelectorAll('script')).toHaveLength(1);

    window.Blazor = installFakeBlazor();
    document.querySelector('script')!.onload?.(new Event('load'));

    await expect(Promise.all([first, second])).resolves.toBeDefined();
  });

  it('throws if the script loads but window.Blazor is still missing', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    document.querySelector('script')!.onload?.(new Event('load'));

    await expect(pending).rejects.toThrow(/C#-Motor wurde nicht geladen/);
  });
});

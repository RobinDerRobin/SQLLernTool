import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadPyodideFn, PyodideInterface } from './pyodideEngine';
import { createPyodideEngine } from './pyodideEngine';

function fakePyodide(runPythonResult: unknown): PyodideInterface & { setCalls: [string, unknown][] } {
  const setCalls: [string, unknown][] = [];
  return {
    setCalls,
    globals: {
      set: (name: string, value: unknown) => {
        setCalls.push([name, value]);
      },
    },
    runPython: () => runPythonResult,
  };
}

describe('createPyodideEngine', () => {
  it('exec() hands the code to Pyodide as a global and parses the driver JSON result', () => {
    const json = JSON.stringify({ stdout: 'hi\n', variables: { x: 1 }, error: null });
    const pyodide = fakePyodide(json);
    const engine = createPyodideEngine(pyodide);

    const result = engine.exec("print('hi')\nx = 1");

    expect(pyodide.setCalls).toEqual([['__user_code__', "print('hi')\nx = 1"]]);
    expect(result).toEqual({ stdout: 'hi\n', variables: { x: 1 }, error: null });
  });

  it('exec() passes the driver script (not the user code) to runPython', () => {
    const runPython = vi.fn().mockReturnValue(JSON.stringify({ stdout: '', variables: {}, error: null }));
    const pyodide: PyodideInterface = { globals: { set: () => {} }, runPython };
    createPyodideEngine(pyodide).exec('this is not valid python but never reaches runPython as a string');

    expect(runPython).toHaveBeenCalledTimes(1);
    const driverScript = runPython.mock.calls[0]![0] as string;
    expect(driverScript).toContain('__user_code__');
    expect(driverScript).toContain('exec(__user_code__, _ns)');
    expect(driverScript).not.toContain('this is not valid python');
  });

  it('surfaces a driver-reported Python error unchanged', () => {
    const json = JSON.stringify({ stdout: '', variables: {}, error: 'Traceback (most recent call last):\n...' });
    const engine = createPyodideEngine(fakePyodide(json));

    const result = engine.exec('raise ValueError()');

    expect(result.error).toContain('Traceback');
  });

  it('reset() is a no-op that never throws (every exec() already runs in a fresh namespace)', () => {
    const engine = createPyodideEngine(fakePyodide('{}'));
    expect(() => engine.reset()).not.toThrow();
    expect(engine.reset()).toBeUndefined();
  });
});

describe('loadPyodideFromCdn', () => {
  const originalLoadPyodide = window.loadPyodide;

  beforeEach(() => {
    vi.resetModules();
    delete window.loadPyodide;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.loadPyodide = originalLoadPyodide;
    document.body.innerHTML = '';
  });

  it('reuses an already-loaded window.loadPyodide without injecting a script tag', async () => {
    const loadPyodide: LoadPyodideFn = vi.fn().mockResolvedValue({ globals: { set: () => {} }, runPython: () => '{}' });
    window.loadPyodide = loadPyodide;

    const { loadPyodideFromCdn } = await import('./pyodideEngine');
    await loadPyodideFromCdn();

    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect(loadPyodide).toHaveBeenCalledWith({ indexURL: expect.stringContaining('cdn.jsdelivr.net/pyodide/') });
  });

  it('injects a script tag pointing at the pyodide CDN and resolves once it loads', async () => {
    const { loadPyodideFromCdn } = await import('./pyodideEngine');

    const pending = loadPyodideFromCdn();
    const script = document.querySelector('script')!;
    expect(script.src).toContain('pyodide.js');

    window.loadPyodide = vi.fn().mockResolvedValue({ globals: { set: () => {} }, runPython: () => '{}' });
    script.onload?.(new Event('load'));

    await expect(pending).resolves.toBeDefined();
  });

  it('rejects with a friendly German message when the CDN script fails to load', async () => {
    const { loadPyodideFromCdn } = await import('./pyodideEngine');

    const pending = loadPyodideFromCdn();
    const script = document.querySelector('script')!;
    script.onerror?.(new Event('error'));

    await expect(pending).rejects.toThrow(/Pyodide konnte nicht geladen werden/);
  });

  it('allows a retry after a failed load instead of staying stuck on the first rejection', async () => {
    const { loadPyodideFromCdn } = await import('./pyodideEngine');

    const firstAttempt = loadPyodideFromCdn();
    document.querySelector('script')!.onerror?.(new Event('error'));
    await expect(firstAttempt).rejects.toThrow();

    const secondAttempt = loadPyodideFromCdn();
    expect(document.querySelectorAll('script')).toHaveLength(2);
    window.loadPyodide = vi.fn().mockResolvedValue({ globals: { set: () => {} }, runPython: () => '{}' });
    document.querySelectorAll('script')[1]!.onload?.(new Event('load'));

    await expect(secondAttempt).resolves.toBeDefined();
  });

  it('shares one in-flight script load across concurrent callers', async () => {
    const { loadPyodideFromCdn } = await import('./pyodideEngine');

    const first = loadPyodideFromCdn();
    const second = loadPyodideFromCdn();
    expect(document.querySelectorAll('script')).toHaveLength(1);

    window.loadPyodide = vi.fn().mockResolvedValue({ globals: { set: () => {} }, runPython: () => '{}' });
    document.querySelector('script')!.onload?.(new Event('load'));

    await expect(Promise.all([first, second])).resolves.toBeDefined();
  });

  it('throws if the script loads but window.loadPyodide is still missing', async () => {
    const { loadPyodideFromCdn } = await import('./pyodideEngine');

    const pending = loadPyodideFromCdn();
    document.querySelector('script')!.onload?.(new Event('load'));

    await expect(pending).rejects.toThrow(/Pyodide wurde nicht geladen/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCSharpEngine, loadCSharpEngineFromServer } from './csharpEngine';

function fakeExports(runCodeResult: string) {
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
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function getIframes(): HTMLIFrameElement[] {
    return Array.from(document.querySelectorAll('iframe'));
  }

  /** Simulates the iframe's own host.html posting a message back to the parent (this test). */
  function postFromIframe(iframe: HTMLIFrameElement, data: unknown) {
    window.dispatchEvent(
      new MessageEvent('message', { data, origin: window.location.origin, source: iframe.contentWindow }),
    );
  }

  it('creates a hidden iframe pointed at baseUrl + host.html', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    const [iframe] = getIframes();

    expect(getIframes()).toHaveLength(1);
    expect(iframe!.src).toContain('/csharp-engine/host.html');
    expect(iframe!.style.display).toBe('none');

    postFromIframe(iframe!, { type: 'csharp-host-ready' });
    await expect(pending).resolves.toBeDefined();
  });

  it('ignores messages from an unrelated window (origin/source mismatch)', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'csharp-host-ready' }, origin: 'https://evil.example', source: null }),
    );

    const [iframe] = getIframes();
    postFromIframe(iframe!, { type: 'csharp-host-ready' });
    await expect(pending).resolves.toBeDefined();
  });

  it('resolved exports RunCode() round-trips through postMessage, matched by request id', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    const [iframe] = getIframes();
    postFromIframe(iframe!, { type: 'csharp-host-ready' });
    const exports = await pending;

    const postMessageSpy = vi.spyOn(iframe!.contentWindow!, 'postMessage');
    const runPromise = exports.RunCode('Console.WriteLine(1);');

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const [sentMessage, targetOrigin] = postMessageSpy.mock.calls[0]!;
    expect(sentMessage).toMatchObject({ type: 'csharp-run', code: 'Console.WriteLine(1);' });
    expect(targetOrigin).toBe(window.location.origin);

    postFromIframe(iframe!, {
      type: 'csharp-result',
      id: (sentMessage as { id: string }).id,
      json: '{"stdout":"1\\n","error":null}',
    });

    await expect(runPromise).resolves.toBe('{"stdout":"1\\n","error":null}');
  });

  it('RunCode() rejects when the host reports a runtime error for that request', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    const [iframe] = getIframes();
    postFromIframe(iframe!, { type: 'csharp-host-ready' });
    const exports = await pending;

    const postMessageSpy = vi.spyOn(iframe!.contentWindow!, 'postMessage');
    const runPromise = exports.RunCode('boom');
    const [sentMessage] = postMessageSpy.mock.calls[0]!;

    postFromIframe(iframe!, { type: 'csharp-result', id: (sentMessage as { id: string }).id, error: 'kaboom' });

    await expect(runPromise).rejects.toThrow('kaboom');
  });

  it('rejects with a friendly German message when the host reports a boot error', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    const [iframe] = getIframes();
    postFromIframe(iframe!, { type: 'csharp-boot-error', message: 'Failed to start platform' });

    await expect(pending).rejects.toThrow(/C#-Motor konnte nicht gestartet werden/);
  });

  it('rejects with a friendly German message when the iframe itself fails to load', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    const [iframe] = getIframes();
    iframe!.onerror?.(new Event('error'));

    await expect(pending).rejects.toThrow(/C#-Motor konnte nicht geladen werden/);
  });

  it('rejects fast (without waiting on the iframe) when a HEAD check shows host.html is not deployed here', async () => {
    const headSpy = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', headSpy);
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');

    await expect(pending).rejects.toThrow(/nicht bereitgestellt/);
    expect(headSpy).toHaveBeenCalledWith('/csharp-engine/host.html', { method: 'HEAD' });
  });

  it('does not reject on a network-level failure of the HEAD check itself — falls through to the iframe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    await Promise.resolve();
    await Promise.resolve();
    postFromIframe(getIframes()[0]!, { type: 'csharp-host-ready' });

    await expect(pending).resolves.toBeDefined();
  });

  it('allows a retry after a failed load instead of staying stuck on the first rejection', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const first = loadCSharpEngineFromServer('/csharp-engine/');
    getIframes()[0]!.onerror?.(new Event('error'));
    await expect(first).rejects.toThrow();

    const second = loadCSharpEngineFromServer('/csharp-engine/');
    const iframes = getIframes();
    expect(iframes).toHaveLength(2);
    postFromIframe(iframes[1]!, { type: 'csharp-host-ready' });

    await expect(second).resolves.toBeDefined();
  });

  it('shares one in-flight iframe load across concurrent callers', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const first = loadCSharpEngineFromServer('/csharp-engine/');
    const second = loadCSharpEngineFromServer('/csharp-engine/');
    expect(getIframes()).toHaveLength(1);

    postFromIframe(getIframes()[0]!, { type: 'csharp-host-ready' });

    await expect(Promise.all([first, second])).resolves.toBeDefined();
  });

  it('once resolved, keeps returning the same exports without creating another iframe', async () => {
    const { loadCSharpEngineFromServer } = await import('./csharpEngine');

    const pending = loadCSharpEngineFromServer('/csharp-engine/');
    postFromIframe(getIframes()[0]!, { type: 'csharp-host-ready' });
    const first = await pending;

    const second = await loadCSharpEngineFromServer('/csharp-engine/');

    expect(second).toBe(first);
    expect(getIframes()).toHaveLength(1);
  });
});

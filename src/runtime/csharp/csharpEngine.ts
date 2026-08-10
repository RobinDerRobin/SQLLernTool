import type { CSharpExecResult, CSharpRuntime } from './CSharpRuntime';

/** The `[JSExport]`-ed static method this project's Blazor project exposes — see `csharp-engine/CSharpEngine.cs`. */
export interface CSharpEngineExports {
  RunCode(userCode: string): Promise<string>;
}

interface CSharpRunMessage {
  type: 'csharp-run';
  id: string;
  code: string;
}

type CSharpHostMessage =
  | { type: 'csharp-host-ready' }
  | { type: 'csharp-boot-error'; message: string }
  | { type: 'csharp-result'; id: string; json: string }
  | { type: 'csharp-result'; id: string; error: string };

function isCSharpHostMessage(data: unknown): data is CSharpHostMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as { type: unknown }).type === 'string' &&
    (data as { type: string }).type.startsWith('csharp-')
  );
}

/**
 * `RunCode` proxy that talks to the already-booted iframe via `postMessage`, matching request
 * `id`s to responses. One instance per iframe, created once `csharp-host-ready` arrives.
 */
function createIframeExports(iframe: HTMLIFrameElement): CSharpEngineExports {
  let nextId = 0;
  const pending = new Map<string, { resolve: (json: string) => void; reject: (err: Error) => void }>();

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== iframe.contentWindow) return;
    const data: unknown = event.data;
    if (!isCSharpHostMessage(data) || data.type !== 'csharp-result') return;
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if ('error' in data) entry.reject(new Error(data.error));
    else entry.resolve(data.json);
  });

  return {
    RunCode: (userCode: string) =>
      new Promise<string>((resolve, reject) => {
        const id = String(nextId++);
        pending.set(id, { resolve, reject });
        const message: CSharpRunMessage = { type: 'csharp-run', id, code: userCode };
        iframe.contentWindow!.postMessage(message, window.location.origin);
      }),
  };
}

let iframeLoadPromise: Promise<CSharpEngineExports> | null = null;

/**
 * Loads the C# engine lazily from `baseUrl` (a same-origin path serving the published
 * `csharp-engine/` output — see `docs/csharp-engine-poc.md` for the COOP/COEP hosting
 * requirement and why there is no public CDN for this custom bundle, unlike sql.js/Pyodide) by
 * creating a hidden iframe pointed at `${baseUrl}host.html` and waiting for it to boot Blazor and
 * signal readiness.
 *
 * Hosted in a dedicated iframe rather than injected into the current document: Blazor's own core
 * loader resolves its asset paths from the *hosting document's* `document.baseURI`, not from
 * wherever the `blazor.webassembly.js` script tag itself was loaded from — confirmed empirically
 * (see docs/csharp-engine-poc.md, 2026-08-10). The main app's document has no `<base>` tag
 * matching `baseUrl`, so booting Blazor directly into it would 404 fetching its own runtime
 * assets. `host.html` has no `<base>` tag either, deliberately — its `document.baseURI` correctly
 * defaults to wherever it was actually navigated to (`${baseUrl}host.html`), so this works
 * regardless of what `baseUrl` turns out to be.
 */
export function loadCSharpEngineFromServer(baseUrl: string): Promise<CSharpEngineExports> {
  if (iframeLoadPromise) return iframeLoadPromise;
  iframeLoadPromise = new Promise<CSharpEngineExports>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `${baseUrl}host.html`;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe.contentWindow) return;
      const data: unknown = event.data;
      if (!isCSharpHostMessage(data)) return;
      if (data.type === 'csharp-host-ready') {
        window.removeEventListener('message', onMessage);
        resolve(createIframeExports(iframe));
      } else if (data.type === 'csharp-boot-error') {
        window.removeEventListener('message', onMessage);
        iframeLoadPromise = null;
        reject(new Error(`Der C#-Motor konnte nicht gestartet werden: ${data.message}`));
      }
    };
    window.addEventListener('message', onMessage);

    iframe.onerror = () => {
      window.removeEventListener('message', onMessage);
      iframeLoadPromise = null;
      reject(new Error('Der C#-Motor konnte nicht geladen werden — das iframe wurde blockiert.'));
    };

    document.body.appendChild(iframe);
  });
  return iframeLoadPromise;
}

/** Browser CSharpRuntime adapter over the iframe-hosted `RunCode` entry point. */
export function createCSharpEngine(exports: CSharpEngineExports): CSharpRuntime {
  async function exec(code: string): Promise<CSharpExecResult> {
    const raw = await exports.RunCode(code);
    return JSON.parse(raw) as CSharpExecResult;
  }

  function reset(): void {
    // Every exec() already compiles and runs a brand-new console program —
    // there is no cross-run state to clear, same as the Python adapter.
  }

  return { exec, reset };
}

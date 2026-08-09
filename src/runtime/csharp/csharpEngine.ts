import type { CSharpExecResult, CSharpRuntime } from './CSharpRuntime';

/** Minimal slice of Blazor's global boot API this adapter relies on. */
export interface BlazorInterface {
  start(): Promise<void>;
  runtime: {
    getAssemblyExports(assemblyName: string): Promise<unknown>;
  };
}

declare global {
  interface Window {
    Blazor?: BlazorInterface;
  }
}

/** The `[JSExport]`-ed static method this project's Blazor project exposes — see `csharp-engine/CSharpEngine.cs`. */
export interface CSharpEngineExports {
  RunCode(userCode: string): Promise<string>;
}

const ASSEMBLY_NAME = 'CSharpEngineBlazor';

let scriptLoadPromise: Promise<void> | null = null;

function loadBlazorScript(baseUrl: string): Promise<void> {
  if (window.Blazor) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${baseUrl}_framework/blazor.webassembly.js`;
    script.setAttribute('autostart', 'false');
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Der C#-Motor konnte nicht geladen werden — das Blazor-Skript fehlt oder wurde blockiert.'));
    };
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Loads the Blazor WebAssembly + Roslyn engine lazily from `baseUrl` (a
 * same-origin path serving the published `csharp-engine/` output — see
 * `docs/csharp-engine-poc.md` for the COOP/COEP hosting requirement and why
 * there is no public CDN for this custom bundle, unlike sql.js/Pyodide),
 * boots it, and returns the raw `[JSExport]`-ed `RunCode` entry point.
 */
export async function loadCSharpEngineFromServer(baseUrl: string): Promise<CSharpEngineExports> {
  await loadBlazorScript(baseUrl);
  if (!window.Blazor) {
    throw new Error('Der C#-Motor wurde nicht geladen — das Blazor-Skript fehlt oder wurde blockiert.');
  }
  await window.Blazor.start();
  const exports = (await window.Blazor.runtime.getAssemblyExports(ASSEMBLY_NAME)) as Record<
    string,
    { CSharpEngine: CSharpEngineExports }
  >;
  return exports[ASSEMBLY_NAME]!.CSharpEngine;
}

/** Browser CSharpRuntime adapter over the Blazor WASM `RunCode` entry point. */
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

import type { PythonExecResult, PythonRuntime } from './PythonRuntime';

/** Minimal slice of Pyodide's public API this adapter relies on. */
export interface PyodideInterface {
  globals: { set(name: string, value: unknown): void };
  runPython(code: string): unknown;
}

export type LoadPyodideFn = (options?: { indexURL?: string }) => Promise<PyodideInterface>;

declare global {
  interface Window {
    loadPyodide?: LoadPyodideFn;
  }
}

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let scriptLoadPromise: Promise<void> | null = null;

function loadPyodideScript(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PYODIDE_CDN_BASE}pyodide.js`;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Pyodide konnte nicht geladen werden — das CDN-Skript fehlt oder wurde blockiert.'));
    };
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Loads Pyodide lazily from a CDN, exactly like `sql-wasm.js` is loaded for
 * the SQL track — except the `<script>` tag is injected at runtime instead
 * of being present in index.html from the start, so the ~10 MB WASM payload
 * is only ever fetched once a Python-track challenge is actually opened.
 */
export async function loadPyodideFromCdn(): Promise<PyodideInterface> {
  await loadPyodideScript();
  if (!window.loadPyodide) {
    throw new Error('Pyodide wurde nicht geladen — das CDN-Skript fehlt oder wurde blockiert.');
  }
  return window.loadPyodide({ indexURL: PYODIDE_CDN_BASE });
}

/**
 * The driver script run around every user submission: executes the user's
 * code (passed in via a Pyodide global, not string-interpolated, so no
 * escaping hazard) in a fresh namespace with stdout redirected, then leaves
 * a JSON string as its last expression's value — Pyodide's `runPython`
 * returns whatever the final expression evaluates to, so no print/stdout
 * interception of the driver's own output is needed here (unlike the Node
 * test engine, which has no such "return the last expression" mechanism and
 * has to print its result instead).
 */
const DRIVER_SCRIPT = `
import io, json, contextlib, traceback

_ns = {}
_buf = io.StringIO()
_error = None
try:
    with contextlib.redirect_stdout(_buf):
        exec(__user_code__, _ns)
except Exception:
    _error = traceback.format_exc()

def _is_json_safe(v):
    return isinstance(v, (int, float, str, bool, list, tuple, dict, type(None)))

_variables = {k: v for k, v in _ns.items() if not k.startswith('__') and _is_json_safe(v)}
json.dumps({"stdout": _buf.getvalue(), "variables": _variables, "error": _error})
`;

/** Browser PythonRuntime adapter over Pyodide (CPython compiled to WebAssembly). */
export function createPyodideEngine(pyodide: PyodideInterface): PythonRuntime {
  function exec(code: string): PythonExecResult {
    pyodide.globals.set('__user_code__', code);
    const raw = pyodide.runPython(DRIVER_SCRIPT);
    return JSON.parse(raw as string) as PythonExecResult;
  }

  function reset(): void {
    // Every exec() already runs in a brand-new namespace — there is no
    // cross-run state to clear for this first, prereq-free Python course.
  }

  return { exec, reset };
}

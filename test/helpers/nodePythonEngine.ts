import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PythonExecResult, PythonRuntime } from '../../src/runtime/python/PythonRuntime';

const PYTHON_BIN = process.env.PYTHON_BIN ?? 'python3';

/**
 * The driver script run around every user submission (see also
 * pyodideEngine.ts's DRIVER_SCRIPT, which does the same job for the browser
 * engine but returns its result instead of printing it — Python subprocesses
 * have no "return the last expression" mechanism, only stdout). The user's
 * code is written to its own temp file and read from disk here (a raw
 * string path, not string-interpolated user code) specifically to avoid any
 * quoting/escaping hazard from embedding arbitrary user source in a string
 * literal.
 */
function buildDriverScript(userCodePath: string): string {
  const escapedPath = userCodePath.replace(/\\/g, '\\\\');
  return `
import io, json, contextlib, traceback

with open("${escapedPath}", encoding="utf-8") as _f:
    _src = _f.read()

_ns = {}
_buf = io.StringIO()
_error = None
try:
    with contextlib.redirect_stdout(_buf):
        exec(_src, _ns)
except Exception:
    _error = traceback.format_exc()

def _is_json_safe(v):
    return isinstance(v, (int, float, str, bool, list, tuple, dict, type(None)))

_variables = {k: v for k, v in _ns.items() if not k.startswith('__') and _is_json_safe(v)}
print(json.dumps({"stdout": _buf.getvalue(), "variables": _variables, "error": _error}))
`;
}

/**
 * Test-only PythonRuntime backed by a real `python3` subprocess per `exec()`
 * call — behind the exact same interface the browser's Pyodide adapter
 * implements. Chosen over running Pyodide-in-jsdom because it's fast and
 * this machine already has Python installed; see src/runtime/python/README.md
 * for the tradeoff this accepts (a machine dependency `npm test` did not
 * previously have).
 */
export function createNodePythonEngine(): PythonRuntime {
  function exec(code: string): PythonExecResult {
    const dir = mkdtempSync(join(tmpdir(), 'py-challenge-'));
    try {
      const userCodePath = join(dir, 'user_code.py');
      const driverPath = join(dir, 'driver.py');
      writeFileSync(userCodePath, code, 'utf-8');
      writeFileSync(driverPath, buildDriverScript(userCodePath), 'utf-8');

      const result = spawnSync(PYTHON_BIN, [driverPath], { encoding: 'utf-8' });
      if (result.error) {
        throw new Error(
          `Konnte "${PYTHON_BIN}" nicht ausführen (${result.error.message}). Ist Python installiert und im PATH?`,
        );
      }
      const stdout = result.stdout.trim();
      if (!stdout) {
        return {
          stdout: '',
          variables: {},
          error: result.stderr || `python3 beendete sich mit Code ${String(result.status)} ohne Ausgabe.`,
        };
      }
      return JSON.parse(stdout) as PythonExecResult;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  function reset(): void {
    // Every exec() spawns a fresh interpreter — nothing to clear between runs.
  }

  return { exec, reset };
}

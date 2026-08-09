import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CSharpExecResult, CSharpRuntime } from '../../src/runtime/csharp/CSharpRuntime';

const DOTNET_BIN = process.env.DOTNET_BIN ?? 'dotnet';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIVER_PROJECT_DIR = join(__dirname, '../../csharp-engine/driver');
const DRIVER_DLL = join(DRIVER_PROJECT_DIR, 'bin/Release/net8.0/CSharpDriver.dll');

/**
 * Builds the desktop-.NET driver (see csharp-engine/driver/Program.cs) once, the first time it's
 * needed. Unlike nodePythonEngine.ts (which shells out to an already-installed `python3`
 * directly), C# needs a compile step of its own first — but only once per checkout, since
 * `dotnet exec` against the already-built .dll on every subsequent exec() is fast (no restore,
 * no rebuild).
 */
function ensureDriverBuilt(): void {
  if (existsSync(DRIVER_DLL)) return;
  const result = spawnSync(DOTNET_BIN, ['build', '-c', 'Release'], {
    cwd: DRIVER_PROJECT_DIR,
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error(
      `Konnte den C#-Test-Treiber nicht bauen (dotnet build in ${DRIVER_PROJECT_DIR} schlug fehl):\n${result.stdout}\n${result.stderr}`,
    );
  }
}

/**
 * Test-only CSharpRuntime backed by a real `dotnet exec` subprocess per `exec()` call, running
 * csharp-engine/driver — a desktop-.NET twin of csharp-engine/CSharpEngine.cs's compile-and-run
 * step (see that file for why CSharpCompilation is used instead of the Scripting API). Exists so
 * C# content can be verified against a real Roslyn compiler in Node/CI the same rigorous way
 * SQL (nodeSqliteEngine.ts) and Python (nodePythonEngine.ts) content already is, without paying
 * for a real browser + Blazor + WASM runtime in every test run.
 */
export function createNodeCSharpEngine(): CSharpRuntime {
  async function exec(code: string): Promise<CSharpExecResult> {
    ensureDriverBuilt();
    const dir = mkdtempSync(join(tmpdir(), 'cs-challenge-'));
    try {
      const userCodePath = join(dir, 'UserCode.cs');
      writeFileSync(userCodePath, code, 'utf-8');

      const result = spawnSync(DOTNET_BIN, ['exec', DRIVER_DLL, userCodePath], {
        encoding: 'utf-8',
        cwd: dir,
      });
      if (result.error) {
        throw new Error(
          `Konnte "${DOTNET_BIN}" nicht ausführen (${result.error.message}). Ist das .NET SDK installiert und im PATH?`,
        );
      }
      const stdout = result.stdout.trim();
      if (!stdout) {
        return {
          stdout: '',
          error: result.stderr || `dotnet exec beendete sich mit Code ${String(result.status)} ohne Ausgabe.`,
        };
      }
      return JSON.parse(stdout) as CSharpExecResult;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  function reset(): void {
    // Every exec() runs a fresh compile+invoke — nothing to clear between runs.
  }

  return { exec, reset };
}

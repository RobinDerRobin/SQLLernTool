import type { Runtime } from '../Runtime';

export interface CSharpExecResult {
  /** Everything the user's code wrote via Console.WriteLine/Console.Write. */
  stdout: string;
  /** Reserved for a future validate() design (see docs/csharp-engine-poc.md, step 4) — always null for now. */
  result: string | null;
  /** The compiler's error diagnostics (joined) or an unhandled exception's ToString(), otherwise null. */
  error: string | null;
}

/**
 * C#-track execution engine. Like PythonRuntime and unlike SqlEngine, there
 * is no persistent session state to inspect after the fact: `exec` compiles
 * and runs the given source as a fresh console program each time and reports
 * what happened via stdout/error, mirroring the `{stdout, error}` shape
 * `CSharpEngine.RunCode` (see `csharp-engine/CSharpEngine.cs`) already
 * returns as JSON.
 */
export interface CSharpRuntime extends Runtime {
  exec(code: string): Promise<CSharpExecResult>;
}

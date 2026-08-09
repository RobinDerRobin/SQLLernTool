import type { Runtime } from '../Runtime';

export interface CSharpExecResult {
  /**
   * Everything the user's code wrote via Console.WriteLine/Console.Write —
   * the sole basis for validate() (see docs/csharp-engine-poc.md, step 4:
   * C# has no equivalent of Python's post-exec namespace dict, since a
   * compiled Program's locals aren't reflectable after Main returns, so
   * content is written to print its answer rather than leave it in a
   * variable).
   */
  stdout: string;
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

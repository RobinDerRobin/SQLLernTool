/**
 * Minimal contract every track's execution engine must satisfy, regardless of
 * language. Track-specific engines (SqlEngine, later a PythonEngine/CSharpEngine)
 * extend this with their own execution methods — there is deliberately no shared
 * "run code, get output" shape imposed here, because SQL/Python/C# result shapes
 * are genuinely different, and forcing a common one would leak into every track.
 */
export interface Runtime {
  /** Clears all engine-held state (tables, variables, session, ...) back to empty. */
  reset(): void;
}

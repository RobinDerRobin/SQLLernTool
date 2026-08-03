import type { Runtime } from '../Runtime';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PythonExecResult {
  /** Everything the user's code printed via print(), captured separately from the driver's own output. */
  stdout: string;
  /** Every JSON-serializable top-level name left in the script's namespace after it ran (functions/modules excluded). */
  variables: Record<string, JsonValue>;
  /** A formatted Python traceback if the script raised, otherwise null. */
  error: string | null;
}

/**
 * Python-track execution engine. Unlike SqlEngine, there is no persistent
 * session state to inspect after the fact — `exec` always runs the given
 * code in a fresh interpreter namespace and reports what happened via stdout
 * + the resulting variables, mirroring how SQL validation inspects database
 * state but for a language with no equivalent "tables" concept.
 */
export interface PythonRuntime extends Runtime {
  exec(code: string): PythonExecResult;
}

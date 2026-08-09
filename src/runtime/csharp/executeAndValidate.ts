import type { ValidateResult } from '../../domain/challenge.types';
import type { CSharpExecResult, CSharpRuntime } from './CSharpRuntime';

export interface CSharpExecuteAndValidateOutcome {
  ok: boolean;
  message: string;
  error: string | null;
  result: CSharpExecResult | null;
}

/**
 * Runs one C# snippet against an engine and validates the outcome. Same
 * shape as the Python track's executeAndValidate (a challenge is always a
 * single, self-contained program run fresh each time), except `exec` is
 * async here — compiling and invoking real Roslyn-generated IL, whether via
 * the Node driver (test/helpers/nodeCSharpEngine.ts) or the browser's Blazor
 * WASM engine, is never synchronous the way sql.js/CPython subprocess calls
 * are.
 */
export async function executeAndValidate(
  engine: CSharpRuntime,
  code: string,
  validate: (engine: CSharpRuntime, lastResult: CSharpExecResult | null) => ValidateResult,
): Promise<CSharpExecuteAndValidateOutcome> {
  const result = await engine.exec(code);

  if (result.error) {
    return { ok: false, error: result.error, message: '', result };
  }

  let validation: ValidateResult = { ok: true, message: '' };
  try {
    validation = validate(engine, result);
  } catch {
    validation = { ok: false, message: 'Die Erfolgsprüfung konnte nicht durchgeführt werden.' };
  }
  return { ok: validation.ok, message: validation.message, error: null, result };
}

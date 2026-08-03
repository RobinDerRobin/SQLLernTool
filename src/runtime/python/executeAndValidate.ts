import type { ValidateResult } from '../../domain/challenge.types';
import type { PythonExecResult, PythonRuntime } from './PythonRuntime';

export interface PythonExecuteAndValidateOutcome {
  ok: boolean;
  message: string;
  error: string | null;
  result: PythonExecResult | null;
}

/**
 * Runs one Python script against an engine and validates the outcome.
 * Unlike the SQL track there is no statement splitting or idempotent
 * table-dropping to do first — a Python challenge is always a single,
 * self-contained script run in a fresh namespace, so this is just
 * "exec once, then validate if it didn't raise".
 */
export function executeAndValidate(
  engine: PythonRuntime,
  code: string,
  validate: (engine: PythonRuntime, lastResult: PythonExecResult | null) => ValidateResult,
): PythonExecuteAndValidateOutcome {
  const result = engine.exec(code);

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

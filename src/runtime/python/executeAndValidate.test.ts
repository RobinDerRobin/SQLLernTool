import { describe, expect, it } from 'vitest';
import { createNodePythonEngine } from '../../../test/helpers/nodePythonEngine';
import { executeAndValidate } from './executeAndValidate';

describe('executeAndValidate (python)', () => {
  it('runs the code, tracks the result, and reports a passing validation', () => {
    const engine = createNodePythonEngine();
    const outcome = executeAndValidate(engine, "print('hi')", () => ({ ok: true, message: 'yay' }));
    expect(outcome.error).toBeNull();
    expect(outcome.ok).toBe(true);
    expect(outcome.message).toBe('yay');
    expect(outcome.result?.stdout).toBe('hi\n');
  });

  it('reports a Python exception and never calls validate', () => {
    const engine = createNodePythonEngine();
    let validateCalled = false;
    const outcome = executeAndValidate(engine, 'raise ValueError("nope")', () => {
      validateCalled = true;
      return { ok: true, message: '' };
    });
    expect(outcome.error).toContain('ValueError');
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toBe('');
    expect(validateCalled).toBe(false);
  });

  it('passes the engine and the exec result through to validate', () => {
    const engine = createNodePythonEngine();
    let receivedResult: unknown;
    executeAndValidate(engine, 'answer = 42', (_engine, lastResult) => {
      receivedResult = lastResult;
      return { ok: true, message: '' };
    });
    expect(receivedResult).toMatchObject({ variables: { answer: 42 } });
  });

  it('catches a validate() that throws and returns a generic failure instead of crashing', () => {
    const engine = createNodePythonEngine();
    const outcome = executeAndValidate(engine, 'x = 1', () => {
      throw new Error('boom');
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBeNull();
    expect(outcome.message).toContain('nicht durchgeführt werden');
  });
});

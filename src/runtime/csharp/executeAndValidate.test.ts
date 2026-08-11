import { describe, expect, it } from 'vitest';
import { createNodeCSharpEngine } from '../../../test/helpers/nodeCSharpEngine';
import { executeAndValidate } from './executeAndValidate';

describe('executeAndValidate (csharp)', () => {
  it('runs the code, tracks the result, and reports a passing validation', async () => {
    const engine = createNodeCSharpEngine();
    const outcome = await executeAndValidate(engine, 'Console.WriteLine("hi");', () => ({ ok: true, message: 'yay' }));
    expect(outcome.error).toBeNull();
    expect(outcome.ok).toBe(true);
    expect(outcome.message).toBe('yay');
    expect(outcome.result?.stdout).toBe('hi\n');
  });

  it('reports a compiler error and never calls validate', async () => {
    const engine = createNodeCSharpEngine();
    let validateCalled = false;
    const outcome = await executeAndValidate(engine, 'Console.WriteLine("nope")', () => {
      validateCalled = true;
      return { ok: true, message: '' };
    });
    expect(outcome.error).toContain('CS1002');
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toBe('');
    expect(validateCalled).toBe(false);
  });

  it('passes the engine and the exec result through to validate', async () => {
    const engine = createNodeCSharpEngine();
    let receivedResult: unknown;
    await executeAndValidate(engine, 'Console.WriteLine("42");', (_engine, lastResult) => {
      receivedResult = lastResult;
      return { ok: true, message: '' };
    });
    expect(receivedResult).toMatchObject({ stdout: '42\n' });
  });

  it('catches a validate() that throws and returns a generic failure instead of crashing', async () => {
    const engine = createNodeCSharpEngine();
    const outcome = await executeAndValidate(engine, 'Console.WriteLine("x");', () => {
      throw new Error('boom');
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBeNull();
    expect(outcome.message).toContain('nicht durchgeführt werden');
  });
});

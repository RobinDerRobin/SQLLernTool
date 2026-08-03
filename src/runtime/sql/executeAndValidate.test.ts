import { describe, expect, it } from 'vitest';
import { createNodeSqliteEngine } from '../../../test/helpers/nodeSqliteEngine';
import { executeAndValidate } from './executeAndValidate';

describe('executeAndValidate', () => {
  it('runs the SQL, tracks the last result, and reports a passing validation', () => {
    const engine = createNodeSqliteEngine();
    const outcome = executeAndValidate(
      engine,
      "CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); SELECT * FROM t;",
      () => ({ ok: true, message: 'yay' }),
    );
    expect(outcome.error).toBeNull();
    expect(outcome.ok).toBe(true);
    expect(outcome.message).toBe('yay');
    expect(outcome.last).toEqual({ columns: ['id'], values: [[1]] });
  });

  it('drops and recreates tables the SQL creates, so re-running is idempotent', () => {
    const engine = createNodeSqliteEngine();
    const sql = "CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); SELECT COUNT(*) FROM t;";
    executeAndValidate(engine, sql, () => ({ ok: true, message: '' }));
    const second = executeAndValidate(engine, sql, () => ({ ok: true, message: '' }));
    expect(second.last?.values).toEqual([[1]]);
  });

  it('reports a syntax error with a 1-based line number, and never calls validate', () => {
    const engine = createNodeSqliteEngine();
    let validateCalled = false;
    const outcome = executeAndValidate(engine, 'SELECT 1;\nSELEKT nope;', () => {
      validateCalled = true;
      return { ok: true, message: '' };
    });
    expect(outcome.error).toMatch(/^Zeile 2:/);
    expect(outcome.ok).toBe(false);
    expect(validateCalled).toBe(false);
  });

  it("passes the engine and last result through to validate", () => {
    const engine = createNodeSqliteEngine();
    let receivedLast: unknown;
    executeAndValidate(engine, 'SELECT 42 AS answer;', (_engine, lastResult) => {
      receivedLast = lastResult;
      return { ok: true, message: '' };
    });
    expect(receivedLast).toEqual({ columns: ['answer'], values: [[42]] });
  });

  it('catches a validate() that throws and returns a generic failure instead of crashing', () => {
    const engine = createNodeSqliteEngine();
    const outcome = executeAndValidate(engine, 'SELECT 1;', () => {
      throw new Error('boom');
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBeNull();
    expect(outcome.message).toContain('nicht durchgeführt werden');
  });

  it('rejects an unbounded recursive CTE before ever executing it, and never calls validate', () => {
    const engine = createNodeSqliteEngine();
    let validateCalled = false;
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq
    )
    SELECT * FROM seq;`;
    const outcome = executeAndValidate(engine, sql, () => {
      validateCalled = true;
      return { ok: true, message: '' };
    });
    expect(outcome.error).toContain('WITH RECURSIVE');
    expect(outcome.ok).toBe(false);
    expect(validateCalled).toBe(false);
  });

  it('still runs a bounded recursive CTE normally', () => {
    const engine = createNodeSqliteEngine();
    const sql = `WITH RECURSIVE seq(n) AS (
      SELECT 1
      UNION ALL
      SELECT n + 1 FROM seq WHERE n < 5
    )
    SELECT * FROM seq;`;
    const outcome = executeAndValidate(engine, sql, () => ({ ok: true, message: '' }));
    expect(outcome.error).toBeNull();
    expect(outcome.last?.values).toEqual([[1], [2], [3], [4], [5]]);
  });
});

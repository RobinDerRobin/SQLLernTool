import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSqlJsEngine, type SqlJsDatabase, type SqlJsStatement, type SqlJsStatic } from './sqlJsEngine';

/**
 * A tiny real in-memory table engine behind the sql.js prepare/step API
 * shape, just enough to exercise createSqlJsEngine's own logic (statement
 * splitting, column-vs-no-column detection, row capping) without needing
 * real SQL semantics for most tests. Supports exactly what the tests below
 * need: CREATE TABLE, INSERT INTO t VALUES (...), SELECT * FROM t, and a
 * special "SELECT FOREVER" statement that never stops producing rows.
 */
function createFakeSqlJsStatic(): SqlJsStatic {
  return {
    Database: class implements SqlJsDatabase {
      private tables = new Map<string, unknown[][]>();

      prepare(sql: string): SqlJsStatement {
        const trimmed = sql.trim();

        if (/^CREATE TABLE/i.test(trimmed)) {
          const name = /^CREATE TABLE\s+(\w+)/i.exec(trimmed)?.[1] ?? 't';
          this.tables.set(name, []);
          return { step: () => false, get: () => [], getColumnNames: () => [], free: () => {} };
        }

        if (/^INSERT INTO/i.test(trimmed)) {
          const name = /^INSERT INTO\s+(\w+)/i.exec(trimmed)?.[1] ?? 't';
          const valuesMatch = /VALUES\s*\((.+)\)/i.exec(trimmed);
          const row = valuesMatch ? valuesMatch[1]!.split(',').map((v) => Number(v.trim())) : [];
          this.tables.get(name)?.push(row);
          return { step: () => false, get: () => [], getColumnNames: () => [], free: () => {} };
        }

        if (/^SELECT FOREVER/i.test(trimmed)) {
          // Simulates a runaway recursive CTE: step() always reports "another row ready".
          return { step: () => true, get: () => [1], getColumnNames: () => ['n'], free: () => {} };
        }

        if (/^SELECT \* FROM (\w+)/i.exec(trimmed)) {
          const name = /^SELECT \* FROM (\w+)/i.exec(trimmed)![1]!;
          const rows = this.tables.get(name) ?? [];
          let i = 0;
          return {
            step: () => i < rows.length && (i++, true),
            get: () => rows[i - 1] ?? [],
            getColumnNames: () => ['id'],
            free: () => {},
          };
        }

        return { step: () => false, get: () => [], getColumnNames: () => [], free: () => {} };
      }

      close(): void {
        this.tables.clear();
      }
    },
  };
}

describe('createSqlJsEngine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs a multi-statement blob, splitting it and returning result sets only for row-producing statements', () => {
    const engine = createSqlJsEngine(createFakeSqlJsStatic());
    const results = engine.exec('CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); SELECT * FROM t;');
    expect(results).toEqual([{ columns: ['id'], values: [[1]] }]);
  });

  it('throws a friendly, teaching error once a statement exceeds the row cap', () => {
    const engine = createSqlJsEngine(createFakeSqlJsStatic(), { rowCap: 100 });
    expect(() => engine.exec('SELECT FOREVER;')).toThrow(/Abgebrochen.*100/);
  });

  it('throws a friendly error once a statement exceeds the wall-clock deadline, even under the row cap', () => {
    const engine = createSqlJsEngine(createFakeSqlJsStatic(), { rowCap: 10_000_000, deadlineMs: 50 });
    const start = Date.now();
    let call = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      call++;
      // First call establishes `start`; every subsequent call jumps far enough
      // forward that the very first deadline check (at row 500) already trips.
      return call === 1 ? start : start + 10_000;
    });
    expect(() => engine.exec('SELECT FOREVER;')).toThrow(/Abgebrochen/);
  });

  it('does not cap a normal, finite SELECT', () => {
    const engine = createSqlJsEngine(createFakeSqlJsStatic(), { rowCap: 5 });
    const results = engine.exec('CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); INSERT INTO t VALUES (2); SELECT * FROM t;');
    expect(results).toEqual([{ columns: ['id'], values: [[1], [2]] }]);
  });
});

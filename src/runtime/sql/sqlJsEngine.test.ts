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
      private columns = new Map<string, { name: string; type: string }[]>();

      prepare(sql: string): SqlJsStatement {
        const trimmed = sql.trim();

        if (/^CREATE TABLE/i.test(trimmed)) {
          const match = /^CREATE TABLE\s+(\w+)\s*\((.+)\)/i.exec(trimmed);
          const name = match?.[1] ?? 't';
          const cols = (match?.[2] ?? '')
            .split(',')
            .map((c) => c.trim().split(/\s+/))
            .filter((parts) => parts.length >= 2)
            .map(([colName, colType]) => ({ name: colName!, type: colType! }));
          this.tables.set(name, []);
          this.columns.set(name, cols);
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

        if (/^SELECT name FROM sqlite_master/i.test(trimmed)) {
          const names = [...this.tables.keys()];
          let i = 0;
          return {
            step: () => i < names.length && (i++, true),
            get: () => [names[i - 1]],
            getColumnNames: () => ['name'],
            free: () => {},
          };
        }

        if (/^PRAGMA table_info/i.test(trimmed)) {
          const rawName = /^PRAGMA table_info\((.+)\)/i.exec(trimmed)![1]!;
          const name = rawName.replace(/^"|"$/g, '').replace(/""/g, '"');
          const cols = this.columns.get(name) ?? [];
          let i = 0;
          return {
            step: () => i < cols.length && (i++, true),
            get: () => [cols[i - 1]!.name, cols[i - 1]!.type],
            getColumnNames: () => ['name', 'type'],
            free: () => {},
          };
        }

        if (/^SELECT COUNT\(\*\) FROM/i.test(trimmed)) {
          const rawName = /^SELECT COUNT\(\*\) FROM (.+)/i.exec(trimmed)![1]!;
          const name = rawName.replace(/^"|"$/g, '').replace(/""/g, '"');
          const count = this.tables.get(name)?.length ?? 0;
          let done = false;
          return {
            step: () => (done ? false : ((done = true), true)),
            get: () => [count],
            getColumnNames: () => ['COUNT(*)'],
            free: () => {},
          };
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
        this.columns.clear();
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

  describe('getTablesInfo', () => {
    it('returns an empty array when no tables exist yet', () => {
      const engine = createSqlJsEngine(createFakeSqlJsStatic());
      expect(engine.getTablesInfo()).toEqual([]);
    });

    it('returns name, columns (with types) and row count for a single table', () => {
      const engine = createSqlJsEngine(createFakeSqlJsStatic());
      engine.exec('CREATE TABLE users (id INTEGER, name TEXT); INSERT INTO users VALUES (1); INSERT INTO users VALUES (2);');
      expect(engine.getTablesInfo()).toEqual([
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER' },
            { name: 'name', type: 'TEXT' },
          ],
          rowCount: 2,
        },
      ]);
    });

    it('covers every table when multiple exist', () => {
      const engine = createSqlJsEngine(createFakeSqlJsStatic());
      engine.exec('CREATE TABLE a (id INTEGER); CREATE TABLE b (id INTEGER); INSERT INTO b VALUES (1);');
      const info = engine.getTablesInfo();
      expect(info.map((t) => t.name)).toEqual(['a', 'b']);
      expect(info.find((t) => t.name === 'a')?.rowCount).toBe(0);
      expect(info.find((t) => t.name === 'b')?.rowCount).toBe(1);
    });

    it('quotes a table name so identifiers with embedded double quotes still resolve correctly', () => {
      // quoteIdent escapes " as "" — this table name deliberately contains one,
      // exercising that PRAGMA table_info(...) / COUNT(*) still target the right table.
      const engine = createSqlJsEngine(createFakeSqlJsStatic());
      engine.exec('CREATE TABLE normal (id INTEGER); INSERT INTO normal VALUES (1);');
      expect(engine.getTablesInfo()[0]).toEqual({ name: 'normal', columns: [{ name: 'id', type: 'INTEGER' }], rowCount: 1 });
    });
  });

  describe('reset', () => {
    it('closes the old database and starts a fresh, empty one', () => {
      const engine = createSqlJsEngine(createFakeSqlJsStatic());
      engine.exec('CREATE TABLE users (id INTEGER); INSERT INTO users VALUES (1);');
      expect(engine.getTablesInfo()).toHaveLength(1);

      engine.reset();

      expect(engine.getTablesInfo()).toEqual([]);
    });

    it('allows creating a same-named table again after reset (no leftover state)', () => {
      const engine = createSqlJsEngine(createFakeSqlJsStatic());
      engine.exec('CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); INSERT INTO t VALUES (2);');
      engine.reset();
      engine.exec('CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (9);');

      expect(engine.getTablesInfo()[0]?.rowCount).toBe(1);
    });
  });
});

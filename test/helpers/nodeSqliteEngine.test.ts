import { describe, expect, it } from 'vitest';
import { createNodeSqliteEngine } from './nodeSqliteEngine';

describe('createNodeSqliteEngine', () => {
  it('exec() returns no result sets for statements that do not produce rows', () => {
    const engine = createNodeSqliteEngine();
    const results = engine.exec('CREATE TABLE t (id INTEGER, name TEXT);');
    expect(results).toEqual([]);
  });

  it('exec() returns {columns, values} for a SELECT, matching the sql.js shape', () => {
    const engine = createNodeSqliteEngine();
    engine.exec("CREATE TABLE t (id INTEGER, name TEXT); INSERT INTO t VALUES (1, 'a'), (2, 'b');");
    const results = engine.exec('SELECT id, name FROM t ORDER BY id;');
    expect(results).toEqual([
      {
        columns: ['id', 'name'],
        values: [
          [1, 'a'],
          [2, 'b'],
        ],
      },
    ]);
  });

  it('exec() processes multiple statements in one call and returns one entry per row-producing statement', () => {
    const engine = createNodeSqliteEngine();
    const results = engine.exec("CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); SELECT * FROM t;");
    expect(results).toHaveLength(1);
    expect(results[0]?.values).toEqual([[1]]);
  });

  it('throws with a readable error for invalid SQL', () => {
    const engine = createNodeSqliteEngine();
    expect(() => engine.exec('SELEKT * FROM nope;')).toThrow();
  });

  it('getTablesInfo() lists table name, columns with their types, and row count', () => {
    const engine = createNodeSqliteEngine();
    engine.exec("CREATE TABLE users (id INTEGER, name TEXT); INSERT INTO users VALUES (1, 'a'), (2, 'b');");
    const info = engine.getTablesInfo();
    expect(info).toEqual([
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

  it('reset() drops all tables', () => {
    const engine = createNodeSqliteEngine();
    engine.exec('CREATE TABLE t (id INTEGER);');
    engine.reset();
    expect(engine.getTablesInfo()).toEqual([]);
  });

  it('state does not leak between two separately created engines', () => {
    const a = createNodeSqliteEngine();
    const b = createNodeSqliteEngine();
    a.exec('CREATE TABLE only_in_a (id INTEGER);');
    expect(b.getTablesInfo()).toEqual([]);
  });
});

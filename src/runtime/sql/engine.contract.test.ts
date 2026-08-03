import { describe, expect, it } from 'vitest';
import { createNodeSqliteEngine } from '../../../test/helpers/nodeSqliteEngine';
import type { SqlEngine } from './SqlEngine';

/**
 * Shared behavioral contract every SqlEngine adapter must satisfy, so tests
 * written against the fast node-side engine are trustworthy proxies for the
 * real browser engine. Run now against nodeSqliteEngine; the sql.js browser
 * adapter (sqlJsEngine.ts) is structurally identical glue over the same
 * {columns, values}[] shape and is verified against this same fixture SQL
 * manually via `npm run dev` (loading real WASM in a unit test is not worth
 * the cost — see the plan's "not meaningfully testable" section).
 */
function describeSqlEngineContract(name: string, createEngine: () => SqlEngine) {
  describe(`SqlEngine contract: ${name}`, () => {
    it('exec() of a non-row-producing statement returns an empty array', () => {
      const engine = createEngine();
      expect(engine.exec('CREATE TABLE t (id INTEGER);')).toEqual([]);
    });

    it('exec() of a SELECT returns [{columns, values}]', () => {
      const engine = createEngine();
      engine.exec("CREATE TABLE t (id INTEGER, name TEXT); INSERT INTO t VALUES (1, 'a');");
      const result = engine.exec('SELECT id, name FROM t;');
      expect(result).toEqual([{ columns: ['id', 'name'], values: [[1, 'a']] }]);
    });

    it('getTablesInfo() reflects created tables with their columns, types, and row count', () => {
      const engine = createEngine();
      engine.exec("CREATE TABLE t (id INTEGER, name TEXT); INSERT INTO t VALUES (1, 'a'), (2, 'b');");
      expect(engine.getTablesInfo()).toEqual([
        {
          name: 't',
          columns: [
            { name: 'id', type: 'INTEGER' },
            { name: 'name', type: 'TEXT' },
          ],
          rowCount: 2,
        },
      ]);
    });

    it('reset() clears all tables', () => {
      const engine = createEngine();
      engine.exec('CREATE TABLE t (id INTEGER);');
      engine.reset();
      expect(engine.getTablesInfo()).toEqual([]);
    });
  });
}

describeSqlEngineContract('nodeSqliteEngine', createNodeSqliteEngine);

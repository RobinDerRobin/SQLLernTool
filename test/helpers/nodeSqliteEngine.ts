import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncCtor } from 'node:sqlite';
import { splitStatements } from '../../src/domain/sql/statementSplitter';
import type { SqlEngine, SqlResultSet, TableInfo } from '../../src/runtime/sql/SqlEngine';

// Loaded via a runtime require (not a static import) because Vite's module
// resolver — used by Vitest even for node-environment test files — does not
// yet recognize `node:sqlite` as a builtin, and errors trying to resolve it
// as an npm package named "sqlite". The `import type` above is compile-time
// only (erased by tsc), so it never reaches Vite's resolver at all.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: typeof DatabaseSyncCtor };

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * node:sqlite throws rather than silently losing precision when an INTEGER
 * exceeds Number.MAX_SAFE_INTEGER (e.g. SQLite's RANDOM(), a full 64-bit
 * value). We read those as BigInt (setReadBigInts) and convert down to
 * Number here — matching the precision sql.js's own WASM build would give
 * in the browser, and exactly the "BigInt → Number" step the project's own
 * testing notes call for.
 */
function bigIntToNumber(value: unknown): unknown {
  return typeof value === 'bigint' ? Number(value) : value;
}

/**
 * Test-only SqlEngine backed by Node's built-in SQLite (`node:sqlite`),
 * behind the exact same interface the browser's sql.js adapter implements.
 * Chosen over better-sqlite3 because it ships with Node itself — no native
 * compiler (Visual Studio Build Tools on Windows) required to install it.
 * This is what the automated challenge-runner test suite (and everything
 * else in test/) uses instead of loading the WASM build in every test run.
 */
export function createNodeSqliteEngine(): SqlEngine {
  let db = new DatabaseSync(':memory:');

  function exec(sql: string): SqlResultSet[] {
    const results: SqlResultSet[] = [];
    for (const stmt of splitStatements(sql)) {
      const withoutTrailingSemicolon = stmt.text.trim().replace(/;\s*$/, '').trim();
      if (!withoutTrailingSemicolon) continue;

      const prepared = db.prepare(stmt.text);
      prepared.setReadBigInts(true);
      const columnMeta = prepared.columns();
      if (columnMeta.length > 0) {
        // A statement that *declares* columns (a SELECT shape) always produces a
        // result entry, even with 0 matching rows — matches sql.js's behavior,
        // which the prototype UI relies on to distinguish "no tabular result at
        // all" (e.g. a bare INSERT) from "query ran, but returned 0 rows".
        const columns = columnMeta.map((c) => String(c.name));
        const rows = prepared.all() as Record<string, unknown>[];
        const values = rows.map((row) => columns.map((col) => bigIntToNumber(row[col])));
        results.push({ columns, values });
      } else {
        prepared.run();
      }
    }
    return results;
  }

  function getTablesInfo(): TableInfo[] {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    return tables.map(({ name }) => {
      const columns = (
        db.prepare(`PRAGMA table_info(${quoteIdent(name)})`).all() as { name: string; type: string }[]
      ).map((c) => ({ name: c.name, type: c.type }));
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${quoteIdent(name)}`).get() as { count: number };
      return { name, columns, rowCount: countRow.count };
    });
  }

  function reset(): void {
    db.close();
    db = new DatabaseSync(':memory:');
  }

  return { exec, getTablesInfo, reset };
}

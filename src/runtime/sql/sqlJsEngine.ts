import { splitStatements } from '../../domain/sql/statementSplitter';
import type { SqlEngine, SqlResultSet, TableInfo } from './SqlEngine';

/** Minimal slice of sql.js's prepared-statement API this adapter relies on. */
export interface SqlJsStatement {
  step(): boolean;
  get(): unknown[];
  getColumnNames(): string[];
  free(): void;
}

/** Minimal slice of sql.js's public API this adapter relies on. */
export interface SqlJsDatabase {
  prepare(sql: string): SqlJsStatement;
  close(): void;
}

export interface SqlJsStatic {
  Database: new () => SqlJsDatabase;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

const DEFAULT_ROW_CAP = 200_000;
const DEFAULT_DEADLINE_MS = 5000;
/** Checking the wall clock on every single row would itself add overhead to a hot loop — check every Nth row instead. */
const DEADLINE_CHECK_INTERVAL = 500;

export interface CreateSqlJsEngineOptions {
  /** Hard cap on rows read from a single statement — the last line of defense against a runaway query. */
  rowCap?: number;
  /** Wall-clock budget per statement, in milliseconds. */
  deadlineMs?: number;
}

function runawayMessage(rowCap: number, deadlineMs: number, reason: 'rows' | 'time'): string {
  const detail =
    reason === 'rows'
      ? `mehr als ${rowCap.toLocaleString('de-DE')} Zeilen`
      : `länger als ${(deadlineMs / 1000).toFixed(0)} Sekunden`;
  return (
    `Abgebrochen: Die Abfrage hat ${detail} geliefert — vermutlich eine rekursive CTE oder ein JOIN ohne ` +
    `ausreichende Abbruchbedingung (WHERE/LIMIT).`
  );
}

/**
 * Browser SqlEngine adapter over sql.js (SQLite compiled to WASM). `SQL` is
 * the module object produced by `initSqlJs()` once the CDN script (see
 * index.html) has loaded — passed in rather than read off `window` so this
 * module stays importable/testable without a real browser+WASM runtime.
 *
 * Unlike the prototype (and the original version of this adapter), `exec`
 * does not hand the whole SQL string to `Database#exec` in one call — sql.js
 * 1.10.2 exposes no `sqlite3_interrupt`/progress-handler hook, so once a
 * multi-statement blob is handed over there is no way to abort it mid-flight
 * if one statement runs forever (e.g. a recursive CTE with no WHERE/LIMIT).
 * Instead, each statement is split out (`splitStatements`, the same helper
 * `executeAndValidate.ts` uses) and stepped row-by-row via `prepare`/`step`,
 * so a row cap and wall-clock deadline can actually bail out of a runaway
 * SELECT. This is *not* a complete fix: a single `sqlite3_step()` call on a
 * non-row-returning statement (e.g. `INSERT INTO t SELECT ... FROM huge_cte`)
 * still runs to completion in one step with no chance to interrupt — that
 * gap is exactly why `executeAndValidate.ts` also runs the static
 * `findUnboundedRecursion` pre-flight check *before* any of this, and why a
 * Web Worker (running user SQL on a separate, killable thread) remains the
 * only complete fix, tracked separately.
 */
export function createSqlJsEngine(SQL: SqlJsStatic, options: CreateSqlJsEngineOptions = {}): SqlEngine {
  const rowCap = options.rowCap ?? DEFAULT_ROW_CAP;
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  let db = new SQL.Database();

  function execOne(stmtText: string): SqlResultSet | null {
    const stmt = db.prepare(stmtText);
    try {
      const columns = stmt.getColumnNames();
      if (columns.length === 0) {
        // Non-row-producing statement (CREATE/INSERT/UPDATE/DELETE/…) — a
        // single step() runs it to completion; see the doc comment above for
        // why that case can't be capped here.
        stmt.step();
        return null;
      }

      const values: unknown[][] = [];
      const start = Date.now();
      let rowCount = 0;
      while (stmt.step()) {
        values.push(stmt.get());
        rowCount++;
        if (rowCount > rowCap) {
          throw new Error(runawayMessage(rowCap, deadlineMs, 'rows'));
        }
        if (rowCount % DEADLINE_CHECK_INTERVAL === 0 && Date.now() - start > deadlineMs) {
          throw new Error(runawayMessage(rowCap, deadlineMs, 'time'));
        }
      }
      return { columns, values };
    } finally {
      stmt.free();
    }
  }

  function exec(sql: string): SqlResultSet[] {
    const results: SqlResultSet[] = [];
    for (const stmt of splitStatements(sql)) {
      if (!stmt.text.trim()) continue;
      const result = execOne(stmt.text);
      if (result) results.push(result);
    }
    return results;
  }

  function getTablesInfo(): TableInfo[] {
    const tableRows = exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
    const names = tableRows[0]?.values.map((row) => String(row[0])) ?? [];
    return names.map((name) => {
      const columnsResult = exec(`PRAGMA table_info(${quoteIdent(name)})`);
      const nameColIndex = columnsResult[0]?.columns.indexOf('name') ?? -1;
      const typeColIndex = columnsResult[0]?.columns.indexOf('type') ?? -1;
      const columns =
        columnsResult[0]?.values.map((row) => ({
          name: String(row[nameColIndex]),
          type: String(row[typeColIndex]),
        })) ?? [];
      const countResult = exec(`SELECT COUNT(*) FROM ${quoteIdent(name)}`);
      const rowCount = Number(countResult[0]?.values[0]?.[0] ?? 0);
      return { name, columns, rowCount };
    });
  }

  function reset(): void {
    db.close();
    db = new SQL.Database();
  }

  return { exec, getTablesInfo, reset };
}

import { splitStatements } from '../../domain/sql/statementSplitter';
import { extractCreatedTableNames } from '../../domain/sql/tableNames';
import { findUnboundedRecursion } from '../../domain/sql/unboundedRecursionCheck';
import type { ValidateResult } from '../../domain/challenge.types';
import type { SqlEngine, SqlResultSet } from './SqlEngine';

export interface ExecuteAndValidateOutcome {
  ok: boolean;
  message: string;
  error: string | null;
  results: SqlResultSet[];
  last: SqlResultSet | null;
}

function offsetToLine(sql: string, offset: number): number {
  return sql.slice(0, offset).split('\n').length;
}

/**
 * A statement's startOffset points right after the previous statement's `;`
 * — often exactly at a newline character, not past it — which would
 * undercount the line by one. Skip leading whitespace within the statement
 * text first, so the reported line is where its actual content starts.
 */
function firstNonWhitespaceOffset(text: string): number {
  return text.match(/^\s*/)?.[0].length ?? 0;
}

/**
 * Runs a block of SQL against an engine and validates the outcome — the same
 * shape as the prototype's `executeAndValidate`. Drops any table the SQL
 * would create first (idempotent re-runs), executes statement by statement
 * tracking the last result set, and — only if nothing errored — calls the
 * challenge's own `validate()`. Shared by the automated challenge-runner
 * test suite and (later) the UI's "Run" button, so both go through the exact
 * same execution semantics.
 */
export function executeAndValidate(
  engine: SqlEngine,
  sql: string,
  validate: (engine: SqlEngine, lastResult: SqlResultSet | null) => ValidateResult,
): ExecuteAndValidateOutcome {
  for (const tableName of extractCreatedTableNames(sql)) {
    try {
      engine.exec(`DROP TABLE IF EXISTS "${tableName}";`);
    } catch {
      // best-effort, matches the prototype's original behavior
    }
  }

  const statements = splitStatements(sql);
  let results: SqlResultSet[] = [];
  let last: SqlResultSet | null = null;

  for (const stmt of statements) {
    if (!stmt.text.trim()) continue;

    // Pre-flight guard: a recursive CTE with neither a WHERE bound in its
    // recursive member nor a LIMIT afterward would run forever — sql.js has
    // no way to interrupt a query once started (see sqlJsEngine.ts), so this
    // has to be caught before execution, not during it.
    const unboundedRecursionMessage = findUnboundedRecursion(stmt.text);
    if (unboundedRecursionMessage) {
      const line = offsetToLine(sql, stmt.startOffset + firstNonWhitespaceOffset(stmt.text));
      return { ok: false, error: `Zeile ${line}: ${unboundedRecursionMessage}`, message: '', results, last };
    }

    try {
      const res = engine.exec(stmt.text);
      if (res.length) {
        results = results.concat(res);
        last = res[res.length - 1] ?? null;
      }
    } catch (e) {
      const line = offsetToLine(sql, stmt.startOffset + firstNonWhitespaceOffset(stmt.text));
      return { ok: false, error: `Zeile ${line}: ${(e as Error).message}`, message: '', results, last };
    }
  }

  let validation: ValidateResult = { ok: true, message: '' };
  try {
    validation = validate(engine, last);
  } catch {
    validation = { ok: false, message: 'Die Erfolgsprüfung konnte nicht durchgeführt werden.' };
  }
  return { ok: validation.ok, message: validation.message, error: null, results, last };
}

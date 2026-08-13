import type { Runtime } from '../Runtime';

export interface SqlResultSet {
  columns: string[];
  values: unknown[][];
}

interface TableColumnInfo {
  name: string;
  type: string;
}

export interface TableInfo {
  name: string;
  columns: TableColumnInfo[];
  rowCount: number;
}

/**
 * SQL-track execution engine. `exec` mirrors sql.js's `Database#exec` shape
 * ({columns, values}[] — one entry per statement that returned rows) so the
 * sql.js browser adapter and the node:sqlite-backed test adapter are
 * interchangeable behind this one interface.
 */
export interface SqlEngine extends Runtime {
  exec(sql: string): SqlResultSet[];
  getTablesInfo(): TableInfo[];
}

// Ported verbatim from the prototype's keyword sets (used for both syntax
// highlighting and the auto-uppercase-on-boundary editor feature).
export const CLAUSE_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER',
  'ADD', 'COLUMN', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING',
  'LIMIT', 'OFFSET', 'UNION', 'WITH', 'RECURSIVE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
]);

export const OTHER_KEYWORDS = new Set([
  'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN', 'DISTINCT', 'ALL', 'ASC', 'DESC', 'EXISTS',
  'DEFAULT', 'CHECK', 'UNIQUE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'IF', 'CAST', 'TRUE', 'FALSE',
]);

export const DATATYPES = new Set([
  'INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC', 'VARCHAR', 'CHAR', 'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN',
  'DECIMAL', 'FLOAT', 'DOUBLE',
]);

export const FUNCTION_NAMES = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ABS', 'RANDOM', 'COALESCE', 'ROUND', 'LENGTH', 'UPPER', 'LOWER', 'SUBSTR',
  'TRIM', 'NOW', 'DATE', 'DATETIME',
]);

export const SQL_KEYWORDS = new Set<string>([
  ...CLAUSE_KEYWORDS,
  ...OTHER_KEYWORDS,
  ...DATATYPES,
  ...FUNCTION_NAMES,
]);

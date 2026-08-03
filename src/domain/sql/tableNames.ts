const CREATE_TABLE_REGEX = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([A-Za-z_][A-Za-z0-9_]*)["'`]?/gi;

/**
 * Finds the names of every table a block of SQL would CREATE, in order of
 * first appearance, deduplicated. Used to drop-and-recreate tables before
 * (re-)running a challenge's SQL, so re-running is idempotent.
 */
export function extractCreatedTableNames(sql: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  CREATE_TABLE_REGEX.lastIndex = 0;
  while ((match = CREATE_TABLE_REGEX.exec(sql)) !== null) {
    const name = match[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

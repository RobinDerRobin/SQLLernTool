import { extractCreatedTableNames } from '../../domain/sql/tableNames';
import type { SqlEngine } from './SqlEngine';

export interface PrereqChallenge {
  num: string;
  setup?: string;
  solution: string;
  prereqNums?: string[];
}

function resolvePrereqOrder(target: PrereqChallenge, byNum: Map<string, PrereqChallenge>): PrereqChallenge[] {
  const order: PrereqChallenge[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(challenge: PrereqChallenge): void {
    if (visited.has(challenge.num)) return;
    if (visiting.has(challenge.num)) {
      throw new Error(`Circular prereq dependency detected involving challenge "${challenge.num}".`);
    }
    visiting.add(challenge.num);
    for (const depNum of challenge.prereqNums ?? []) {
      const dep = byNum.get(depNum);
      if (!dep) {
        throw new Error(
          `Challenge "${challenge.num}" declares prereqNums referencing unknown challenge "${depNum}".`,
        );
      }
      visit(dep);
    }
    visiting.delete(challenge.num);
    visited.add(challenge.num);
    order.push(challenge);
  }

  for (const depNum of target.prereqNums ?? []) {
    const dep = byNum.get(depNum);
    if (!dep) {
      throw new Error(`Challenge "${target.num}" declares prereqNums referencing unknown challenge "${depNum}".`);
    }
    visit(dep);
  }

  return order;
}

function runSqlBlock(engine: SqlEngine, sql: string | undefined): void {
  if (!sql) return;
  for (const tableName of extractCreatedTableNames(sql)) {
    engine.exec(`DROP TABLE IF EXISTS "${tableName}";`);
  }
  engine.exec(sql);
}

/**
 * Deterministically (re-)materializes everything a challenge needs to be
 * opened standalone: replays each prerequisite's `setup` + canonical
 * `solution` (never the user's draft) in dependency order, deduping shared
 * ancestors, then runs the target's own `setup`. Never runs the target's own
 * `solution` — that's left for the user. Called both on schema reset and
 * whenever a challenge is opened directly, so `prereqNums` chains self-heal
 * every time instead of depending on session history (the bug documented in
 * challenge-anforderungen.md section 5/11 for the old free-text `prereq`).
 */
export function prepareChallenge(engine: SqlEngine, target: PrereqChallenge, allChallenges: PrereqChallenge[]): void {
  const byNum = new Map(allChallenges.map((c) => [c.num, c]));
  const ancestors = resolvePrereqOrder(target, byNum);
  for (const ancestor of ancestors) {
    runSqlBlock(engine, ancestor.setup);
    runSqlBlock(engine, ancestor.solution);
  }
  runSqlBlock(engine, target.setup);
}

/**
 * Names of every table that exists *before* the user writes a single line of
 * their own solution — everything `prepareChallenge` above materializes
 * (ancestors' setup+solution, plus the target's own setup). Lets the UI mark
 * these as "vorgegeben" (given/pre-populated) in the tables inspector,
 * distinct from tables the user's own solution goes on to create — without
 * this, a challenge that references an existing row (e.g. `WHERE id = 2`)
 * gives no visible way to tell what already exists versus what doesn't.
 */
export function getGivenTableNames(target: PrereqChallenge, allChallenges: PrereqChallenge[]): string[] {
  const byNum = new Map(allChallenges.map((c) => [c.num, c]));
  const ancestors = resolvePrereqOrder(target, byNum);
  const names: string[] = [];
  const seen = new Set<string>();
  function addFrom(sql: string | undefined): void {
    if (!sql) return;
    for (const name of extractCreatedTableNames(sql)) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
  }
  for (const ancestor of ancestors) {
    addFrom(ancestor.setup);
    addFrom(ancestor.solution);
  }
  addFrom(target.setup);
  return names;
}

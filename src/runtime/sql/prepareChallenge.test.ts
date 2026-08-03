import { beforeEach, describe, expect, it } from 'vitest';
import { createNodeSqliteEngine } from '../../../test/helpers/nodeSqliteEngine';
import { getGivenTableNames, prepareChallenge, type PrereqChallenge } from './prepareChallenge';
import type { SqlEngine } from './SqlEngine';

function rowCount(engine: SqlEngine, table: string): number {
  const result = engine.exec(`SELECT COUNT(*) FROM ${table};`);
  return Number(result[0]?.values[0]?.[0] ?? 0);
}

function tableNames(engine: SqlEngine): string[] {
  return engine.getTablesInfo().map((t) => t.name);
}

describe('prepareChallenge', () => {
  let engine: SqlEngine;

  beforeEach(() => {
    engine = createNodeSqliteEngine();
  });

  it('replays a single prerequisite\'s setup+solution before opening the target challenge standalone', () => {
    const a: PrereqChallenge = {
      num: 'A',
      setup: 'CREATE TABLE base (id INTEGER);',
      solution: 'INSERT INTO base VALUES (1), (2);',
    };
    const b: PrereqChallenge = { num: 'B', prereqNums: ['A'], solution: 'SELECT * FROM base;' };

    prepareChallenge(engine, b, [a, b]);

    expect(rowCount(engine, 'base')).toBe(2);
  });

  it('runs a shared ancestor exactly once for a diamond dependency', () => {
    const a: PrereqChallenge = {
      num: 'A',
      setup: 'CREATE TABLE log (id INTEGER);',
      solution: 'INSERT INTO log VALUES (1);',
    };
    const b: PrereqChallenge = {
      num: 'B',
      prereqNums: ['A'],
      setup: 'CREATE TABLE b_marker (id INTEGER);',
      solution: 'INSERT INTO b_marker VALUES (1);',
    };
    const c: PrereqChallenge = {
      num: 'C',
      prereqNums: ['A'],
      setup: 'CREATE TABLE c_marker (id INTEGER);',
      solution: 'INSERT INTO c_marker VALUES (1);',
    };
    const d: PrereqChallenge = { num: 'D', prereqNums: ['B', 'C'], solution: 'SELECT 1;' };

    prepareChallenge(engine, d, [a, b, c, d]);

    expect(rowCount(engine, 'log')).toBe(1);
    expect(rowCount(engine, 'b_marker')).toBe(1);
    expect(rowCount(engine, 'c_marker')).toBe(1);
  });

  it('is idempotent: re-preparing the same challenge recreates ancestor tables rather than accumulating rows', () => {
    const a: PrereqChallenge = {
      num: 'A',
      setup: 'CREATE TABLE log (id INTEGER);',
      solution: 'INSERT INTO log VALUES (1);',
    };
    const b: PrereqChallenge = { num: 'B', prereqNums: ['A'], solution: 'SELECT * FROM log;' };

    prepareChallenge(engine, b, [a, b]);
    expect(rowCount(engine, 'log')).toBe(1);

    prepareChallenge(engine, b, [a, b]);
    expect(rowCount(engine, 'log')).toBe(1);
  });

  it("runs the target challenge's own setup after its ancestors", () => {
    const a: PrereqChallenge = {
      num: 'A',
      setup: 'CREATE TABLE base (id INTEGER);',
      solution: 'INSERT INTO base VALUES (1);',
    };
    const e: PrereqChallenge = {
      num: 'E',
      prereqNums: ['A'],
      setup: 'CREATE TABLE e_data (id INTEGER); INSERT INTO e_data VALUES (99);',
      solution: 'SELECT * FROM e_data;',
    };

    prepareChallenge(engine, e, [a, e]);

    expect(tableNames(engine).sort()).toEqual(['base', 'e_data']);
    expect(rowCount(engine, 'e_data')).toBe(1);
  });

  it("never runs the target challenge's own solution", () => {
    const f: PrereqChallenge = {
      num: 'F',
      solution: 'CREATE TABLE should_not_exist (id INTEGER);',
    };

    prepareChallenge(engine, f, [f]);

    expect(tableNames(engine)).not.toContain('should_not_exist');
  });

  it('throws a clear error when prereqNums references an unknown challenge num', () => {
    const g: PrereqChallenge = { num: 'G', prereqNums: ['missing'], solution: 'SELECT 1;' };
    expect(() => prepareChallenge(engine, g, [g])).toThrow(/missing/);
  });

  it('throws a clear error on a circular prereq chain instead of infinite-looping', () => {
    const h: PrereqChallenge = { num: 'H', prereqNums: ['I'], solution: 'SELECT 1;' };
    const i: PrereqChallenge = { num: 'I', prereqNums: ['H'], solution: 'SELECT 1;' };
    expect(() => prepareChallenge(engine, h, [h, i])).toThrow(/circular/i);
  });
});

describe('getGivenTableNames', () => {
  it('includes tables from the target\'s own setup', () => {
    const j: PrereqChallenge = {
      num: 'J',
      setup: 'CREATE TABLE fixture (id INTEGER);',
      solution: 'SELECT * FROM fixture;',
    };
    expect(getGivenTableNames(j, [j])).toEqual(['fixture']);
  });

  it("excludes tables the target's own solution would create — those are the user's to build, not pre-given", () => {
    const k: PrereqChallenge = {
      num: 'K',
      solution: 'CREATE TABLE users (id INTEGER);',
    };
    expect(getGivenTableNames(k, [k])).toEqual([]);
  });

  it("includes tables from an ancestor's setup and solution", () => {
    const a: PrereqChallenge = {
      num: 'A',
      setup: 'CREATE TABLE base (id INTEGER);',
      solution: 'INSERT INTO base VALUES (1);',
    };
    const b: PrereqChallenge = {
      num: 'B',
      prereqNums: ['A'],
      setup: 'CREATE TABLE fixture (id INTEGER);',
      solution: 'SELECT * FROM fixture;',
    };
    expect(getGivenTableNames(b, [a, b])).toEqual(['base', 'fixture']);
  });

  it('dedupes a table created in both an ancestor and the target', () => {
    const a: PrereqChallenge = {
      num: 'A',
      setup: 'CREATE TABLE shared (id INTEGER);',
      solution: 'SELECT 1;',
    };
    const b: PrereqChallenge = { num: 'B', prereqNums: ['A'], setup: 'CREATE TABLE shared (id INTEGER);', solution: 'SELECT 1;' };
    expect(getGivenTableNames(b, [a, b])).toEqual(['shared']);
  });
});

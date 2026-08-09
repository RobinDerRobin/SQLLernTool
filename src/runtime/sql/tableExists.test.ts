import { describe, expect, it } from 'vitest';
import { createNodeSqliteEngine } from '../../../test/helpers/nodeSqliteEngine';
import { tableExists } from './tableExists';

describe('tableExists', () => {
  it('returns true for a table that was created', () => {
    const engine = createNodeSqliteEngine();
    engine.exec('CREATE TABLE kunden (id INTEGER);');
    expect(tableExists(engine, 'kunden')).toBe(true);
  });

  it('returns false for a table that was never created', () => {
    const engine = createNodeSqliteEngine();
    expect(tableExists(engine, 'nichtvorhanden')).toBe(false);
  });

  it('returns false for a table that was created and then dropped', () => {
    const engine = createNodeSqliteEngine();
    engine.exec('CREATE TABLE kunden (id INTEGER); DROP TABLE kunden;');
    expect(tableExists(engine, 'kunden')).toBe(false);
  });

  it('returns false instead of throwing when the name breaks the underlying query', () => {
    const engine = createNodeSqliteEngine();
    expect(tableExists(engine, "o'brien")).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { baseChallengeSchema, csharpChallengeSchema, pythonChallengeSchema, sqliteChallengeSchema } from './schema';

function validBaseFields() {
  return {
    num: '01',
    title: 'Basis-INSERT',
    tutorial: 'Ein paar Grundbegriffe ...',
    task: 'Lege eine Tabelle an ...',
    hints: ['Denkanstoss', 'Konkreter', 'Fast die Loesung'] as const,
    solution: 'CREATE TABLE users (id INTEGER);',
    syntaxExplanation: '<ul><li>...</li></ul>',
    successCriteria: 'Die Tabelle users muss existieren.',
    validate: () => ({ ok: true, message: '' }),
  };
}

describe('baseChallengeSchema', () => {
  it('accepts a fully-populated valid challenge', () => {
    expect(baseChallengeSchema.safeParse(validBaseFields()).success).toBe(true);
  });

  it.each(['num', 'title', 'tutorial', 'task', 'hints', 'solution', 'syntaxExplanation', 'successCriteria', 'validate'])(
    'rejects a challenge missing the required field "%s"',
    (field) => {
      const fields = validBaseFields() as Record<string, unknown>;
      delete fields[field];
      const result = baseChallengeSchema.safeParse(fields);
      expect(result.success).toBe(false);
    },
  );

  it('rejects hints with fewer than 3 entries', () => {
    const fields = { ...validBaseFields(), hints: ['only one'] };
    expect(baseChallengeSchema.safeParse(fields).success).toBe(false);
  });

  it('rejects hints with more than 3 entries', () => {
    const fields = { ...validBaseFields(), hints: ['a', 'b', 'c', 'd'] };
    expect(baseChallengeSchema.safeParse(fields).success).toBe(false);
  });

  it('accepts the optional setup/prereqNums/prereqNote/nondeterministic fields when present', () => {
    const fields = {
      ...validBaseFields(),
      setup: 'CREATE TABLE t (id INTEGER);',
      prereqNums: ['01'],
      prereqNote: 'Setzt Challenge 01 voraus.',
      nondeterministic: true,
    };
    expect(baseChallengeSchema.safeParse(fields).success).toBe(true);
  });
});

describe('sqliteChallengeSchema', () => {
  it('accepts a valid challenge with a non-empty pg note in extra', () => {
    const fields = { ...validBaseFields(), extra: { pg: 'Identisch in Postgres.' } };
    expect(sqliteChallengeSchema.safeParse(fields).success).toBe(true);
  });

  it('rejects a challenge missing the SQL-track-specific pg note', () => {
    const fields = { ...validBaseFields(), extra: {} };
    expect(sqliteChallengeSchema.safeParse(fields).success).toBe(false);
  });

  it('rejects an empty-string pg note as a disallowed placeholder', () => {
    const fields = { ...validBaseFields(), extra: { pg: '' } };
    expect(sqliteChallengeSchema.safeParse(fields).success).toBe(false);
  });
});

describe('pythonChallengeSchema', () => {
  it('accepts a valid challenge with an empty extra object (no track-specific extras yet)', () => {
    const fields = { ...validBaseFields(), extra: {} };
    expect(pythonChallengeSchema.safeParse(fields).success).toBe(true);
  });

  it('still enforces the base Pflichtfelder (e.g. exactly 3 hints)', () => {
    const fields = { ...validBaseFields(), extra: {}, hints: ['only one'] };
    expect(pythonChallengeSchema.safeParse(fields).success).toBe(false);
  });
});

describe('csharpChallengeSchema', () => {
  it('accepts a valid challenge with an empty extra object (no track-specific extras yet, same as Python)', () => {
    const fields = { ...validBaseFields(), extra: {} };
    expect(csharpChallengeSchema.safeParse(fields).success).toBe(true);
  });

  it('still enforces the base Pflichtfelder (e.g. exactly 3 hints)', () => {
    const fields = { ...validBaseFields(), extra: {}, hints: ['only one'] };
    expect(csharpChallengeSchema.safeParse(fields).success).toBe(false);
  });
});

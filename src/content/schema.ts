import { z } from 'zod';

/**
 * Enforces the Pflichtfelder (mandatory fields) every challenge must have,
 * per challenge-anforderungen.md section 1 — track-agnostic. Track-specific
 * extras (e.g. the SQL track's Postgres-difference note) are validated
 * separately by each track's own `.extend()` schema below.
 */
export const baseChallengeSchema = z.object({
  num: z.string().min(1),
  title: z.string().min(1),
  tutorial: z.string().min(1),
  task: z.string().min(1),
  hints: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  solution: z.string().min(1),
  syntaxExplanation: z.string().min(1),
  successCriteria: z.string().min(1),
  validate: z.custom<(...args: unknown[]) => unknown>((value) => typeof value === 'function', {
    message: 'validate must be a function',
  }),
  setup: z.string().optional(),
  prereqNums: z.array(z.string()).optional(),
  prereqNote: z.string().optional(),
  nondeterministic: z.boolean().optional(),
});

const sqliteChallengeExtraSchema = z.object({
  /** Never a placeholder — see challenge-anforderungen.md section 9. */
  pg: z.string().min(1),
});

export const sqliteChallengeSchema = baseChallengeSchema.extend({
  extra: sqliteChallengeExtraSchema,
});

/** No track-specific extra fields for Python yet. */
const pythonChallengeExtraSchema = z.object({});

export const pythonChallengeSchema = baseChallengeSchema.extend({
  extra: pythonChallengeExtraSchema,
});

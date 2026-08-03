export interface ValidateResult {
  ok: boolean;
  message: string;
}

export type ValidateFn<TEngine, TResult> = (engine: TEngine, lastResult: TResult | null) => ValidateResult;

/**
 * Shape shared by every track's challenge (SQL, later Python/C#/...). Track-specific
 * extras (e.g. the SQL track's Postgres-difference note) live in `extra`, typed via
 * TExtra, so the base shape never accumulates fields only some tracks need.
 */
export interface BaseChallenge<TEngine, TResult, TExtra = Record<string, never>> {
  num: string;
  title: string;
  tutorial: string;
  task: string;
  /** Exactly 3, increasing concreteness — enforced by content/schema.ts, not the type system. */
  hints: readonly [string, string, string];
  solution: string;
  syntaxExplanation: string;
  successCriteria: string;
  validate: ValidateFn<TEngine, TResult>;
  /** Auto-run whenever this challenge is opened or the schema is reset. */
  setup?: string;
  /** Structured, machine-resolvable dependency chain (see runtime/sql/prepareChallenge.ts). */
  prereqNums?: string[];
  /** Human-readable explanation shown in the Task tab; auto-generated from prereqNums if omitted. */
  prereqNote?: string;
  /** Drives repeated (10x) validation runs in the automated challenge-runner test suite. */
  nondeterministic?: boolean;
  extra: TExtra;
}

export interface Course<TChallenge> {
  id: string;
  title: string;
  description?: string;
  challenges: TChallenge[];
}

export interface Track<TChallenge> {
  id: string;
  label: string;
  courses: Course<TChallenge>[];
}

/**
 * Loosely-typed view of a challenge from *any* track — everything display
 * code needs (title, task, hints, ...) is on `BaseChallenge` regardless of
 * track, so UI code that only ever reads those fields (never calls
 * `validate` itself) can go through the registry generically instead of
 * importing one specific track's concrete challenge type.
 */
export type AnyChallenge = BaseChallenge<unknown, unknown, Record<string, unknown>>;

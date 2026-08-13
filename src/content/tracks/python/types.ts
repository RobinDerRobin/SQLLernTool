import type { BaseChallenge } from '../../../domain/challenge.types';
import type { PythonExecResult, PythonRuntime } from '../../../runtime/python/PythonRuntime';

/** No track-specific extra fields needed yet — the SQL track's Postgres-note idea has no Python equivalent. */
type PythonChallengeExtra = Record<string, never>;

export type PythonChallenge = BaseChallenge<PythonRuntime, PythonExecResult, PythonChallengeExtra>;

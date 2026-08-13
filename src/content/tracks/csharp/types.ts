import type { BaseChallenge } from '../../../domain/challenge.types';
import type { CSharpExecResult, CSharpRuntime } from '../../../runtime/csharp/CSharpRuntime';

/** No track-specific extra fields needed yet — mirrors the Python track, not the SQL track's Postgres-note. */
type CSharpChallengeExtra = Record<string, never>;

export type CSharpChallenge = BaseChallenge<CSharpRuntime, CSharpExecResult, CSharpChallengeExtra>;

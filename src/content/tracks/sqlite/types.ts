import type { BaseChallenge } from '../../../domain/challenge.types';
import type { SqlEngine, SqlResultSet } from '../../../runtime/sql/SqlEngine';

export interface SqlChallengeExtra {
  /** How this challenge's solution would differ in real PostgreSQL. */
  pg: string;
}

export type SqlChallenge = BaseChallenge<SqlEngine, SqlResultSet, SqlChallengeExtra>;

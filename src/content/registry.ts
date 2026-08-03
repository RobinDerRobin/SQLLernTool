import type { ZodTypeAny } from 'zod';
import type { Course } from '../domain/challenge.types';
import { pythonChallengeSchema, sqliteChallengeSchema } from './schema';
import { pythonGrundlagenCourse } from './tracks/python/courses/pythonGrundlagen/course';
import { sqlLernenToolCourse } from './tracks/sqlite/courses/sqlLernenTool/course';

/**
 * Content-only description of one language/dialect track: its courses and the
 * schema every one of its challenges must satisfy. Deliberately loosely typed
 * (Course<unknown>) at this boundary — code that needs a track's full,
 * concrete challenge type (engine wiring, UI, the challenge-runner test's
 * per-track execution adapter) imports that track's own module directly
 * (e.g. content/tracks/sqlite/types.ts) instead of going through this index.
 */
export interface ContentTrack {
  id: string;
  label: string;
  courses: Course<unknown>[];
  schema: ZodTypeAny;
}

export const TRACKS: Record<string, ContentTrack> = {
  sqlite: {
    id: 'sqlite',
    label: 'SQL (SQLite)',
    courses: [sqlLernenToolCourse as Course<unknown>],
    schema: sqliteChallengeSchema,
  },
  python: {
    id: 'python',
    label: 'Python',
    courses: [pythonGrundlagenCourse as Course<unknown>],
    schema: pythonChallengeSchema,
  },
};

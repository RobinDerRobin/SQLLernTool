import { describe, expect, it } from 'vitest';
import { csharpChallengeSchema } from '../../../../schema';
import { csharpGrundlagenCourse } from './course';

describe('csharpGrundlagenCourse', () => {
  it('has a non-empty id and title, matching the shape registry.test.ts checks for registered tracks', () => {
    expect(csharpGrundlagenCourse.id.length).toBeGreaterThan(0);
    expect(csharpGrundlagenCourse.title.length).toBeGreaterThan(0);
  });

  it('has at least one challenge now that step 7 (actual content) has begun', () => {
    expect(csharpGrundlagenCourse.challenges.length).toBeGreaterThan(0);
  });

  /**
   * This course isn't wired into TRACKS yet (see course.ts and
   * docs/csharp-engine-poc.md step 5), so registry.test.ts's generic
   * "every challenge passes its track's schema" check never sees it —
   * validated here directly instead, so content shape mistakes surface now
   * rather than only once the track is registered.
   */
  it('every challenge passes csharpChallengeSchema', () => {
    for (const challenge of csharpGrundlagenCourse.challenges) {
      const result = csharpChallengeSchema.safeParse(challenge);
      expect(result.success, result.success ? '' : result.error?.message).toBe(true);
    }
  });
});

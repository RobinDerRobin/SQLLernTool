import { describe, expect, it } from 'vitest';
import { makeProgressKey } from '../domain/progress/progressKey';
import { TRACKS } from './registry';

describe('content registry', () => {
  it('has at least one track', () => {
    expect(Object.keys(TRACKS).length).toBeGreaterThan(0);
  });

  it("every challenge in every track passes that track's own content schema", () => {
    const failures: string[] = [];
    for (const [trackId, track] of Object.entries(TRACKS)) {
      for (const course of track.courses) {
        for (const challenge of course.challenges) {
          const result = track.schema.safeParse(challenge);
          if (!result.success) {
            const num = (challenge as { num?: unknown }).num ?? '?';
            failures.push(`${trackId}/${course.id}/${String(num)}: ${result.error.message}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('has no duplicate (track, course, num) progress key across the whole registry', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [trackId, track] of Object.entries(TRACKS)) {
      for (const course of track.courses) {
        for (const challenge of course.challenges) {
          const num = (challenge as { num: string }).num;
          const key = makeProgressKey(trackId, course.id, num);
          const location = `${trackId}/${course.id}/${num}`;
          if (seen.has(key)) {
            duplicates.push(`${key} appears in both ${seen.get(key)} and ${location}`);
          } else {
            seen.set(key, location);
          }
        }
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('every course has a non-empty id and title', () => {
    for (const track of Object.values(TRACKS)) {
      for (const course of track.courses) {
        expect(course.id.length).toBeGreaterThan(0);
        expect(course.title.length).toBeGreaterThan(0);
      }
    }
  });
});

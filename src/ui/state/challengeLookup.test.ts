import { describe, expect, it } from 'vitest';
import type { ContentTrack } from '../../content/registry';
import type { AnyChallenge } from '../../domain/challenge.types';
import { findChallengeInRegistry, getCourseChallenges, getDefaultTrackAndCourse } from './challengeLookup';

function fakeChallenge(num: string): AnyChallenge {
  return { num, title: `Challenge ${num}` } as unknown as AnyChallenge;
}

function fakeTrack(id: string, courses: { id: string; challenges: AnyChallenge[] }[]): ContentTrack {
  return {
    id,
    label: `Label ${id}`,
    courses: courses.map((c) => ({ id: c.id, title: `Course ${c.id}`, challenges: c.challenges })),
    schema: {} as ContentTrack['schema'],
  };
}

const registry: Record<string, ContentTrack> = {
  sqlite: fakeTrack('sqlite', [{ id: 'sqlLernenTool', challenges: [fakeChallenge('01'), fakeChallenge('02')] }]),
  python: fakeTrack('python', [{ id: 'pythonGrundlagen', challenges: [fakeChallenge('01')] }]),
};

describe('getCourseChallenges', () => {
  it('returns the challenges of the given track/course', () => {
    const challenges = getCourseChallenges(registry, 'sqlite', 'sqlLernenTool');
    expect(challenges.map((c) => c.num)).toEqual(['01', '02']);
  });

  it('returns an empty array for an unknown trackId', () => {
    expect(getCourseChallenges(registry, 'nichtVorhanden', 'sqlLernenTool')).toEqual([]);
  });

  it('returns an empty array for an unknown courseId within a known track', () => {
    expect(getCourseChallenges(registry, 'sqlite', 'nichtVorhandenerKurs')).toEqual([]);
  });

  it('returns an empty array against a completely empty registry', () => {
    expect(getCourseChallenges({}, 'sqlite', 'sqlLernenTool')).toEqual([]);
  });
});

describe('findChallengeInRegistry', () => {
  it('finds a challenge by its num', () => {
    expect(findChallengeInRegistry(registry, 'sqlite', 'sqlLernenTool', '02')?.title).toBe('Challenge 02');
  });

  it('returns undefined when the num does not exist in that course', () => {
    expect(findChallengeInRegistry(registry, 'sqlite', 'sqlLernenTool', '99')).toBeUndefined();
  });

  it('returns undefined for an unknown track/course', () => {
    expect(findChallengeInRegistry(registry, 'nichtVorhanden', 'auchNicht', '01')).toBeUndefined();
  });
});

describe('getDefaultTrackAndCourse', () => {
  it('returns the first track and its first course', () => {
    expect(getDefaultTrackAndCourse(registry)).toEqual({ trackId: 'sqlite', courseId: 'sqlLernenTool' });
  });

  it('returns null for a completely empty registry', () => {
    expect(getDefaultTrackAndCourse({})).toBeNull();
  });

  it('returns null when the only track has no courses at all', () => {
    const emptyCourseRegistry: Record<string, ContentTrack> = { sqlite: fakeTrack('sqlite', []) };
    expect(getDefaultTrackAndCourse(emptyCourseRegistry)).toBeNull();
  });
});

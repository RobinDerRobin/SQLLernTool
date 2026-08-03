import type { ContentTrack } from '../../content/registry';
import type { AnyChallenge } from '../../domain/challenge.types';

/**
 * Generic (track-agnostic) challenge lookup against the registry, for view
 * code that only ever reads display fields (title, task, hints, tutorial,
 * ...) and never calls a challenge's `validate` directly — that still goes
 * through each track's own concrete type (see actions.ts's SQL/Python
 * branches), since only there does the exact engine/result type matter.
 */
export function getCourseChallenges(
  registry: Record<string, ContentTrack>,
  trackId: string,
  courseId: string,
): AnyChallenge[] {
  const track = registry[trackId];
  const course = track?.courses.find((c) => c.id === courseId);
  return (course?.challenges ?? []) as AnyChallenge[];
}

export function findChallengeInRegistry(
  registry: Record<string, ContentTrack>,
  trackId: string,
  courseId: string,
  num: string,
): AnyChallenge | undefined {
  return getCourseChallenges(registry, trackId, courseId).find((c) => c.num === num);
}

/** The (track, course) pair shown before any selection exists yet — the first track's first course. */
export function getDefaultTrackAndCourse(
  registry: Record<string, ContentTrack>,
): { trackId: string; courseId: string } | null {
  const track = Object.values(registry)[0];
  const course = track?.courses[0];
  if (!track || !course) return null;
  return { trackId: track.id, courseId: course.id };
}

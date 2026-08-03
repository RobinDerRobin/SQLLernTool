/**
 * Canonical identity for one challenge's saved progress: track + course + the
 * challenge's own `num` (never an array index). Keying on `num` means
 * inserting/removing/reordering challenges can never misattribute a user's
 * saved progress to the wrong challenge; namespacing by track+course means
 * courses (and future language tracks) can never collide with each other.
 */
export function makeProgressKey(trackId: string, courseId: string, num: string): string {
  return `${trackId}:${courseId}:${num}`;
}

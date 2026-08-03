import type { ContentTrack } from '../../../content/registry';
import { escapeHtml } from '../../../domain/text/escapeHtml';

export interface TrackCourseHeaderInput {
  registry: Record<string, ContentTrack>;
  trackId: string | null;
  courseId: string | null;
}

/** Encodes a (track, course) pair into one `<option value>`; parsed back by `parseTrackCourseValue`. */
export function makeTrackCourseValue(trackId: string, courseId: string): string {
  return `${trackId}::${courseId}`;
}

export function parseTrackCourseValue(value: string): { trackId: string; courseId: string } | null {
  const [trackId, courseId] = value.split('::');
  if (!trackId || !courseId) return null;
  return { trackId, courseId };
}

/**
 * Pure render helper for the sidebar's course header. Deliberately a stub
 * today: with exactly one track and one course it renders static text, and
 * only grows a real `<select>` once the registry actually holds more than
 * one course. That way adding course #2 is a data change, not a UI rewrite —
 * and no caller has to change when it happens.
 */
export function renderTrackCourseHeader({ registry, trackId, courseId }: TrackCourseHeaderInput): string {
  const tracks = Object.values(registry);
  const track = (trackId ? registry[trackId] : undefined) ?? tracks[0];
  if (!track) return '';
  const course = (courseId ? track.courses.find((c) => c.id === courseId) : undefined) ?? track.courses[0];
  if (!course) return '';

  const totalCourses = tracks.reduce((sum, t) => sum + t.courses.length, 0);
  const header = `
    <div class="eyebrow">${escapeHtml(track.label)}</div>
    <h1>${escapeHtml(course.title)}</h1>
    ${course.description ? `<p>${escapeHtml(course.description)}</p>` : ''}`;

  if (totalCourses <= 1) {
    return `${header}
    <div class="course-name">${course.challenges.length} Challenges</div>`;
  }

  const options = tracks
    .flatMap((t) =>
      t.courses.map((c) => {
        const value = makeTrackCourseValue(t.id, c.id);
        const selected = t.id === track.id && c.id === course.id ? ' selected' : '';
        return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(t.label)} — ${escapeHtml(c.title)}</option>`;
      }),
    )
    .join('');

  return `${header}
    <select class="track-course-select" data-track-course>${options}</select>`;
}

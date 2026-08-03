import { describe, expect, it } from 'vitest';
import type { ContentTrack } from '../../../content/registry';
import { TRACKS } from '../../../content/registry';
import { renderTrackCourseHeader } from './trackCoursePicker';

function fakeTrack(id: string, courseIds: string[]): ContentTrack {
  return {
    id,
    label: `Label ${id}`,
    courses: courseIds.map((courseId) => ({ id: courseId, title: `Course ${courseId}`, challenges: [] })),
    schema: TRACKS.sqlite!.schema,
  };
}

describe('renderTrackCourseHeader', () => {
  it('renders the track label and course title as static text while only one course exists', () => {
    const html = renderTrackCourseHeader({ registry: { a: fakeTrack('a', ['only']) }, trackId: 'a', courseId: 'only' });
    expect(html).toContain('Label a');
    expect(html).toContain('Course only');
    expect(html).not.toContain('<select');
  });

  it('renders a picker once more than one course exists across the registry', () => {
    const registry = { a: fakeTrack('a', ['one', 'two']) };
    const html = renderTrackCourseHeader({ registry, trackId: 'a', courseId: 'one' });
    expect(html).toContain('<select');
    expect(html).toContain('data-track-course');
  });

  it('renders a picker once more than one track exists', () => {
    const registry = { a: fakeTrack('a', ['one']), b: fakeTrack('b', ['other']) };
    const html = renderTrackCourseHeader({ registry, trackId: 'a', courseId: 'one' });
    expect(html).toContain('<select');
    expect(html).toContain('Label b');
  });

  it('marks the current course as the selected option in the picker', () => {
    const registry = { a: fakeTrack('a', ['one', 'two']) };
    const html = renderTrackCourseHeader({ registry, trackId: 'a', courseId: 'two' });
    expect(html).toMatch(/value="a::two" selected/);
  });

  it('falls back to the first track/course when nothing is selected yet', () => {
    const html = renderTrackCourseHeader({ registry: { a: fakeTrack('a', ['only']) }, trackId: null, courseId: null });
    expect(html).toContain('Course only');
  });

  it('escapes track and course labels', () => {
    const registry = { a: fakeTrack('<script>', ['x']) };
    const html = renderTrackCourseHeader({ registry, trackId: '<script>', courseId: 'x' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders the real registry without throwing', () => {
    expect(renderTrackCourseHeader({ registry: TRACKS, trackId: 'sqlite', courseId: 'sqlLernenTool' })).toContain(
      'SQL Lernen Tool',
    );
  });
});

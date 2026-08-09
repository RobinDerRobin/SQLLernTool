import { describe, expect, it } from 'vitest';
import { csharpGrundlagenCourse } from './course';

describe('csharpGrundlagenCourse', () => {
  it('has a non-empty id and title, matching the shape registry.test.ts checks for registered tracks', () => {
    expect(csharpGrundlagenCourse.id.length).toBeGreaterThan(0);
    expect(csharpGrundlagenCourse.title.length).toBeGreaterThan(0);
  });

  it('has no challenges yet — content lands once the Node-side test engine (step 6) exists', () => {
    expect(csharpGrundlagenCourse.challenges).toEqual([]);
  });
});

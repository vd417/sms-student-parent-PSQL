import {
  assignDistinctSubjectHues,
  hueForSeed,
  SUBJECT_BOX_HUES,
  SUBJECT_HUES,
} from '@/theme/derive';
import { hueForName, hueColor, colors } from '@/theme/colors';
import type { SubjectHue } from '@/theme/colors';

describe('deriveColorSet (curated subject palette)', () => {
  it('uses yellow #36656B, clear red #C62828, and no burgundy in core', () => {
    expect(colors.yellow).toBe('#36656B');
    expect(colors.red).toBe('#C62828');
    expect(colors.blue).toBe('#0D47A1');
    expect(colors.indigo).toBe('#133458');
    expect(SUBJECT_BOX_HUES).not.toContain('wine');
  });

  it('puts blue / red / yellow in the core six', () => {
    expect(SUBJECT_BOX_HUES.slice(0, 3)).toEqual(['blue', 'red', 'yellow']);
  });

  it('keeps six core box hues', () => {
    expect(SUBJECT_BOX_HUES).toHaveLength(6);
    expect(SUBJECT_HUES).toHaveLength(7);
  });

  it('matches hueForName for the same subject name', () => {
    const name = 'English';
    expect(hueForSeed(name)).toBe(hueForName(name));
    expect(hueColor(hueForName(name))).toBe(colors[hueForName(name) as keyof typeof colors]);
  });
});

describe('assignDistinctSubjectHues', () => {
  it('gives up to 6 subjects all different colours', () => {
    const rows = [
      { id: '1', name: 'Mathematics', color: 'blue' as SubjectHue },
      { id: '2', name: 'English', color: 'blue' as SubjectHue },
      { id: '3', name: 'Science', color: 'blue' as SubjectHue },
      { id: '4', name: 'Hindi', color: 'blue' as SubjectHue },
      { id: '5', name: 'History', color: 'blue' as SubjectHue },
      { id: '6', name: 'Physics', color: 'blue' as SubjectHue },
    ];
    const assigned = assignDistinctSubjectHues(rows);
    const hues = assigned.map((s) => s.color);
    expect(new Set(hues).size).toBe(6);
    hues.forEach((h) => expect(SUBJECT_BOX_HUES).toContain(h));
  });

  it('is stable for the same id set', () => {
    const rows = [
      { id: 'a', name: 'Math', color: 'teal' as SubjectHue },
      { id: 'b', name: 'Art', color: 'teal' as SubjectHue },
    ];
    expect(assignDistinctSubjectHues(rows)).toEqual(assignDistinctSubjectHues(rows));
  });
});

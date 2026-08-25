import { filterSubjectsForClass, slotMatchesStudent } from '@/services/http/classSubjects';
import type { Subject } from '@/models';

const math: Subject = {
  id: 'm', name: 'Mathematics', short: 'MA', teacher: 'Default Math', avg: 0, trend: 0, color: 'blue',
};
const sci: Subject = {
  id: 's', name: 'Science', short: 'SC', teacher: '', avg: 0, trend: 0, color: 'teal',
};
const art: Subject = {
  id: 'a', name: 'Art', short: 'AR', teacher: '', avg: 0, trend: 0, color: 'pink',
};

describe('filterSubjectsForClass', () => {
  it('drops catalog rows that belong to another class', () => {
    const rows = filterSubjectsForClass(
      [math, sci, art],
      [
        { id: '1', day: 'Mon', subject: 'Science', class_name: '9-A', teacher_name: 'Ravi' },
        { id: '2', day: 'Mon', subject: 'Art', class_name: '10-B' },
      ],
      { grade: '9', section: 'A', class_label: '9-A' },
    );
    expect(rows.map((s) => s.name)).toEqual(['Science']);
    expect(rows[0].teacher).toBe('Ravi');
  });

  it('matches grade-section when class_label is missing', () => {
    const rows = filterSubjectsForClass(
      [math, sci],
      [{ id: '1', day: 'Mon', subject: 'Mathematics', class_name: '9-A' }],
      { grade: '9', section: 'A' },
    );
    expect(rows.map((s) => s.name)).toEqual(['Mathematics']);
  });

  it('returns empty when timetable is tagged but none of the slots are this class', () => {
    const rows = filterSubjectsForClass(
      [math, art],
      [{ id: '1', day: 'Mon', subject: 'Art', class_name: '10-B' }],
      { grade: '9', section: 'A', class_label: '9-A' },
    );
    expect(rows).toEqual([]);
  });

  it('does not dump the school catalog when the class has no timetable', () => {
    const rows = filterSubjectsForClass([math, art], [], { grade: '9', section: 'A', class_label: '9-A' });
    expect(rows).toEqual([]);
  });
});

describe('slotMatchesStudent', () => {
  it('matches class_name to class_label', () => {
    expect(slotMatchesStudent(
      { id: '1', day: 'Mon', class_name: '9-A' },
      { class_label: '9-A' },
    )).toBe(true);
    expect(slotMatchesStudent(
      { id: '1', day: 'Mon', class_name: '10-B' },
      { class_label: '9-A' },
    )).toBe(false);
  });
});

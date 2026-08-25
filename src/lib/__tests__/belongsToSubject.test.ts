import {
  belongsToSubject,
  examsForClassCatalog,
  gradesForClassCatalog,
  gradesForSubject,
} from '../belongsToSubject';
import { buildReportFromGrades } from '../reportCardBuild';
import type { Grade, Subject } from '@/models';

const music: Subject = {
  id: 'guid-music',
  name: 'Music',
  short: 'MU',
  teacher: 'Amit',
  avg: 0,
  trend: 0,
  color: 'pink',
};

const catalog: Subject[] = [
  music,
  {
    id: 'guid-math',
    name: 'Mathematics',
    short: 'MA',
    teacher: 'Ravi',
    avg: 0,
    trend: 0,
    color: 'blue',
  },
];

describe('belongsToSubject', () => {
  it('matches live rows by subject_id', () => {
    expect(belongsToSubject({ subjId: 'guid-music' }, music, catalog)).toBe(true);
  });

  it('matches grades by subject name when ids differ', () => {
    expect(
      belongsToSubject({ subjId: 'other', subjectName: 'Music' }, music, catalog),
    ).toBe(true);
  });

  it('matches homework against a timetable-derived subject via catalog name', () => {
    const fromTimetable = { ...music, id: 'tt:music' };
    expect(belongsToSubject({ subjId: 'guid-music' }, fromTimetable, catalog)).toBe(true);
  });

  it('does not leak another subject', () => {
    expect(belongsToSubject({ subjId: 'guid-math', subjectName: 'Mathematics' }, music, catalog)).toBe(
      false,
    );
  });

  it('matches Maths alias to Mathematics', () => {
    expect(belongsToSubject({ subjId: '', subjectName: 'Maths' }, catalog[1], catalog)).toBe(true);
  });
});

describe('gradesForSubject', () => {
  const math = catalog[1];

  it('returns the same papers the report card groups under that subject', () => {
    const grades: Grade[] = [
      {
        id: '1',
        subjId: 'other',
        subjectName: 'Mathematics',
        title: 'UT1',
        score: 40,
        max: 50,
        grade: '',
        date: '',
      },
      {
        id: '2',
        subjId: 'guid-math',
        title: 'UT2',
        score: 35,
        max: 50,
        grade: '',
        date: '',
      },
      {
        id: '3',
        subjId: 'guid-music',
        title: 'Singing',
        score: 20,
        max: 20,
        grade: '',
        date: '',
      },
    ];
    expect(gradesForSubject(grades, math, catalog).map((g) => g.id)).toEqual(['1', '2']);
    const report = buildReportFromGrades(grades, catalog);
    expect(report.rows.find((r) => r.subject === 'Mathematics')?.marks).toBe(75);
  });
});

describe('gradesForClassCatalog', () => {
  it('keeps IV-B catalog subjects and drops another section’s papers', () => {
    const grades: Grade[] = [
      {
        id: 'ivb-math',
        subjId: 'guid-math',
        subjectName: 'Mathematics',
        title: 'UT1',
        score: 40,
        max: 50,
        grade: '',
        date: '',
      },
      {
        id: 'iva-french',
        subjId: 'guid-french',
        subjectName: 'French',
        title: 'UT1',
        score: 20,
        max: 20,
        grade: '',
        date: '',
      },
    ];
    const scoped = gradesForClassCatalog(grades, catalog);
    expect(scoped.map((g) => g.id)).toEqual(['ivb-math']);
  });

  it('keeps all papers when the class catalog is empty', () => {
    const grades: Grade[] = [
      {
        id: '1',
        subjId: 'x',
        subjectName: 'Music',
        title: 'UT1',
        score: 10,
        max: 10,
        grade: '',
        date: '',
      },
    ];
    expect(gradesForClassCatalog(grades, []).map((g) => g.id)).toEqual(['1']);
  });
});

describe('examsForClassCatalog', () => {
  it('drops exam papers that are not taught in this section', () => {
    const exams = [
      { id: 'e1', title: 'Music paper', subjId: 'guid-music', subjectName: 'Music', date: '', time: '', dur: '', status: 'upcoming' as const, max: 50 },
      { id: 'e2', title: 'French paper', subjId: 'guid-french', subjectName: 'French', date: '', time: '', dur: '', status: 'upcoming' as const, max: 50 },
    ];
    expect(examsForClassCatalog(exams, catalog).map((e) => e.id)).toEqual(['e1']);
  });
});

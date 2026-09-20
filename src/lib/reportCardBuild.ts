import type { Grade, Student, Subject } from '@/models';
import { gradeFor, gpaFor } from './gradeScale';
import { gradesForClassCatalog, normalizeSubjectName } from './belongsToSubject';

export type ReportCardRow = {
  subject: string;
  max: number;
  marks: number;
  grade: string;
  gpa: number;
  pass: boolean;
};

export type ReportCardData = {
  rows: ReportCardRow[];
  total: number;
  maxTotal: number;
  pct: number;
  grade: string;
  gpa: number;
  result: 'PASS' | 'COMPARTMENT';
};

function subjectKey(g: Grade, subjects: Subject[]): { key: string; name: string } {
  const byId = g.subjId ? subjects.find((s) => s.id === g.subjId) : undefined;
  if (byId) return { key: normalizeSubjectName(byId.name) || byId.id, name: byId.name };
  const name = (g.subjectName ?? '').trim();
  if (name) {
    const want = normalizeSubjectName(name);
    const twin = subjects.find((s) => normalizeSubjectName(s.name) === want);
    return { key: want || `name:${name.toLowerCase()}`, name: twin?.name || name };
  }
  return { key: `title:${g.title.toLowerCase()}`, name: g.title || 'Subject' };
}

/**
 * Build a CRM-style report from live student grades.
 * Multiple papers for one subject are summed (marks / max), matching admin totals.
 * When a class catalog is provided (IV-B subjects), other-section papers are dropped.
 */
export function buildReportFromGrades(
  grades: Grade[],
  subjects: Subject[] = [],
): ReportCardData {
  const scoped = gradesForClassCatalog(grades, subjects);
  const bag = new Map<string, { name: string; marks: number; max: number }>();
  for (const g of scoped) {
    const { key, name } = subjectKey(g, subjects);
    const cur = bag.get(key) ?? { name, marks: 0, max: 0 };
    bag.set(key, {
      name: cur.name || name,
      marks: cur.marks + g.score,
      max: cur.max + g.max,
    });
  }

  const rows: ReportCardRow[] = [...bag.values()]
    .map((r) => {
      const pct = (r.marks / Math.max(1, r.max)) * 100;
      const grade = gradeFor(pct);
      return {
        subject: r.name,
        marks: Math.round(r.marks * 10) / 10,
        max: Math.round(r.max * 10) / 10,
        grade,
        gpa: gpaFor(grade),
        pass: pct >= 33,
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));

  if (!rows.length) {
    return {
      rows: [],
      total: 0,
      maxTotal: 0,
      pct: 0,
      grade: '—',
      gpa: 0,
      result: 'PASS',
    };
  }

  const total = rows.reduce((a, r) => a + r.marks, 0);
  const maxTotal = rows.reduce((a, r) => a + r.max, 0);
  const pct = +((total / Math.max(1, maxTotal)) * 100).toFixed(1);
  const gpa = +(rows.reduce((a, r) => a + r.gpa, 0) / rows.length).toFixed(1);
  return {
    rows,
    total: Math.round(total * 10) / 10,
    maxTotal: Math.round(maxTotal * 10) / 10,
    pct,
    grade: gradeFor(pct),
    gpa,
    result: rows.every((r) => r.pass) ? 'PASS' : 'COMPARTMENT',
  };
}

export function reportCardStudentFields(student: Student) {
  return {
    name: student.name,
    adm: student.studentId || '—',
    cls: student.classroom || student.grade || '—',
    roll: student.roll || 0,
    guardian: '',
    attendance: student.attnPct == null ? 0 : Math.round(student.attnPct || 0),
  };
}

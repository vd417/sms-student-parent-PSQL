import type { Exam, Grade, Subject } from '@/models';

export type SubjectRef = Pick<Subject, 'id' | 'name'>;

const ALIASES: Record<string, string> = {
  math: 'mathematics',
  maths: 'mathematics',
  sci: 'science',
  eng: 'english',
  cs: 'computer science',
  computer: 'computer science',
  computers: 'computer science',
  pe: 'physical education',
  'p.e.': 'physical education',
  'p.e': 'physical education',
};

export function normalizeSubjectName(raw?: string | null): string {
  const n = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!n) return '';
  return ALIASES[n] ?? n;
}

export function belongsToSubject(
  item: { subjId?: string | null; subjectName?: string | null },
  subject: SubjectRef,
  catalog: SubjectRef[] = [],
): boolean {
  const itemId = (item.subjId ?? '').trim();
  const wantId = (subject.id ?? '').trim();
  if (itemId && wantId && itemId === wantId) return true;

  const wantName = normalizeSubjectName(subject.name);
  if (!wantName) return false;

  const itemName = normalizeSubjectName(item.subjectName);
  if (itemName && itemName === wantName) return true;

  if (itemId) {
    const named = catalog.find((s) => s.id === itemId);
    if (named && normalizeSubjectName(named.name) === wantName) return true;
  }

  const twin = catalog.find((s) => normalizeSubjectName(s.name) === wantName);
  return !!(twin && itemId && itemId === twin.id);
}

/** Papers the report card would list under this subject. */
export function gradesForSubject(
  grades: Grade[],
  subject: SubjectRef,
  catalog: SubjectRef[] = [],
): Grade[] {
  return grades.filter((g) => g.max > 0 && belongsToSubject(g, subject, catalog));
}

/** Keep marks that belong to this class's subject catalog (e.g. IV-B). */
export function gradesForClassCatalog(grades: Grade[], catalog: SubjectRef[]): Grade[] {
  const scored = grades.filter((g) => g.max > 0);
  if (!catalog.length) return scored;
  return scored.filter((g) => catalog.some((s) => belongsToSubject(g, s, catalog)));
}

/** Keep exam papers taught to this class; drop the other section's papers. */
export function examsForClassCatalog(exams: Exam[], catalog: SubjectRef[]): Exam[] {
  if (!catalog.length) return exams;
  return exams.filter((e) => catalog.some((s) => belongsToSubject(e, s, catalog)));
}

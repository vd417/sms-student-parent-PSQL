import type { Teacher, TeacherRole } from '@/models';

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'smt', 'shri']);

/** "Class IV · Section B" and "IV-B" become the same key. */
export function compactClass(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(class|grade|section|sec|std)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function sameClass(a: string, b: string): boolean {
  const left = compactClass(a);
  const right = compactClass(b);
  return left.length > 0 && left === right;
}

export function personKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .split(/\s+/)
    .filter((part) => part && !HONORIFICS.has(part))
    .join(' ');
}

/** Last name plus a matching first name or initial. "Ms. Krishnan" matches "Ms. A. Krishnan". */
export function samePerson(a: string, b: string): boolean {
  const left = personKey(a);
  const right = personKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftParts = left.split(' ');
  const rightParts = right.split(' ');
  const leftLast = leftParts[leftParts.length - 1];
  const rightLast = rightParts[rightParts.length - 1];
  if (leftLast.length < 3 || leftLast !== rightLast) return false;
  const leftFirst = leftParts.length === 1 ? '' : leftParts[0];
  const rightFirst = rightParts.length === 1 ? '' : rightParts[0];
  if (!leftFirst || !rightFirst) return true;
  if (leftFirst === rightFirst) return true;
  if (leftFirst.length === 1 || rightFirst.length === 1) return leftFirst[0] === rightFirst[0];
  return false;
}

export type ClassIdentity = {
  classroom?: string;
  grade?: string;
  section?: string;
};

/** Full class labels only. A bare grade ("IV") is not enough to match every section. */
export function classLabels(identity: ClassIdentity): string[] {
  const classroom = (identity.classroom ?? '').trim();
  const grade = (identity.grade ?? '').trim();
  const section = (identity.section ?? '').trim();
  const labels: string[] = [];
  if (classroom) labels.push(classroom);
  if (grade && section) labels.push(`${grade}-${section}`);
  if (grade && /[-–]|section/i.test(grade)) labels.push(grade);
  return labels;
}

export type TimetableTeacher = { id?: string; name?: string };

export function teachersForClass<T extends Pick<Teacher, 'id' | 'name' | 'role' | 'classTeacher'>>(
  teachers: T[],
  identity: ClassIdentity,
  slots: TimetableTeacher[],
): T[] {
  const labels = classLabels(identity);
  const ids = new Set(slots.map((slot) => (slot.id ?? '').trim()).filter(Boolean));
  const names = slots.map((slot) => (slot.name ?? '').trim()).filter(Boolean);
  const matched = teachers.filter((teacher) => {
    const homeroom = (teacher.classTeacher ?? '').trim();
    if (homeroom && labels.some((label) => sameClass(homeroom, label))) return true;
    if (ids.has(teacher.id)) return true;
    return names.some((name) => samePerson(name, teacher.name));
  });
  return matched.slice().sort((a, b) => teacherRank(a, labels) - teacherRank(b, labels) || a.name.localeCompare(b.name));
}

function teacherRank(
  teacher: Pick<Teacher, 'role' | 'classTeacher'>,
  labels: string[],
): number {
  const homeroom = (teacher.classTeacher ?? '').trim();
  if (homeroom && labels.some((label) => sameClass(homeroom, label))) return 0;
  if (teacher.role === 'class_teacher') return 1;
  if (teacher.role === 'subject_teacher') return 2;
  return 3;
}

const ROLE_LABEL: Record<TeacherRole, string> = {
  principal: 'Principal',
  class_teacher: 'Class teacher',
  subject_teacher: 'Subject teacher',
};

/** Role and designation together, then the class they are class teacher of. */
export function teacherCardLine(
  teacher: Pick<Teacher, 'role' | 'designation' | 'classTeacher' | 'subj'>,
): string {
  const role = ROLE_LABEL[teacher.role] ?? 'Teacher';
  const parts = [role];
  const designation = (teacher.designation ?? '').trim();
  if (designation && designation.toLowerCase() !== role.toLowerCase()) parts.push(designation);
  const homeroom = (teacher.classTeacher ?? '').trim();
  if (homeroom) parts.push(homeroom);
  const subject = (teacher.subj ?? '').trim();
  if (subject && !parts.some((part) => part.toLowerCase() === subject.toLowerCase())) {
    parts.push(subject);
  }
  return parts.join(' · ');
}

import type { Teacher } from '@/models';

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
  if (leftLast.length >= 3 && leftLast === rightLast) {
    const leftFirst = leftParts.length === 1 ? '' : leftParts[0];
    const rightFirst = rightParts.length === 1 ? '' : rightParts[0];
    if (!leftFirst || !rightFirst) return true;
    if (leftFirst === rightFirst) return true;
    if (leftFirst.length === 1 || rightFirst.length === 1) return leftFirst[0] === rightFirst[0];
  }
  // Timetable often stores only "Ravi" while the directory has "Mr. Ravi Kumar".
  if (leftParts.length === 1 && rightParts.includes(leftParts[0]) && leftParts[0].length >= 3) return true;
  if (rightParts.length === 1 && leftParts.includes(rightParts[0]) && rightParts[0].length >= 3) return true;
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

export type TimetableTeacher = { id?: string; name?: string; subject?: string };

function taughtSubjects(name: string, id: string, slots: TimetableTeacher[]): string[] {
  const subjects: string[] = [];
  for (const slot of slots) {
    const subject = (slot.subject ?? '').trim();
    if (!subject) continue;
    const slotId = (slot.id ?? '').trim();
    const slotName = (slot.name ?? '').trim();
    const idHit = Boolean(id && slotId && id === slotId);
    const nameHit = Boolean(slotName && samePerson(slotName, name));
    if ((idHit || nameHit) && !subjects.some((row) => row.toLowerCase() === subject.toLowerCase())) {
      subjects.push(subject);
    }
  }
  return subjects;
}

function initialsFor(name: string): string {
  const parts = personKey(name).split(' ').filter(Boolean);
  return parts.map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function teachersForClass(
  teachers: Teacher[],
  identity: ClassIdentity,
  slots: TimetableTeacher[],
): Teacher[] {
  const labels = classLabels(identity);
  const ids = new Set(slots.map((slot) => (slot.id ?? '').trim()).filter(Boolean));
  const names = slots.map((slot) => (slot.name ?? '').trim()).filter(Boolean);
  const matched = teachers.filter((teacher) => {
    const homeroom = (teacher.classTeacher ?? '').trim();
    if (homeroom && labels.some((label) => sameClass(homeroom, label))) return true;
    if (ids.has(teacher.id)) return true;
    return names.some((name) => samePerson(name, teacher.name));
  });
  const withSubjects = matched.map((teacher) => {
    const subjects = taughtSubjects(teacher.name, teacher.id, slots);
    return subjects.length ? { ...teacher, subj: subjects.join(' · ') } : teacher;
  });
  const covered = (name: string, id?: string) =>
    withSubjects.some((teacher) => (id && teacher.id === id) || samePerson(teacher.name, name));
  const extras: Teacher[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    const name = (slot.name ?? '').trim();
    const id = (slot.id ?? '').trim();
    if (!name || covered(name, id)) continue;
    const key = personKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const subjects = taughtSubjects(name, id, slots);
    extras.push({
      id: id || `name:${key}`,
      name,
      initials: initialsFor(name),
      subj: subjects.join(' · '),
      online: false,
      role: 'subject_teacher',
    });
  }
  return [...withSubjects, ...extras].sort(
    (a, b) => teacherRank(a, labels) - teacherRank(b, labels) || a.name.localeCompare(b.name),
  );
}

function staffTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function isSchoolLeader(teacher: Pick<Teacher, 'role' | 'designation'>): boolean {
  return teacherRoleLine(teacher) !== 'Teacher';
}

function teacherRank(
  teacher: Pick<Teacher, 'role' | 'designation' | 'classTeacher'>,
  labels: string[],
): number {
  if (isSchoolLeader(teacher)) return 0;
  const homeroom = (teacher.classTeacher ?? '').trim();
  if (homeroom && labels.some((label) => sameClass(homeroom, label))) return 1;
  if (teacher.role === 'class_teacher') return 2;
  if (teacher.role === 'subject_teacher') return 3;
  return 4;
}

/** Inbox shows one staff role: Teacher, Principal, Admin, or Vice Principal. */
export function teacherRoleLine(
  teacher: Pick<Teacher, 'role' | 'designation' | 'classTeacher'>,
  _identity?: ClassIdentity,
): string {
  const title = staffTitle(`${teacher.designation ?? ''} ${teacher.role ?? ''}`);
  if (/\bvice principal\b/.test(title)) return 'Vice Principal';
  if (/\b(school owner|owner)\b/.test(title)) return 'School Owner';
  if (/\b(admin|administrator)\b/.test(title)) return 'Admin';
  if (
    teacher.role === 'principal' ||
    /\b(principal|headmaster|headmistress|head teacher|head of school|school head)\b/.test(title)
  ) {
    return 'Principal';
  }
  return 'Teacher';
}

/** Message row: a leadership role on the thread wins over a generic Teacher label. */
export function messageRoleLine(
  threadRole: string | null | undefined,
  teacher?: Pick<Teacher, 'role' | 'designation' | 'classTeacher'>,
  identity?: ClassIdentity,
): string {
  const fromThread = teacherRoleLine({ role: 'subject_teacher', designation: threadRole ?? '' }, identity);
  if (fromThread !== 'Teacher') return fromThread;
  if (teacher) return teacherRoleLine(teacher, identity);
  return fromThread;
}

/** Inbox line: staff role only. Subject and designation stay off the teacher row. */
export function teacherCardLine(
  teacher: Pick<Teacher, 'role' | 'designation' | 'classTeacher'>,
  identity?: ClassIdentity,
): string {
  return teacherRoleLine(teacher, identity);
}

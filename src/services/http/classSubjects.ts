import type { Subject } from '@/models';
import { hueForName } from '@/theme';
import type { StudentDTO, TimetableSlotDTO } from './dtos';
import { subjectShortCode } from './mappers';

export type StudentClassRef = Pick<StudentDTO, 'grade' | 'section' | 'class_label'>;

function norm(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function same(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}

export function slotMatchesStudent(slot: TimetableSlotDTO, student: StudentClassRef): boolean {
  const label = norm(student.class_label);
  const grade = norm(student.grade);
  const section = norm(student.section);
  const name = norm(slot.class_name);
  if (!name) return false;
  if (label && same(name, label)) return true;
  if (grade && section && same(name, `${grade}-${section}`)) return true;
  if (grade && section && same(name, `${grade}${section}`)) return true;
  return false;
}

function isBreak(name: string): boolean {
  return /break|lunch|recess/i.test(name);
}

function fromName(name: string, teacher: string, id?: string): Subject {
  return {
    id: id || `name:${name.toLowerCase()}`,
    name,
    short: subjectShortCode(name),
    teacher,
    avg: 0,
    trend: 0,
    color: hueForName(name),
  };
}

/**
 * Keep catalog rows that the student's class actually takes.
 * Mapping is the class timetable (and class_name on slots). If the API already
 * scoped the catalog and there is no class-tagged timetable, the catalog is kept.
 */
export function filterSubjectsForClass(
  catalog: Subject[],
  slots: TimetableSlotDTO[],
  student: StudentClassRef,
): Subject[] {
  const matched = slots.filter((s) => slotMatchesStudent(s, student));
  const tagged = slots.some((s) => norm(s.class_name) || norm(s.class_id));
  if (tagged && matched.length === 0) return [];

  const relevant = matched.length > 0 ? matched : slots;
  const byKey = new Map<string, { name: string; teacher: string }>();
  for (const s of relevant) {
    const name = norm(s.subject);
    if (!name || isBreak(name)) continue;
    const key = name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, { name, teacher: norm(s.teacher_name) });
  }
  if (byKey.size === 0) {
    if (norm(student.class_label) || (norm(student.grade) && norm(student.section))) return [];
    return catalog;
  }

  const catalogByName = new Map(catalog.map((s) => [s.name.toLowerCase(), s]));
  const out: Subject[] = [];
  for (const [key, meta] of byKey) {
    const existing = catalogByName.get(key);
    if (existing) {
      out.push(
        meta.teacher && !existing.teacher ? { ...existing, teacher: meta.teacher } : existing,
      );
    } else {
      out.push(fromName(meta.name, meta.teacher));
    }
  }
  return out;
}

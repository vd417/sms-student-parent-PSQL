import { apiFetch } from '@/api/client';
import type { SessionUserDTO, StudentDTO } from './dtos';

let cached: StudentDTO | null = null;

export function clearSisStudentCache(): void {
  cached = null;
}

/**
 * Users.Id (JWT sub) is not Students.Id. Resolve the roster row via /students/me,
 * falling back to admission number from /auth/me + student search.
 */
export async function loadMyStudent(): Promise<StudentDTO> {
  if (cached) return cached;

  try {
    cached = await apiFetch<StudentDTO>('/students/me');
    return cached;
  } catch {
    /* older API or transient 404 — try admission lookup */
  }

  const me = await apiFetch<SessionUserDTO>('/auth/me');
  const admission = me.student_id?.trim();
  const query = admission || me.name?.trim();
  if (!query) {
    throw new Error('no linked student record');
  }

  const rows = await apiFetch<StudentDTO[]>(`/students?q=${encodeURIComponent(query)}`);
  const list = Array.isArray(rows) ? rows : [];
  const needle = query.toLowerCase();
  const match = admission
    ? list.find((s) => (s.admission_no ?? '').toLowerCase() === needle) ?? list[0]
    : list.find((s) => (s.name ?? '').toLowerCase() === needle) ?? list[0];
  if (!match) {
    throw new Error('student roster not found');
  }
  cached = match;
  return cached;
}

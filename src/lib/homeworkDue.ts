import { parseHm } from '@/services/http/mappers';

function parseLocalDate(iso: string): Date | null {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatDueLabel(dueDate: string, now = new Date()): string {
  const raw = (dueDate ?? '').trim();
  if (!raw) return '';
  const parsed = parseLocalDate(raw);
  if (!parsed) return raw;
  const diffDays = Math.round((startOfDay(parsed) - startOfDay(now)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type HomeworkDueChipKind = 'urgent' | 'soon' | 'neutral' | 'done';

export type HomeworkDueChip = { label: string; kind: HomeworkDueChipKind };

/** Compact status/due chip for homework list cards. */
export function homeworkDueChip(
  h: { status: string; due: string; grade?: string },
  now = new Date(),
): HomeworkDueChip | null {
  if (h.status === 'graded') {
    const grade = (h.grade ?? '').trim();
    return { label: grade ? `Graded · ${grade}` : 'Graded', kind: 'done' };
  }
  if (h.status === 'submitted') return { label: 'Submitted', kind: 'done' };
  const due = formatDueLabel(h.due, now);
  if (!due) return null;
  if (due === 'Today' || due === 'Yesterday') return { label: due, kind: 'urgent' };
  if (due === 'Tomorrow') return { label: due, kind: 'soon' };
  return { label: due, kind: 'neutral' };
}

export function formatDueTime(dueTime: string): string {
  const raw = (dueTime ?? '').trim();
  if (!raw || raw === '—') return raw;
  const mins = parseHm(raw);
  if (mins == null) return raw;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function leaveDateKey(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const match = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw.slice(0, 10);
}

export function leaveBelongsToChild(
  rowChildId: string | null | undefined,
  childId: string,
): boolean {
  if (!childId) return true;
  if (!rowChildId) return true;
  return rowChildId.toLowerCase() === childId.toLowerCase();
}

export function leaveStatusLabel(status: string | null | undefined): string {
  const s = (status ?? '').trim().toLowerCase();
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return 'Pending';
}

export function leaveStatusTone(status: string | null | undefined): 'present' | 'absent' | 'late' {
  const s = (status ?? '').trim().toLowerCase();
  if (s === 'approved') return 'present';
  if (s === 'rejected') return 'absent';
  return 'late';
}

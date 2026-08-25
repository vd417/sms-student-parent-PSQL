export function dash(value?: string | number | null): string {
  if (value == null) return '—';
  const s = String(value).trim();
  return s.length ? s : '—';
}

/** SIS DOB is an ISO date; already-friendly labels pass through. */
export function formatDob(raw?: string | null): string {
  const s = (raw ?? '').trim();
  if (!s) return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

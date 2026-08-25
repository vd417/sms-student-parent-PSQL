/** Display helpers for the student home tiles — live API often sends 0 for “unknown”. */

export function formatHomeAvg(overallAvg: number | null | undefined): string {
  if (overallAvg == null || Number.isNaN(Number(overallAvg)) || overallAvg <= 0) return '—';
  return `${Math.round(Number(overallAvg))}%`;
}

export function formatHomeAttn(attnPct: number | null | undefined): string {
  if (attnPct == null || Number.isNaN(Number(attnPct))) return '—';
  const n = Number(attnPct);
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

export function formatHomeRank(rank: number | null | undefined, rankOf: number | null | undefined): string {
  if (!rankOf || rankOf <= 0) return '—';
  return `${rank ?? 0}/${rankOf}`;
}

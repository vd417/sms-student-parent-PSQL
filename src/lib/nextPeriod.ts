import type { TodayBlock } from '@/models';
import { parseHm } from '@/services/http/mappers';

export type PeriodPhase = 'now' | 'next' | 'done';

function startOf(block: TodayBlock): number | null {
  return block.startMin ?? parseHm(block.t);
}

function endOf(block: TodayBlock): number | null {
  const start = startOf(block);
  if (start == null) return null;
  return start + (block.d || 0);
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function pickNowOrNext(
  blocks: TodayBlock[],
  nowMin: number,
): { block: TodayBlock; phase: PeriodPhase } | null {
  const classes = blocks.filter((b) => b.kind === 'class');
  if (!classes.length) return null;

  const inProgress = classes.find((b) => {
    const start = startOf(b);
    const end = endOf(b);
    return start != null && end != null && nowMin >= start && nowMin < end;
  });
  if (inProgress) return { block: inProgress, phase: 'now' };

  const upcoming = classes.find((b) => {
    const start = startOf(b);
    return start != null && start > nowMin;
  });
  if (upcoming) return { block: upcoming, phase: 'next' };

  return { block: classes[classes.length - 1], phase: 'done' };
}

export function heroMeta(block: TodayBlock): string {
  const parts = [block.room, block.teacher]
    .map((p) => (p ?? '').trim())
    .filter((p) => p && p !== '—' && p !== '-');
  return parts.join(' · ');
}

export function heroEyebrow(phase: PeriodPhase | null): string {
  if (phase === 'now') return 'NOW';
  if (phase === 'next') return 'UP NEXT';
  if (phase === 'done') return 'DONE';
  return 'TODAY';
}

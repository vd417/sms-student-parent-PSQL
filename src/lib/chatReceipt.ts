export type ChatReceiptStatus = 'sent' | 'delivered' | 'read';

/** WhatsApp grey (sent/delivered) and blue (read) — never white. */
export const TICK_GREY = '#667781';
export const TICK_BLUE = '#53BDEB';

export function tickColor(status: ChatReceiptStatus): string {
  return status === 'read' ? TICK_BLUE : TICK_GREY;
}

/** WhatsApp-style ticks on the sender's copy only. */
export function receiptStatusFromDto(d: {
  is_mine?: boolean;
  is_read?: boolean;
  is_delivered?: boolean;
  read_at?: string | null;
  delivered_at?: string | null;
}): ChatReceiptStatus | undefined {
  if (!d.is_mine) return undefined;
  if (d.is_read || hasTimestamp(d.read_at)) return 'read';
  if (d.is_delivered || hasTimestamp(d.delivered_at)) return 'delivered';
  return 'sent';
}

function hasTimestamp(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

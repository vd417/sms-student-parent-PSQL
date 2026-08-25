import { receiptStatusFromDto, tickColor, TICK_BLUE, TICK_GREY } from '../chatReceipt';

describe('receiptStatusFromDto', () => {
  it('hides ticks on incoming messages', () => {
    expect(receiptStatusFromDto({ is_mine: false, is_read: true, read_at: '2026-08-13T10:00:00Z' })).toBeUndefined();
  });

  it('maps sent → delivered → read', () => {
    expect(receiptStatusFromDto({ is_mine: true })).toBe('sent');
    expect(receiptStatusFromDto({ is_mine: true, is_delivered: true })).toBe('delivered');
    expect(receiptStatusFromDto({ is_mine: true, delivered_at: '2026-08-13T10:00:00Z' })).toBe('delivered');
    expect(receiptStatusFromDto({ is_mine: true, is_delivered: true, is_read: true })).toBe('read');
    expect(receiptStatusFromDto({ is_mine: true, read_at: '2026-08-13T10:01:00Z' })).toBe('read');
  });

  it('uses grey ticks until read, then WhatsApp blue — never white', () => {
    expect(tickColor('sent')).toBe(TICK_GREY);
    expect(tickColor('delivered')).toBe(TICK_GREY);
    expect(tickColor('read')).toBe(TICK_BLUE);
    expect(tickColor('sent').toLowerCase()).not.toBe('#ffffff');
    expect(tickColor('delivered').toLowerCase()).not.toBe('#ffffff');
  });
});

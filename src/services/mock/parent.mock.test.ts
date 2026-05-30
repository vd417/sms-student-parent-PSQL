import { db } from './db';
import { feesMock, leaveMock, ptmMock, parentMock } from './parent.mock';

const fast = { ms: 0, errorRate: 0 };

describe('parent mocks', () => {
  test('children() returns both kids', async () => {
    const kids = await parentMock(fast).children();
    expect(kids.map((k) => k.id)).toEqual(['k1', 'k2']);
  });

  test('fees.pay() marks a due fee paid', async () => {
    const due = db.fees!.find((f) => f.status === 'due')!;
    const updated = await feesMock(fast).pay(due.id);
    expect(updated.status).toBe('paid');
    expect(db.fees!.find((f) => f.id === due.id)?.status).toBe('paid');
  });

  test('leave.submit() appends a pending request', async () => {
    const before = db.leave!.length;
    const req = await leaveMock(fast).submit({
      childId: 'k1', from: 'Apr 28', to: 'Apr 30', reason: 'Travel', note: 'Family trip',
    });
    expect(req.status).toBe('pending');
    expect(db.leave!.length).toBe(before + 1);
  });

  test('ptm.setStatus() confirms a meeting', async () => {
    const pending = db.ptm!.find((m) => m.status === 'pending')!;
    const updated = await ptmMock(fast).setStatus(pending.id, 'confirmed');
    expect(updated.status).toBe('confirmed');
  });
});

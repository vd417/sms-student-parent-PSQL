import { db } from './db';
import { homeworkMock } from './homework.mock';

const fast = { ms: 0, errorRate: 0 };

describe('homeworkMock', () => {
  test('submit() flips status to submitted and persists in db', async () => {
    const target = db.homework[0];
    const updated = await homeworkMock(fast).submit(target.id);
    expect(updated.status).toBe('submitted');
    expect(db.homework.find((h) => h.id === target.id)?.status).toBe('submitted');
  });

  test('setStatus() updates the stored item', async () => {
    const target = db.homework[1];
    await homeworkMock(fast).setStatus(target.id, 'progress');
    expect(db.homework.find((h) => h.id === target.id)?.status).toBe('progress');
  });
});

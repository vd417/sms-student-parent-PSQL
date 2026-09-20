import { authMock } from './auth.mock';
import { ApiError } from '@/services/errors';
import { db } from './db';

let auth = authMock({ ms: 0 });
beforeEach(() => {
  auth = authMock({ ms: 0 });
});

describe('authMock.requestPasswordReset', () => {
  it('sends a code for a registered student email and returns masked sentTo', async () => {
    const res = await auth.requestPasswordReset('  Maya.Patel@Westbrook.edu ');
    expect(res.channel).toBe('email');
    expect(res.sent).toBe(true);
    expect(res.sentTo).toBe('m***@westbrook.edu');
    expect(res.recipient).toBe('self');
  });

  it('sends to student email first for admission ID (never echoes the ID)', async () => {
    const res = await auth.requestPasswordReset('WBA-2024-1042');
    expect(res).toMatchObject({
      channel: 'email',
      sent: true,
      recipient: 'self',
      sentTo: 'm***@westbrook.edu',
    });
    expect(res.sentTo).not.toContain('WBA');
  });

  it('falls back to parent email when student email delivery fails twice', async () => {
    const failing = authMock({ ms: 0, studentEmailDeliveryFails: 2 });
    const res = await failing.requestPasswordReset('WBA-2024-1042');
    expect(res.recipient).toBe('parent');
    expect(res.sentTo).toBe('p***@home.com');
    expect(res.sentTo).not.toContain(db.student.studentId);
  });

  it('sends a code for a registered parent by email', async () => {
    const res = await auth.requestPasswordReset('priya.patel@home.com');
    expect(res).toMatchObject({
      channel: 'email',
      sent: true,
      recipient: 'self',
      sentTo: 'p***@home.com',
    });
  });

  it('parent role sends to parent mail even when identifier is the student email', async () => {
    const res = await auth.requestPasswordReset(db.student.email, 'parent');
    expect(res).toMatchObject({
      channel: 'email',
      recipient: 'self',
      sentTo: 'p***@home.com',
    });
  });

  it('sends a code for a registered parent by phone (formatting ignored)', async () => {
    const res = await auth.requestPasswordReset('4155550142');
    expect(res.channel).toBe('sms');
    expect(res.sent).toBe(true);
    expect(res.sentTo).toMatch(/0142$/);
  });

  it('throws 404 for an unknown identifier', async () => {
    await expect(auth.requestPasswordReset('nobody@nowhere.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
    await expect(auth.requestPasswordReset('0000000000')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('authMock — refresh/getMe', () => {
  it('refresh returns a fresh access token', async () => {
    const r = await auth.refresh('any');
    expect(typeof r.access).toBe('string');
    expect(r.access.length).toBeGreaterThan(0);
  });

  it('getMe returns the demo identity', async () => {
    const me = await auth.getMe();
    expect(me).toHaveProperty('role');
    expect(me).toHaveProperty('email');
  });
});

describe('authMock.resetPassword', () => {
  it('sets a new password given the correct code, then signs the parent in', async () => {
    await auth.requestPasswordReset('priya.patel@home.com');
    await auth.resetPassword('priya.patel@home.com', '123456', 'NewPass123');
    const session = await auth.signIn('priya.patel@home.com', 'NewPass123', 'parent');
    expect(session.role).toBe('parent');
  });

  it('sets a student password via admission ID', async () => {
    await auth.requestPasswordReset('WBA-2024-1042');
    await auth.resetPassword('WBA-2024-1042', '123456', 'NewPass123');
    const session = await auth.signIn('WBA-2024-1042', 'NewPass123', 'student');
    expect(session.role).toBe('student');
  });

  it('throws 401 for an incorrect code', async () => {
    await auth.requestPasswordReset('priya.patel@home.com');
    await expect(auth.resetPassword('priya.patel@home.com', '000000', 'NewPass123')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('throws 404 for an unknown identifier', async () => {
    await expect(auth.resetPassword('nobody@nowhere.com', '123456', 'NewPass123')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('throws 400 for a weak password', async () => {
    await auth.requestPasswordReset('priya.patel@home.com');
    await expect(auth.resetPassword('priya.patel@home.com', '123456', 'weak')).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('authMock.signIn', () => {
  it('rejects parent signIn before any password is set (409)', async () => {
    const fresh = authMock({ ms: 0 });
    await expect(fresh.signIn('priya.patel@home.com', 'secret12', 'parent')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('rejects parent signIn with a wrong password (401)', async () => {
    const inst = authMock({ ms: 0 });
    await inst.requestPasswordReset('priya.patel@home.com');
    await inst.resetPassword('priya.patel@home.com', '123456', 'secret12');
    await expect(inst.signIn('priya.patel@home.com', 'nope9999', 'parent')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects student signIn before password is set (409)', async () => {
    const fresh = authMock({ ms: 0 });
    await expect(fresh.signIn('WBA-2024-1042', 'secret12', 'student')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('rejects a parent identifier on the student tab', async () => {
    const inst = authMock({ ms: 0 });
    await inst.requestPasswordReset('priya.patel@home.com');
    await inst.resetPassword('priya.patel@home.com', '123456', 'secret12');
    await expect(inst.signIn('priya.patel@home.com', 'secret12', 'student')).rejects.toMatchObject({
      status: 403,
      code: 'wrong_role',
    });
  });
});

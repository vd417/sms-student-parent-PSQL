import { authMock } from './auth.mock';
import { ApiError } from '@/services/errors';

const auth = authMock({ ms: 0 });

describe('authMock.requestOtp', () => {
  it('finds a registered student by email (case/space normalized)', async () => {
    const res = await auth.requestOtp('  Maya.Patel@Westbrook.edu ');
    expect(res).toEqual({ channel: 'email', sent: true });
  });

  it('finds a registered parent by email', async () => {
    const res = await auth.requestOtp('priya.patel@home.com');
    expect(res).toEqual({ channel: 'email', sent: true });
  });

  it('finds a registered parent by phone (formatting ignored)', async () => {
    const res = await auth.requestOtp('4155550142');
    expect(res).toEqual({ channel: 'sms', sent: true });
  });

  it('throws 404 for an unknown identifier', async () => {
    await expect(auth.requestOtp('nobody@nowhere.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
    await expect(auth.requestOtp('0000000000')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('authMock.verifyOtp', () => {
  it('signs in a student with the correct code and derives role/email', async () => {
    const session = await auth.verifyOtp('maya.patel@westbrook.edu', '123456');
    expect(session).toMatchObject({ role: 'student', email: 'maya.patel@westbrook.edu' });
    expect(session.token).toEqual(expect.stringContaining('student'));
  });

  it('signs in a parent matched by phone and returns the parent email', async () => {
    const session = await auth.verifyOtp('4155550142', '123456');
    expect(session).toMatchObject({ role: 'parent', email: 'priya.patel@home.com' });
  });

  it('throws 401 for an incorrect code', async () => {
    await expect(auth.verifyOtp('maya.patel@westbrook.edu', '000000')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('throws 404 when verifying an unknown identifier', async () => {
    await expect(auth.verifyOtp('nobody@nowhere.com', '123456')).rejects.toMatchObject({
      status: 404,
    });
  });
});

import { authMock } from './auth.mock';
import { ApiError } from '@/services/errors';

let auth = authMock({ ms: 0 });
beforeEach(() => { auth = authMock({ ms: 0 }); });

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

describe('authMock — refresh/setPassword/getMe', () => {
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

describe('authMock.verifyOtp', () => {
  it('returns a reset token for the correct code', async () => {
    const res = await auth.verifyOtp('priya.patel@home.com', '123456');
    expect(typeof res.resetToken).toBe('string');
    expect(res.resetToken.length).toBeGreaterThan(0);
    expect(res.expiresIn).toBeGreaterThan(0);
  });
  it('throws 401 for an incorrect code', async () => {
    await expect(auth.verifyOtp('priya.patel@home.com', '000000')).rejects.toMatchObject({
      status: 401,
    });
  });
  it('throws 404 for an unknown identifier', async () => {
    await expect(auth.verifyOtp('nobody@nowhere.com', '123456')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('authMock.setPassword (token-validated) + parent signIn', () => {
  it('sets a password with a valid reset token, then signs the parent in', async () => {
    const { resetToken } = await auth.verifyOtp('priya.patel@home.com', '123456');
    await expect(auth.setPassword({ token: resetToken, password: 'secret12' })).resolves.toBeUndefined();
    const session = await auth.signIn('priya.patel@home.com', 'secret12', 'parent');
    expect(session).toMatchObject({ role: 'parent', email: 'priya.patel@home.com' });
  });
  it('rejects set-password with an unknown/expired token (410)', async () => {
    await expect(auth.setPassword({ token: 'bogus', password: 'secret12' })).rejects.toMatchObject({
      status: 410,
    });
  });
  it('rejects a weak password (400)', async () => {
    const { resetToken } = await auth.verifyOtp('priya.patel@home.com', '123456');
    await expect(auth.setPassword({ token: resetToken, password: 'abc' })).rejects.toMatchObject({
      status: 400,
    });
  });
  it('rejects parent signIn before any password is set (409)', async () => {
    const fresh = authMock({ ms: 0 });
    await expect(fresh.signIn('priya.patel@home.com', 'secret12', 'parent')).rejects.toMatchObject({
      status: 409,
    });
  });
  it('rejects parent signIn with a wrong password (401)', async () => {
    const inst = authMock({ ms: 0 });
    const { resetToken } = await inst.verifyOtp('priya.patel@home.com', '123456');
    await inst.setPassword({ token: resetToken, password: 'secret12' });
    await expect(inst.signIn('priya.patel@home.com', 'nope9999', 'parent')).rejects.toMatchObject({
      status: 401,
    });
  });
});

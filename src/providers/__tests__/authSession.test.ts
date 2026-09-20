import { shouldInvalidateSession, sessionFromPersisted } from '@/providers/AuthProvider';
import { ApiError } from '@/services/errors';

describe('shouldInvalidateSession', () => {
  it('logs out only on confirmed auth failure', () => {
    expect(shouldInvalidateSession(new ApiError('expired', 401))).toBe(true);
  });

  it('keeps the session on timeout, 5xx, and unreachable backend', () => {
    expect(shouldInvalidateSession(new ApiError('Request timed out: /auth/me', 0, undefined, undefined, 'NETWORK_TIMEOUT'))).toBe(false);
    expect(shouldInvalidateSession(new ApiError('oops', 500))).toBe(false);
    expect(shouldInvalidateSession(new ApiError('bad gateway', 502))).toBe(false);
    expect(shouldInvalidateSession(new ApiError('busy', 503))).toBe(false);
    expect(shouldInvalidateSession(new ApiError('timeout', 504))).toBe(false);
    expect(shouldInvalidateSession(new ApiError('Network error: /auth/me', 0, undefined, undefined, 'CONNECTION_ERROR'))).toBe(false);
    expect(shouldInvalidateSession(new ApiError('DNS failure: /auth/me', 0, undefined, undefined, 'DNS_FAILURE'))).toBe(false);
  });

  it('restores a session object from persisted tokens without hitting the network', () => {
    expect(sessionFromPersisted('tok', 'student', 'a@b.c')).toEqual({
      token: 'tok',
      role: 'student',
      email: 'a@b.c',
    });
  });
});

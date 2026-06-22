import { authReducer, initialAuthState } from './authReducer';

describe('authReducer', () => {
  test('starts in restoring', () => {
    expect(initialAuthState.status).toBe('restoring');
  });

  test('RESTORE_FAILED → unauthenticated', () => {
    expect(authReducer(initialAuthState, { type: 'RESTORE_FAILED' }).status).toBe('unauthenticated');
  });

  test('signed-in sets session and role', () => {
    const next = authReducer(initialAuthState, {
      type: 'SIGNED_IN',
      session: { token: 't', role: 'parent', email: 'a@b.com' },
    });
    expect(next.session?.role).toBe('parent');
    expect(next.status).toBe('authenticated');
  });

  test('signed-out clears session', () => {
    const signedIn = authReducer(initialAuthState, {
      type: 'SIGNED_IN',
      session: { token: 't', role: 'student', email: 'a@b.com' },
    });
    const out = authReducer(signedIn, { type: 'SIGNED_OUT' });
    expect(out.session).toBeNull();
    expect(out.status).toBe('unauthenticated');
  });
});

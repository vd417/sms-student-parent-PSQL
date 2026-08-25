import { ApiError } from '@/services/errors';
import { mapAuthError } from '@/services/auth/authError';

describe('mapAuthError', () => {
  it('maps 404 not_registered to the school-contact copy', () => {
    expect(mapAuthError(new ApiError('missing', 404, {}, 'not_registered'))).toBe(
      'No account found. Contact your school.',
    );
  });

  it('maps missing contact details separately from a missing account', () => {
    expect(mapAuthError(new ApiError('no channel', 404, {}, 'no_delivery_channel'))).toBe(
      'No email or phone on file. Contact your school.',
    );
  });

  it('maps 409 to the password-setup prompt', () => {
    expect(mapAuthError(new ApiError('setup', 409, {}, 'password_not_set'))).toBe(
      'No password yet — use "Set up or reset password".',
    );
  });

  it('maps network failures to a reachability message', () => {
    expect(mapAuthError(new ApiError('Network error: /auth/login', 0))).toBe(
      'Cannot reach the server. Check that the API is running.',
    );
  });

  it('maps 422 to invalid login details', () => {
    expect(mapAuthError(new ApiError('email or phone required', 422))).toBe(
      'Invalid login details. Check ID/email and password.',
    );
  });
});

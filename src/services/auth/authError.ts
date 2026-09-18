import { ApiError } from '@/services/errors';

export function mapAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'no_delivery_channel') {
      return 'No email or phone on file. Contact your school.';
    }
    if (err.status === 0 || err.kind === 'NETWORK_OFFLINE' || /network|timed out/i.test(err.message)) {
      return 'Cannot reach the server. Check that the API is running.';
    }
    if (err.status === 404) return 'No account found. Contact your school.';
    if (err.code === 'wrong_role') return err.message;
    if (err.status === 401) return 'Incorrect code or password.';
    if (err.status === 409) return 'No password yet — use "Set up or reset password".';
    if (err.status === 410) return 'Code expired. Request a new one.';
    if (err.status === 422) return 'Invalid login details. Check ID/email and password.';
    if (err.message && !/^Request failed/i.test(err.message)) return err.message;
  }
  return 'Something went wrong. Please try again.';
}

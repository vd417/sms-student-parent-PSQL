import type { AuthService } from '@/services/types';
import type { Role } from '@/models';
import { ApiError } from '@/services/errors';
import { isStrongPassword } from '@/services/auth/password';
import { withLatency } from './latency';
import { db } from './db';

interface Opts {
  ms?: number;
  errorRate?: number;
}

const MOCK_OTP_CODE = '123456';
const RESET_TTL_SECONDS = 600;

const normEmail = (v: string) => v.trim().toLowerCase();
const normPhone = (v: string) => v.replace(/\D/g, '');
const isEmail = (v: string) => v.includes('@');

function phonesMatch(a: string, b: string): boolean {
  const da = normPhone(a);
  const dbq = normPhone(b);
  if (da.length < 7 || dbq.length < 7) return false;
  const len = Math.min(da.length, dbq.length);
  return da.slice(-len) === dbq.slice(-len);
}

interface Match {
  role: Role;
  email: string;
  channel: 'sms' | 'email';
}

/** Look up an identifier (email or phone) against the mock DB. */
function findAccount(identifier: string): Match | null {
  if (isEmail(identifier)) {
    const email = normEmail(identifier);
    if (db.student.email.toLowerCase() === email) {
      return { role: 'student', email: db.student.email, channel: 'email' };
    }
    if (db.parent && db.parent.email.toLowerCase() === email) {
      return { role: 'parent', email: db.parent.email, channel: 'email' };
    }
    return null;
  }

  if (db.parent && phonesMatch(identifier, db.parent.phone)) {
    return { role: 'parent', email: db.parent.email, channel: 'sms' };
  }
  return null;
}

export function authMock(opts: Opts = {}): AuthService {
  // Per-instance credential store. Parent accounts are "admin-provisioned":
  // they exist in `db` but have no password until set via the reset flow.
  const resetTokens = new Map<string, string>(); // resetToken -> canonical email
  const passwords = new Map<string, string>(); //   canonical email -> password

  const delayed = async <T>(fn: () => T): Promise<T> => {
    await withLatency(undefined, opts);
    return fn();
  };

  return {
    signIn: (identifier, password, role: Role) =>
      delayed(() => {
        if (role === 'parent') {
          const match = findAccount(identifier);
          if (!match) throw new ApiError('Not registered', 404);
          const stored = passwords.get(match.email);
          if (!stored) throw new ApiError('Set up your password first', 409);
          if (stored !== password) throw new ApiError('Incorrect password', 401);
          return { token: `mock-token-parent-${Date.now()}`, role: 'parent', email: match.email };
        }
        return { token: `mock-token-${role}-${Date.now()}`, role, email: identifier };
      }),
    signOut: () => withLatency(undefined, opts),
    requestOtp: (identifier) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        return { channel: match.channel, sent: true };
      }),
    verifyOtp: (identifier, code) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        if (code !== MOCK_OTP_CODE) throw new ApiError('Incorrect or expired code', 401);
        return { token: `mock-token-${match.role}-${Date.now()}`, role: match.role, email: match.email };
      }),
    verifyOtpForReset: (identifier, code) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        if (code !== MOCK_OTP_CODE) throw new ApiError('Incorrect or expired code', 401);
        const resetToken = `reset-${match.email}-${Date.now()}`;
        resetTokens.set(resetToken, match.email);
        return { resetToken, expiresIn: RESET_TTL_SECONDS };
      }),
    refresh: () =>
      delayed(() => ({
        access: `mock-token-refreshed-${Date.now()}`,
        refresh: `mock-refresh-${Date.now()}`,
      })),
    setPassword: ({ token, password }) =>
      delayed(() => {
        const email = resetTokens.get(token);
        if (!email) throw new ApiError('Reset link expired', 410);
        if (!isStrongPassword(password)) throw new ApiError('Password is too weak', 400);
        passwords.set(email, password);
        resetTokens.delete(token);
        return undefined;
      }),
    getMe: () => delayed(() => ({ role: 'student' as const, email: db.student.email })),
  };
}

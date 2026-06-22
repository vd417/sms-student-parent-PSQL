import type { AuthService } from '@/services/types';
import type { Role } from '@/models';
import { ApiError } from '@/services/errors';
import { withLatency } from './latency';
import { db } from './db';

interface Opts {
  ms?: number;
  errorRate?: number;
}

const MOCK_OTP_CODE = '123456';

const normEmail = (v: string) => v.trim().toLowerCase();
const normPhone = (v: string) => v.replace(/\D/g, '');
const isEmail = (v: string) => v.includes('@');

// Match phones tolerant of a country-code prefix by comparing trailing digits.
function phonesMatch(a: string, b: string): boolean {
  const da = normPhone(a);
  const db = normPhone(b);
  if (da.length < 7 || db.length < 7) return false;
  const len = Math.min(da.length, db.length);
  return da.slice(-len) === db.slice(-len);
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
  // Add latency, then run the thunk. A synchronous throw rejects the promise
  // (withLatency runs its own thunk inside setTimeout, so it can't do this).
  const delayed = async <T>(fn: () => T): Promise<T> => {
    await withLatency(undefined, opts);
    return fn();
  };

  return {
    signIn: (email, _password, role: Role) =>
      withLatency(() => ({ token: `mock-token-${role}-${Date.now()}`, role, email }), opts),
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
        return {
          token: `mock-token-${match.role}-${Date.now()}`,
          role: match.role,
          email: match.email,
        };
      }),
    refresh: () =>
      delayed(() => ({
        access: `mock-token-refreshed-${Date.now()}`,
        refresh: `mock-refresh-${Date.now()}`,
      })),
    setPassword: ({ password }) =>
      delayed(() => {
        if (!password || password.length < 4) throw new ApiError('Password is too short', 400);
        return undefined;
      }),
    getMe: () => delayed(() => ({ role: 'student' as const, email: db.student.email })),
  };
}

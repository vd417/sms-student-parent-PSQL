import type { AuthService, PasswordResetSent } from '@/services/types';
import type { Role } from '@/models';
import { ApiError } from '@/services/errors';
import { isStrongPassword } from '@/services/auth/password';
import { classifyIdentifier } from '@/services/auth/identifier';
import { maskDestination } from '@/services/auth/mask';
import { withLatency } from './latency';
import { db } from './db';

interface Opts {
  ms?: number;
  errorRate?: number;
  /**
   * How many times student-email delivery should fail before succeeding
   * (capped at 2 attempts, then falls back to parent). For tests.
   */
  studentEmailDeliveryFails?: number;
}

const MOCK_OTP_CODE = '123456';
const MAX_STUDENT_EMAIL_ATTEMPTS = 2;

const normEmail = (v: string) => v.trim().toLowerCase();
const normPhone = (v: string) => v.replace(/\D/g, '');
const isUsableEmail = (v: string | undefined | null): v is string =>
  !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function phonesMatch(a: string, b: string): boolean {
  const da = normPhone(a);
  const dbq = normPhone(b);
  if (da.length < 7 || dbq.length < 7) return false;
  const len = Math.min(da.length, dbq.length);
  return da.slice(-len) === dbq.slice(-len);
}

interface Match {
  role: Role;
  /** Canonical account key used for password storage. */
  accountKey: string;
  channel: 'sms' | 'email';
}

/** Look up an identifier (email, phone, or admission ID) against the mock DB. */
function findAccount(identifier: string): Match | null {
  const kind = classifyIdentifier(identifier);

  if (kind === 'email') {
    const email = normEmail(identifier);
    if (db.student.email.toLowerCase() === email) {
      return { role: 'student', accountKey: db.student.email, channel: 'email' };
    }
    if (db.parent && db.parent.email.toLowerCase() === email) {
      return { role: 'parent', accountKey: db.parent.email, channel: 'email' };
    }
    return null;
  }

  if (kind === 'phone') {
    if (db.parent && phonesMatch(identifier, db.parent.phone)) {
      return { role: 'parent', accountKey: db.parent.email, channel: 'sms' };
    }
    return null;
  }

  if (db.student.studentId.toUpperCase() === identifier.trim().toUpperCase()) {
    return { role: 'student', accountKey: db.student.email, channel: 'email' };
  }
  return null;
}

function sentResult(
  destination: string,
  channel: 'sms' | 'email',
  recipient: PasswordResetSent['recipient'],
): PasswordResetSent {
  return {
    channel,
    sent: true,
    sentTo: maskDestination(destination, channel),
    recipient,
  };
}

/**
 * Student OTP routing (SaaS):
 * 1. Prefer student email (up to 2 delivery attempts).
 * 2. If no student email / wrong email / 2 delivery failures → parent email.
 */
function resolveStudentOtpDestination(
  deliveryFailsRemaining: { n: number },
): PasswordResetSent {
  const studentEmail = db.student.email?.trim();
  const parentEmail = db.parent?.email?.trim();

  if (isUsableEmail(studentEmail)) {
    let attempts = 0;
    while (attempts < MAX_STUDENT_EMAIL_ATTEMPTS) {
      attempts += 1;
      if (deliveryFailsRemaining.n > 0) {
        deliveryFailsRemaining.n -= 1;
        continue; // delivery failed — retry / fall through
      }
      return sentResult(studentEmail, 'email', 'self');
    }
  }

  if (isUsableEmail(parentEmail)) {
    return sentResult(parentEmail, 'email', 'parent');
  }

  throw new ApiError(
    'No email on file for this student or linked parent. Contact your school.',
    404,
  );
}

export function authMock(opts: Opts = {}): AuthService {
  const pendingCodes = new Map<string, string>(); // accountKey -> active code
  const passwords = new Map<string, string>(); // accountKey -> password
  const deliveryFailsRemaining = { n: opts.studentEmailDeliveryFails ?? 0 };

  const delayed = async <T>(fn: () => T): Promise<T> => {
    await withLatency(undefined, opts);
    return fn();
  };

  return {
    signIn: (identifier, password, role: Role) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match || match.role !== role) throw new ApiError('Not registered', 404);
        const stored = passwords.get(match.accountKey);
        if (!stored) throw new ApiError('Set up your password first', 409);
        if (stored !== password) throw new ApiError('Incorrect password', 401);
        return {
          token: `mock-token-${role}-${Date.now()}`,
          role,
          email: match.accountKey,
        };
      }),
    signOut: () => withLatency(undefined, opts),
    requestPasswordReset: (identifier, role) =>
      delayed(() => {
        if (role === 'parent') {
          if (!db.parent) throw new ApiError('Not registered', 404);
          const kind = classifyIdentifier(identifier);
          const result = kind === 'phone'
            ? sentResult(db.parent.phone, 'sms', 'self')
            : sentResult(db.parent.email, 'email', 'self');
          pendingCodes.set(db.parent.email, MOCK_OTP_CODE);
          return result;
        }

        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);

        let result: PasswordResetSent;
        if (match.role === 'student') {
          result = resolveStudentOtpDestination(deliveryFailsRemaining);
        } else if (match.channel === 'sms' && db.parent) {
          result = sentResult(db.parent.phone, 'sms', 'self');
        } else {
          result = sentResult(match.accountKey, 'email', 'self');
        }

        pendingCodes.set(match.accountKey, MOCK_OTP_CODE);
        return result;
      }),
    resetPassword: (identifier, code, password) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        const activeCode = pendingCodes.get(match.accountKey);
        if (!activeCode || activeCode !== code) throw new ApiError('Incorrect or expired code', 401);
        if (!isStrongPassword(password)) throw new ApiError('Password is too weak', 400);
        passwords.set(match.accountKey, password);
        pendingCodes.delete(match.accountKey);
        return undefined;
      }),
    refresh: () =>
      delayed(() => ({
        access: `mock-token-refreshed-${Date.now()}`,
        refresh: `mock-refresh-${Date.now()}`,
      })),
    getMe: () => delayed(() => ({ role: 'student' as const, email: db.student.email })),
  };
}

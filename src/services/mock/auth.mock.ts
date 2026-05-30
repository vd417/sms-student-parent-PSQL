import type { AuthService } from '@/services/types';
import type { Role } from '@/models';
import { withLatency } from './latency';

interface Opts { ms?: number; errorRate?: number }

export function authMock(opts: Opts = {}): AuthService {
  return {
    signIn: (email, _password, role: Role) =>
      withLatency(
        () => ({ token: `mock-token-${role}-${Date.now()}`, role, email }),
        opts,
      ),
    signOut: () => withLatency(undefined, opts),
  };
}

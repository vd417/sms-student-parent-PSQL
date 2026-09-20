import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Role, Session } from '@/models';
import { services } from '@/services';
import type { PasswordResetSent } from '@/services/types';
import { setAuthToken, setRefreshHandler, setSessionExpiredHandler } from '@/api/client';
import { isConfirmedAuthFailure, isRefreshCredentialRejection } from '@/api/errorKind';
import { tokenStore } from '@/services/auth/tokenStore';
import { ApiError } from '@/services/errors';
import { clearSisStudentCache } from '@/services/http/sisStudent';
import { clearPersistedQueryCache } from './QueryProvider';
import { authReducer, initialAuthState } from './authReducer';

interface AuthContextValue {
  session: Session | null;
  role: Role | null;
  status: 'restoring' | 'unauthenticated' | 'authenticated';
  signIn: (email: string, password: string, role: Role) => Promise<void>;
  requestPasswordReset: (identifier: string, role?: Role) => Promise<PasswordResetSent>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function sessionFromPersisted(access: string, role: Role, email: string): Session {
  return { token: access, role, email };
}

/** NETWORK FAILURE != AUTH FAILURE != LOGOUT */
export function shouldInvalidateSession(err: unknown): boolean {
  return isConfirmedAuthFailure(err);
}

async function wipeLocalSession() {
  await tokenStore.clear();
  setAuthToken(null);
  clearSisStudentCache();
  await clearPersistedQueryCache();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  useEffect(() => {
    setRefreshHandler(async () => {
      const persisted = await tokenStore.load();
      if (!persisted?.refresh) return null;
      try {
        const { access, refresh } = await services.auth.refresh(persisted.refresh);
        await tokenStore.save({ ...persisted, access, refresh: refresh ?? persisted.refresh });
        return access;
      } catch (err) {
        if (isRefreshCredentialRejection(err)) return null;
        throw err;
      }
    });
    setSessionExpiredHandler(() => {
      void wipeLocalSession().then(() => dispatch({ type: 'SIGNED_OUT' }));
    });
    return () => {
      setRefreshHandler(null);
      setSessionExpiredHandler(null);
    };
  }, []);

  // Restore persisted auth without requiring the network. /me runs in the
  // background and may only log out on a confirmed auth failure.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await tokenStore.load();
      if (!persisted?.access) {
        await clearPersistedQueryCache();
        if (!cancelled) dispatch({ type: 'RESTORE_FAILED' });
        return;
      }
      setAuthToken(persisted.access);
      if (!cancelled) {
        dispatch({
          type: 'SIGNED_IN',
          session: sessionFromPersisted(persisted.access, persisted.role, persisted.email),
        });
      }
      try {
        const me = await services.auth.getMe();
        if (!cancelled) {
          dispatch({
            type: 'SIGNED_IN',
            session: sessionFromPersisted(persisted.access, me.role, me.email),
          });
        }
      } catch (err) {
        if (!shouldInvalidateSession(err)) return;
        await wipeLocalSession();
        if (!cancelled) dispatch({ type: 'SIGNED_OUT' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: state.session,
      role: state.session?.role ?? null,
      status: state.status,
      signIn: async (email, password, role) => {
        const session = await services.auth.signIn(email, password, role);
        if (session.role !== role) {
          await wipeLocalSession();
          throw new ApiError(
            role === 'student'
              ? 'This is a parent login. Switch to the Parent tab.'
              : 'This is a student login. Switch to the Student tab.',
            403,
            undefined,
            'wrong_role',
          );
        }
        await clearPersistedQueryCache();
        setAuthToken(session.token);
        dispatch({ type: 'SIGNED_IN', session });
      },
      requestPasswordReset: (identifier, role) => services.auth.requestPasswordReset(identifier, role),
      resetPassword: (identifier, code, password) =>
        services.auth.resetPassword(identifier, code, password),
      signOut: async () => {
        await services.auth.signOut();
        setAuthToken(null);
        clearSisStudentCache();
        await clearPersistedQueryCache();
        dispatch({ type: 'SIGNED_OUT' });
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

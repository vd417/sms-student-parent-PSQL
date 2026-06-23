import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Role, Session } from '@/models';
import { services } from '@/services';
import { setAuthToken, setRefreshHandler, setSessionExpiredHandler } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { authReducer, initialAuthState } from './authReducer';

interface AuthContextValue {
  session: Session | null;
  role: Role | null;
  status: 'restoring' | 'unauthenticated' | 'authenticated';
  signIn: (email: string, password: string, role: Role) => Promise<void>;
  requestOtp: (identifier: string) => Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  verifyResetCode: (identifier: string, code: string) => Promise<{ resetToken: string; expiresIn: number }>;
  setPassword: (args: { token: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Wire the client's refresh + session-expired handlers once. The refresh
  // handler loads the persisted refresh token, exchanges it, and re-persists.
  useEffect(() => {
    setRefreshHandler(async () => {
      const persisted = await tokenStore.load();
      if (!persisted?.refresh) return null;
      try {
        const { access, refresh } = await services.auth.refresh(persisted.refresh);
        await tokenStore.save({ ...persisted, access, refresh: refresh ?? persisted.refresh });
        return access;
      } catch {
        return null;
      }
    });
    setSessionExpiredHandler(() => {
      void tokenStore.clear();
      dispatch({ type: 'SIGNED_OUT' });
    });
    return () => {
      setRefreshHandler(null);
      setSessionExpiredHandler(null);
    };
  }, []);

  // Launch bootstrap: restore the persisted session and validate it via /me.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await tokenStore.load();
      if (!persisted?.access) {
        if (!cancelled) dispatch({ type: 'RESTORE_FAILED' });
        return;
      }
      setAuthToken(persisted.access);
      try {
        const me = await services.auth.getMe();
        if (!cancelled) {
          dispatch({
            type: 'SIGNED_IN',
            session: { token: persisted.access, role: me.role, email: me.email },
          });
        }
      } catch {
        await tokenStore.clear();
        setAuthToken(null);
        if (!cancelled) dispatch({ type: 'RESTORE_FAILED' });
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
        setAuthToken(session.token);
        dispatch({ type: 'SIGNED_IN', session });
      },
      requestOtp: (identifier) => services.auth.requestOtp(identifier),
      verifyResetCode: (identifier, code) => services.auth.verifyOtp(identifier, code),
      setPassword: (args) => services.auth.setPassword(args),
      signOut: async () => {
        await services.auth.signOut();
        setAuthToken(null);
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

import { createContext, ReactNode, useContext, useMemo, useReducer } from 'react';
import type { Role, Session } from '@/models';
import { services } from '@/services';
import { setAuthToken } from '@/api/client';
import { authReducer, initialAuthState } from './authReducer';

interface AuthContextValue {
  session: Session | null;
  role: Role | null;
  status: 'unauthenticated' | 'authenticated';
  signIn: (email: string, password: string, role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

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

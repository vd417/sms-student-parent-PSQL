import type { Session } from '@/models';

export interface AuthState {
  status: 'unauthenticated' | 'authenticated';
  session: Session | null;
}

export const initialAuthState: AuthState = { status: 'unauthenticated', session: null };

export type AuthAction = { type: 'SIGNED_IN'; session: Session } | { type: 'SIGNED_OUT' };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGNED_IN':
      return { status: 'authenticated', session: action.session };
    case 'SIGNED_OUT':
      return { status: 'unauthenticated', session: null };
    default:
      return state;
  }
}

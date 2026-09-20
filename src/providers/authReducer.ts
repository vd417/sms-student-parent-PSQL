import type { Session } from '@/models';

export interface AuthState {
  status: 'restoring' | 'unauthenticated' | 'authenticated';
  session: Session | null;
}

// Start in `restoring` so the app can validate a persisted session on launch
// before deciding between the login screen and the authenticated app.
export const initialAuthState: AuthState = { status: 'restoring', session: null };

export type AuthAction =
  | { type: 'SIGNED_IN'; session: Session }
  | { type: 'SIGNED_OUT' }
  | { type: 'RESTORE_FAILED' };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGNED_IN':
      return { status: 'authenticated', session: action.session };
    case 'SIGNED_OUT':
    case 'RESTORE_FAILED':
      return { status: 'unauthenticated', session: null };
    default:
      return state;
  }
}

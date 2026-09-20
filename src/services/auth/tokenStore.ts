import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Role } from '@/models';

/**
 * Persisted session. The refresh token and tenant id live here (never on the
 * in-memory `Session` model, which the UI consumes). Storage is secure on
 * native (Keychain/Keystore) and falls back to localStorage on web.
 */
export interface PersistedSession {
  access: string;
  refresh: string | null;
  role: Role;
  email: string;
  tenantId: string | null;
}

const KEY = 'schooldesk.session';
const isWeb = () => Platform.OS === 'web';

async function setRaw(value: string): Promise<void> {
  if (isWeb()) localStorage.setItem(KEY, value);
  else await SecureStore.setItemAsync(KEY, value);
}
async function getRaw(): Promise<string | null> {
  if (isWeb()) return localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}
async function delRaw(): Promise<void> {
  if (isWeb()) localStorage.removeItem(KEY);
  else await SecureStore.deleteItemAsync(KEY);
}

export const tokenStore = {
  async save(s: PersistedSession): Promise<void> {
    await setRaw(JSON.stringify(s));
  },
  async load(): Promise<PersistedSession | null> {
    const raw = await getRaw();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersistedSession;
    } catch {
      await delRaw();
      return null;
    }
  },
  async clear(): Promise<void> {
    await delRaw();
  },
};

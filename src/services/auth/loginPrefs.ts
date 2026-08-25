import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Role } from '@/models';

export interface LoginPrefs {
  rememberMe: boolean;
  role: Role;
  identifier: string;
}

const KEY = 'schooldesk.loginPrefs';
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

export const loginPrefs = {
  async save(prefs: LoginPrefs): Promise<void> {
    if (!prefs.rememberMe) {
      await delRaw();
      return;
    }
    await setRaw(JSON.stringify(prefs));
  },
  async load(): Promise<LoginPrefs | null> {
    const raw = await getRaw();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LoginPrefs;
    } catch {
      await delRaw();
      return null;
    }
  },
  async clear(): Promise<void> {
    await delRaw();
  },
};

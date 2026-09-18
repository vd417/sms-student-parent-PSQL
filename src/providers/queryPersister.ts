import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { tokenStore } from '@/services/auth/tokenStore';

const ACTIVE_KEY = 'schooldesk.query.active';

export async function queryCacheStorageKey(): Promise<string> {
  const session = await tokenStore.load();
  if (!session?.email) return 'schooldesk.query.anon';
  return `schooldesk.query.${session.email}.${session.tenantId ?? 'na'}`;
}

export const queryPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    const key = await queryCacheStorageKey();
    await AsyncStorage.setItem(ACTIVE_KEY, key);
    await AsyncStorage.setItem(key, JSON.stringify(client));
  },
  restoreClient: async () => {
    const key = await queryCacheStorageKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as PersistedClient;
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith('schooldesk.query'));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  },
};

import { Platform } from 'react-native';
import { tokenStore, type PersistedSession } from '@/services/auth/tokenStore';

// Web branch uses localStorage; native SecureStore is mocked so the module's
// import never pulls in native-only expo-modules-core wiring under jest.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

beforeEach(() => {
  (Platform as { OS: string }).OS = 'web';
  (global as unknown as { localStorage: Storage }).localStorage = (() => {
    const s: Record<string, string> = {};
    return {
      getItem: (k: string) => (k in s ? s[k] : null),
      setItem: (k: string, v: string) => {
        s[k] = v;
      },
      removeItem: (k: string) => {
        delete s[k];
      },
    } as unknown as Storage;
  })();
});

const sample: PersistedSession = {
  access: 'a',
  refresh: 'r',
  role: 'student',
  email: 'x@y.z',
  tenantId: 't1',
};

it('round-trips a session', async () => {
  await tokenStore.save(sample);
  expect(await tokenStore.load()).toEqual(sample);
});

it('returns null when empty', async () => {
  expect(await tokenStore.load()).toBeNull();
});

it('clears the session', async () => {
  await tokenStore.save(sample);
  await tokenStore.clear();
  expect(await tokenStore.load()).toBeNull();
});

it('returns null and self-heals on corrupt data', async () => {
  localStorage.setItem('schooldesk.session', '{not json');
  expect(await tokenStore.load()).toBeNull();
});

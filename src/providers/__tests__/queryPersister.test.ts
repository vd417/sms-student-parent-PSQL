import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryCacheStorageKey, queryPersister } from '@/providers/queryPersister';
import { tokenStore } from '@/services/auth/tokenStore';

jest.mock('@/services/auth/tokenStore', () => ({
  tokenStore: { load: jest.fn(), save: jest.fn(), clear: jest.fn() },
}));

describe('queryPersister', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (tokenStore.load as jest.Mock).mockReset();
  });

  it('namespaces cache by user email and tenant', async () => {
    (tokenStore.load as jest.Mock).mockResolvedValue({
      access: 'a',
      refresh: 'r',
      role: 'student',
      email: 'maya@school.edu',
      tenantId: 't1',
    });
    expect(await queryCacheStorageKey()).toBe('schooldesk.query.maya@school.edu.t1');
    await queryPersister.persistClient({ buster: '', timestamp: 1, clientState: { mutations: [], queries: [] } } as never);
    expect(await AsyncStorage.getItem('schooldesk.query.maya@school.edu.t1')).toBeTruthy();
  });

  it('does not restore another user cache', async () => {
    (tokenStore.load as jest.Mock).mockResolvedValue({
      access: 'a',
      refresh: 'r',
      role: 'student',
      email: 'other@school.edu',
      tenantId: 't2',
    });
    await AsyncStorage.setItem(
      'schooldesk.query.maya@school.edu.t1',
      JSON.stringify({ clientState: { queries: [{ queryKey: ['leak'] }] } }),
    );
    expect(await queryPersister.restoreClient()).toBeUndefined();
  });
});

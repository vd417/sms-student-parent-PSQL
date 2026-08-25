import {
  apiFetch,
  setAuthToken,
  setRefreshHandler,
  setSessionExpiredHandler,
} from '@/api/client';
import { ApiError } from '@/services/errors';

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const errJson = (status: number, body: unknown) =>
  ({ ok: false, status, json: async () => body }) as Response;

afterEach(() => {
  setAuthToken(null);
  setRefreshHandler(null);
  setSessionExpiredHandler(null);
  jest.restoreAllMocks();
});

it('returns parsed json on success', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(okJson({ data: { id: 1 } }));
  await expect(apiFetch('/x')).resolves.toEqual({ id: 1 });
});

it('does not reuse a cached GET body', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(okJson({ data: { id: 1 } }));
  await apiFetch('/timetable');
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
});

it('throws a normalized ApiError on non-2xx', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(errJson(404, { detail: 'not_registered' }));
  await expect(apiFetch('/x')).rejects.toMatchObject({ status: 404, message: 'not_registered' });
});

it('refreshes once on 401 then retries', async () => {
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(errJson(401, {}))
    .mockResolvedValueOnce(okJson({ data: { ok: true } }));
  setRefreshHandler(async () => 'new-token');
  await expect(apiFetch('/x')).resolves.toEqual({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('shares one refresh across concurrent 401s', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(errJson(401, {}))
    .mockResolvedValueOnce(errJson(401, {}))
    .mockResolvedValue(okJson({ data: { ok: true } }));
  const refresh = jest.fn(async () => 'new-token');
  setRefreshHandler(refresh);
  await Promise.all([apiFetch('/a'), apiFetch('/b')]);
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('fires session-expired when refresh fails', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(errJson(401, {}));
  setRefreshHandler(async () => null);
  const onExpired = jest.fn();
  setSessionExpiredHandler(onExpired);
  await expect(apiFetch('/x')).rejects.toBeInstanceOf(ApiError);
  expect(onExpired).toHaveBeenCalledTimes(1);
});

import {
  apiFetch,
  resetFetchGate,
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
  resetFetchGate();
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

it('omits Content-Type on GET so browsers do not extra-preflight list calls', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(okJson({ data: [] }));
  await apiFetch('/students/sis-1/attendance/periods?from=2026-08-01&to=2026-08-31');
  const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
  expect(headers['Content-Type']).toBeUndefined();
});

it('sends Content-Type on POST bodies', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(okJson({ data: { ok: true } }));
  await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ a: 1 }) });
  const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
  expect(headers['Content-Type']).toBe('application/json');
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

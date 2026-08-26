import { API_BASE_URL, FETCH_MAX_INFLIGHT, REQUEST_TIMEOUT_MS } from './config';
import { unwrapData } from './envelope';
import { ApiError, normalizeError } from '@/services/errors';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// Returns a fresh access token, or null when refresh is impossible.
let refreshHandler: (() => Promise<string | null>) | null = null;
export function setRefreshHandler(fn: (() => Promise<string | null>) | null) {
  refreshHandler = fn;
}

let sessionExpiredHandler: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  sessionExpiredHandler = fn;
}

// Single-flight refresh: concurrent 401s await one in-flight promise instead of
// each firing its own refresh.
let refreshing: Promise<string | null> | null = null;
function refreshOnce(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = refreshHandler()
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

let inflight = 0;
const waiters: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (inflight < FETCH_MAX_INFLIGHT) {
    inflight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      inflight += 1;
      resolve();
    });
  });
}

function releaseSlot() {
  inflight = Math.max(0, inflight - 1);
  const next = waiters.shift();
  if (next) next();
}

/** Test hook: drain the gate so suites do not leak blocked fetches. */
export function resetFetchGate() {
  inflight = 0;
  waiters.length = 0;
}

function requestHeaders(init: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
  if (init.body != null) headers['Content-Type'] = 'application/json';
  return { ...headers, ...(init.headers as Record<string, string> | undefined) };
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  await acquireSlot();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: requestHeaders(init),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Request timed out: ${path}`, 0);
    }
    throw new ApiError(`Network error: ${path}`, 0);
  } finally {
    clearTimeout(timer);
    releaseSlot();
  }
}

async function toResult<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw normalizeError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return unwrapData<T>(await res.json());
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await rawFetch(path, init);
  if (res.status !== 401) return toResult<T>(res);

  // 401 → attempt a single shared refresh, then retry the request once.
  const newToken = await refreshOnce();
  if (!newToken) {
    setAuthToken(null);
    sessionExpiredHandler?.();
    return toResult<T>(res); // throws the normalized 401
  }
  setAuthToken(newToken);
  const retry = await rawFetch(path, init);
  return toResult<T>(retry);
}

// Health ping against the server root (strip the trailing /v1).
export async function pingHealth(): Promise<boolean> {
  try {
    const origin = API_BASE_URL.replace(/\/v1\/?$/, '');
    const res = await fetch(`${origin}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

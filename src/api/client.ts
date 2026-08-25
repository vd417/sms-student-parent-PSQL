import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { unwrapData } from './envelope';
import { ApiError, normalizeError } from '@/services/errors';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
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

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Request timed out: ${path}`, 0);
    }
    throw new ApiError(`Network error: ${path}`, 0);
  } finally {
    clearTimeout(timer);
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

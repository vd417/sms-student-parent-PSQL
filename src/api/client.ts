import { API_BASE_URL, FETCH_MAX_INFLIGHT, REQUEST_TIMEOUT_MS } from './config';
import { unwrapData } from './envelope';
import { ApiError, normalizeError } from '@/services/errors';
import {
  classifyFetchFailure,
  isRefreshCredentialRejection,
  OFFLINE_WRITE_MESSAGE,
} from './errorKind';
import { getNetworkSnapshot } from './network';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// Returns a fresh access token, or null when refresh credentials are confirmed invalid.
// Transient/network failures MUST throw — they are not session expiry.
let refreshHandler: (() => Promise<string | null>) | null = null;
export function setRefreshHandler(fn: (() => Promise<string | null>) | null) {
  refreshHandler = fn;
}

let sessionExpiredHandler: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  sessionExpiredHandler = fn;
}

let refreshing: Promise<string | null> | null = null;
function refreshOnce(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = refreshHandler()
      .catch((err) => {
        if (isRefreshCredentialRejection(err)) return null;
        throw err;
      })
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

function methodOf(init?: RequestInit): string {
  return (init?.method ?? 'GET').toUpperCase();
}

function isWriteMethod(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

function skipAuthRefresh(path: string): boolean {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/logout') ||
    path.startsWith('/auth/password/')
  );
}

function allowOfflineWrite(path: string): boolean {
  return path.startsWith('/auth/logout') || path.startsWith('/auth/refresh');
}

function mergeSignals(external: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
  if (!external) return timeout;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([external, timeout]);
  }
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (external.aborted || timeout.aborted) {
    ctrl.abort();
    return ctrl.signal;
  }
  external.addEventListener('abort', abort);
  timeout.addEventListener('abort', abort);
  return ctrl.signal;
}

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await acquireSlot();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const callerSignal = init.signal ?? undefined;
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      signal: mergeSignals(callerSignal, controller.signal),
      headers: requestHeaders(init),
    });
  } catch (err) {
    throw classifyFetchFailure(err, path, {
      timedOut: controller.signal.aborted && !callerSignal?.aborted,
      callerAborted: Boolean(callerSignal?.aborted),
      online: getNetworkSnapshot().online,
    });
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

async function apiFetchOnce<T>(path: string, init: RequestInit): Promise<T> {
  const res = await rawFetch(path, init);
  if (res.status !== 401 || skipAuthRefresh(path)) return toResult<T>(res);

  // 401 is a confirmed HTTP auth challenge. Refresh may still fail for NETWORK
  // reasons — that must not look like session expiry.
  const newToken = await refreshOnce();
  if (!newToken) {
    setAuthToken(null);
    sessionExpiredHandler?.();
    return toResult<T>(res);
  }
  setAuthToken(newToken);
  const retry = await rawFetch(path, init);
  return toResult<T>(retry);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = methodOf(init);
  if (!getNetworkSnapshot().online && !allowOfflineWrite(path)) {
    if (isWriteMethod(method)) {
      throw new ApiError(OFFLINE_WRITE_MESSAGE, 0, undefined, 'NETWORK_OFFLINE', 'NETWORK_OFFLINE');
    }
    throw new ApiError(`Network error: ${path}`, 0, undefined, 'NETWORK_OFFLINE', 'NETWORK_OFFLINE');
  }
  return apiFetchOnce<T>(path, init);
}

export async function pingHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const origin = API_BASE_URL.replace(/\/v1\/?$/, '');
    const res = await fetch(`${origin}/health`, { signal: controller.signal, cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

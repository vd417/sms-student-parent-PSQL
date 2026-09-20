import { ApiError, kindFromHttpStatus, type ErrorKind } from '@/services/errors';

export type { ErrorKind };

export const OFFLINE_WRITE_MESSAGE =
  "You're offline. This action will be available when you're connected.";

export function classifyError(err: unknown): ErrorKind {
  if (err instanceof ApiError) {
    if (err.kind) return err.kind;
    if (err.status && err.status > 0) return kindFromHttpStatus(err.status);
    if (err.code === 'NETWORK_OFFLINE') return 'NETWORK_OFFLINE';
    const msg = err.message ?? '';
    if (/timed out/i.test(msg)) return 'NETWORK_TIMEOUT';
    if (/ENOTFOUND|getaddrinfo|dns/i.test(msg)) return 'DNS_FAILURE';
    if (/cancelled/i.test(msg)) return 'UNKNOWN_ERROR';
    if (/ECONNREFUSED|connection refused|Network request failed|Failed to fetch|Network error/i.test(msg)) {
      return 'CONNECTION_ERROR';
    }
    return 'CONNECTION_ERROR';
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError' || /timed out/i.test(err.message)) return 'NETWORK_TIMEOUT';
    if (/ENOTFOUND|getaddrinfo|dns/i.test(err.message)) return 'DNS_FAILURE';
    if (/ECONNREFUSED|connection refused/i.test(err.message)) return 'CONNECTION_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/** Confirmed backend rejection of credentials — the only logout trigger from API errors. */
export function isConfirmedAuthFailure(err: unknown): boolean {
  return classifyError(err) === 'AUTH_EXPIRED';
}

/** /auth/refresh rejected the refresh token itself — not a network/server outage. */
export function isRefreshCredentialRejection(err: unknown): boolean {
  if (isConfirmedAuthFailure(err)) return true;
  if (err instanceof ApiError && (err.status === 400 || err.status === 403)) return true;
  return false;
}

export function isTransientFailure(err: unknown): boolean {
  const kind = classifyError(err);
  return (
    kind === 'NETWORK_OFFLINE' ||
    kind === 'NETWORK_TIMEOUT' ||
    kind === 'DNS_FAILURE' ||
    kind === 'CONNECTION_ERROR' ||
    kind === 'SERVER_ERROR' ||
    kind === 'RATE_LIMITED'
  );
}

/** Safe to auto-retry. Offline waits for reconnect instead of hammering. */
export function isRetryable(err: unknown): boolean {
  const kind = classifyError(err);
  return (
    kind === 'NETWORK_TIMEOUT' ||
    kind === 'DNS_FAILURE' ||
    kind === 'CONNECTION_ERROR' ||
    kind === 'SERVER_ERROR' ||
    kind === 'RATE_LIMITED'
  );
}

export function isOfflineWriteError(err: unknown): boolean {
  return err instanceof ApiError && (err.kind === 'NETWORK_OFFLINE' || err.code === 'NETWORK_OFFLINE');
}

export function classifyFetchFailure(
  err: unknown,
  path: string,
  opts: { timedOut: boolean; callerAborted: boolean; online: boolean },
): ApiError {
  if (opts.callerAborted) {
    return new ApiError('Request cancelled', 0, undefined, undefined, 'UNKNOWN_ERROR');
  }
  if (opts.timedOut) {
    return new ApiError(`Request timed out: ${path}`, 0, undefined, undefined, 'NETWORK_TIMEOUT');
  }
  if (!opts.online) {
    return new ApiError(OFFLINE_WRITE_MESSAGE, 0, undefined, 'NETWORK_OFFLINE', 'NETWORK_OFFLINE');
  }
  const msg = err instanceof Error ? err.message : '';
  if (/ENOTFOUND|getaddrinfo|dns/i.test(msg)) {
    return new ApiError(`DNS failure: ${path}`, 0, undefined, undefined, 'DNS_FAILURE');
  }
  if (/ECONNREFUSED|connection refused/i.test(msg)) {
    return new ApiError(`Connection refused: ${path}`, 0, undefined, undefined, 'CONNECTION_ERROR');
  }
  return new ApiError(`Network error: ${path}`, 0, undefined, undefined, 'CONNECTION_ERROR');
}

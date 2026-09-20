import { ApiError } from '@/services/errors';
import {
  classifyError,
  classifyFetchFailure,
  isConfirmedAuthFailure,
  isRefreshCredentialRejection,
  isRetryable,
  isTransientFailure,
} from '@/api/errorKind';
import { setNetworkSnapshotForTests } from '@/api/network';
import { queryShouldRetry } from '@/api/retry';

afterEach(() => {
  setNetworkSnapshotForTests({ online: true, status: 'online' });
});

describe('classifyError', () => {
  it('treats HTTP 401 as confirmed auth, not a network failure', () => {
    const err = new ApiError('expired', 401);
    expect(classifyError(err)).toBe('AUTH_EXPIRED');
    expect(isConfirmedAuthFailure(err)).toBe(true);
    expect(isTransientFailure(err)).toBe(false);
  });

  it('does not treat timeout as auth failure', () => {
    const err = new ApiError('Request timed out: /me', 0, undefined, undefined, 'NETWORK_TIMEOUT');
    expect(isConfirmedAuthFailure(err)).toBe(false);
    expect(isTransientFailure(err)).toBe(true);
    expect(isRetryable(err)).toBe(true);
  });

  it('treats 400/403 on refresh as credential rejection, not an outage', () => {
    expect(isRefreshCredentialRejection(new ApiError('bad refresh', 400))).toBe(true);
    expect(isRefreshCredentialRejection(new ApiError('forbidden', 403))).toBe(true);
    expect(isRefreshCredentialRejection(new ApiError('bad gateway', 502))).toBe(false);
    expect(isRefreshCredentialRejection(new Error('enveloped'))).toBe(false);
  });

  it('does not treat 500/503 as logout conditions', () => {
    expect(isConfirmedAuthFailure(new ApiError('boom', 500))).toBe(false);
    expect(isConfirmedAuthFailure(new ApiError('busy', 503))).toBe(false);
    expect(isRetryable(new ApiError('busy', 503))).toBe(true);
  });

  it('does not retry while offline', () => {
    const err = new ApiError('offline', 0, undefined, 'NETWORK_OFFLINE', 'NETWORK_OFFLINE');
    setNetworkSnapshotForTests({ online: false, status: 'offline' });
    expect(isRetryable(err)).toBe(false);
    expect(queryShouldRetry(0, err)).toBe(false);
  });

  it('classifies DNS and connection refused separately from auth', () => {
    expect(
      classifyFetchFailure(new Error('getaddrinfo ENOTFOUND api'), '/x', {
        timedOut: false,
        callerAborted: false,
        online: true,
      }).kind,
    ).toBe('DNS_FAILURE');
    expect(
      classifyFetchFailure(new Error('connect ECONNREFUSED'), '/x', {
        timedOut: false,
        callerAborted: false,
        online: true,
      }).kind,
    ).toBe('CONNECTION_ERROR');
  });
});

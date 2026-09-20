import { isRetryable } from './errorKind';
import { getNetworkSnapshot } from './network';

export const QUERY_RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;

export function queryShouldRetry(failureCount: number, error: unknown): boolean {
  if (!getNetworkSnapshot().online) return false;
  if (!isRetryable(error)) return false;
  return failureCount < QUERY_RETRY_ATTEMPTS - 1;
}

export function queryRetryDelay(failureCount: number): number {
  const exp = RETRY_BASE_MS * 2 ** failureCount;
  const jitter = Math.floor(Math.random() * RETRY_BASE_MS);
  return Math.min(4_000, exp + jitter);
}

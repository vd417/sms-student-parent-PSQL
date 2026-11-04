type LoadState = {
  data: unknown;
  /** True only while a request is actually in flight. */
  isLoading?: boolean;
  /** True whenever there is no settled result yet, including cache restore. */
  isPending?: boolean;
  isError?: boolean;
  /** False while the query is disabled. A disabled query must not spin forever. */
  isEnabled?: boolean;
};

/**
 * No payload yet, and the query has not failed.
 * `isLoading` is false while a persisted cache is still restoring and while a
 * query is paused: status stays `pending`, fetchStatus stays `idle`. Treating
 * that as "ready" and reading `.data` throws (the post-login error screen).
 */
export function isInitialLoad(q: LoadState): boolean {
  if (q.data !== undefined || q.isError || q.isEnabled === false) return false;
  return Boolean(q.isPending || q.isLoading);
}

export function isBlockingError(q: { isError: boolean; data: unknown }): boolean {
  return q.isError && q.data === undefined;
}

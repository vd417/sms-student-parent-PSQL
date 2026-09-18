/** Prefer cached/last-known data over a full-screen error while offline. */
export function isInitialLoad(q: { isLoading: boolean; data: unknown }): boolean {
  return q.data === undefined && q.isLoading;
}

export function isBlockingError(q: { isError: boolean; data: unknown }): boolean {
  return q.isError && q.data === undefined;
}

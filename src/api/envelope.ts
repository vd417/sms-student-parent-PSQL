// The backend wraps every response in { data: T } (lists use { data, next_cursor }).
// Strip the envelope so service methods work with plain payloads.

export function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data;
  throw new Error('expected an enveloped { data } response');
}

export function unwrapList(raw: unknown): { data: unknown[]; nextCursor: string | null } {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const r = raw as { data: unknown; next_cursor?: string | null };
    if (!Array.isArray(r.data)) throw new Error('expected list data to be an array');
    return { data: r.data, nextCursor: r.next_cursor ?? null };
  }
  throw new Error('expected an enveloped list response');
}

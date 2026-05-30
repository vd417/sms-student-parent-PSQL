import { API_BASE_URL } from './config';
import { ApiError } from '@/services/errors';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new ApiError(`Request failed: ${path}`, res.status);
  return (await res.json()) as T;
}

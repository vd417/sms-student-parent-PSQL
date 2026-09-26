// Mirrors the app's identifier rule (docs/superpowers/specs/2026-07-24-admission-id-auth-design.md):
// contains '@' → email; 7–15 digits → phone; anything else → admission id.
export function loginBody(identifier: string, password: string, role: 'student' | 'parent'): Record<string, string> {
  const id = identifier.trim();
  if (id.includes('@')) return { email: id, password, role };
  if (/^\d{7,15}$/.test(id)) return { phone: id, password, role };
  return { student_id: id, password, role };
}

export async function call(
  base: string, token: string, path: string, init: RequestInit = {},
): Promise<{ status: number; raw: unknown }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers as object) } });
  const text = await res.text();
  let raw: unknown = null;
  if (text) {
    try { raw = JSON.parse(text); } catch { raw = { error: { code: 'non_json', message: text.slice(0, 200) } }; }
  }
  return { status: res.status, raw };
}

export async function login(
  base: string, identifier: string, password: string, role: 'student' | 'parent',
): Promise<string> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginBody(identifier, password, role)),
  });
  const body = (await res.json()) as { data?: { access_token?: string }; error?: { code: string; message: string } };
  if (!res.ok || !body.data?.access_token) {
    throw new Error(`${role} login failed: HTTP ${res.status} ${body.error?.code ?? ''} ${body.error?.message ?? ''}`);
  }
  return body.data.access_token;
}

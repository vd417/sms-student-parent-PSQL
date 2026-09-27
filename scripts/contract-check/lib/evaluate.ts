export type Status = 'PASS' | 'WARN' | 'FAIL';

export interface Expect {
  kind: 'object' | 'list';
  dto?: string;
  keys?: string[];
  map?: (item: any) => unknown;
  allowEmpty?: boolean;
}

type Outcome = { status: Status; notes: string[]; data: unknown };

const fail = (notes: string[], data: unknown = undefined): Outcome => ({ status: 'FAIL', notes, data });

export function evaluate(httpStatus: number, raw: unknown, expect: Expect, required: string[]): Outcome {
  if (httpStatus < 200 || httpStatus >= 300) {
    const err = (raw as { error?: { code?: string; message?: string } } | null)?.error;
    return fail([`HTTP ${httpStatus}: ${err?.code ?? '-'} ${err?.message ?? ''}`.trim()]);
  }
  if (httpStatus === 204 && expect.kind === 'object' && required.length === 0) {
    return { status: 'PASS', notes: [], data: null };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('data' in raw)) {
    return fail(['missing {data} envelope']);
  }
  const env = raw as { data: unknown; next_cursor?: string | null };
  const data = env.data;

  let items: unknown[];
  if (expect.kind === 'list') {
    if (!Array.isArray(data)) return fail(['expected data to be an array']);
    if (env.next_cursor) return fail(['next_cursor is set; the app reads the first page only'], data);
    items = data;
  } else {
    if (data === null || data === undefined) return fail(['data is null']);
    items = [data];
  }

  const missing = new Set<string>();
  for (const item of items) {
    for (const key of required) {
      if (item === null || typeof item !== 'object' || !(key in item)) missing.add(key);
    }
  }
  if (missing.size > 0) return fail([`missing required keys: ${[...missing].join(', ')}`], data);

  if (expect.map) {
    try {
      items.forEach((item) => expect.map!(item));
    } catch (e) {
      return fail([`mapper threw: ${(e as Error).message}`], data);
    }
  }

  if (expect.kind === 'list' && items.length === 0 && !expect.allowEmpty) {
    return { status: 'WARN', notes: ['empty list'], data };
  }
  return { status: 'PASS', notes: [], data };
}

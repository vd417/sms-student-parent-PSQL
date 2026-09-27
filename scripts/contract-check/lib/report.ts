import * as fs from 'fs';
import * as path from 'path';
import type { Status } from './evaluate';

export interface CheckResult { role: string; name: string; path: string; status: Status; notes: string[] }

const OUT_DIR = path.resolve(__dirname, '../out');

// Raw responses hold real school data: out/ is git-ignored and stays on this machine.
export function saveRaw(role: string, name: string, raw: unknown): void {
  const dir = path.join(OUT_DIR, role);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(raw, null, 2));
}

export function formatTable(results: CheckResult[]): string {
  const rows = results.map((r) => `${r.status.padEnd(4)}  ${r.role.padEnd(7)}  ${r.name.padEnd(28)}  ${r.path}${r.notes.length ? `\n        ↳ ${r.notes.join('; ')}` : ''}`);
  const count = (s: Status) => results.filter((r) => r.status === s).length;
  return [...rows, '', `PASS ${count('PASS')}  WARN ${count('WARN')}  FAIL ${count('FAIL')}`].join('\n');
}

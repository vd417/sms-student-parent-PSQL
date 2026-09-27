import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// Required (non-`?`) keys of every interface in the app's wire DTOs. This keeps the check in
// lock-step with what the app actually declares, with no hand-maintained schema. Keys inherited
// through `extends` are not followed.
const DTO_FILE = path.resolve(__dirname, '../../../src/services/http/dtos.ts');
let cache: Map<string, string[]> | null = null;

export function parseRequiredKeys(source: string): Map<string, string[]> {
  const sf = ts.createSourceFile('dtos.ts', source, ts.ScriptTarget.Latest, true);
  const out = new Map<string, string[]>();
  sf.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node)) return;
    const keys = node.members
      .filter(ts.isPropertySignature)
      .filter((m) => !m.questionToken)
      .map((m) => m.name.getText(sf).replace(/^['"]|['"]$/g, ''));
    out.set(node.name.text, keys);
  });
  return out;
}

export function requiredKeys(dto: string): string[] {
  cache ??= parseRequiredKeys(fs.readFileSync(DTO_FILE, 'utf8'));
  const keys = cache.get(dto);
  if (!keys) throw new Error(`unknown DTO interface: ${dto}`);
  return keys;
}

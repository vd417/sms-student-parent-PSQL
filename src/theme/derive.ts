import { hueColor, hueForName, type SubjectHue } from './colors';

export type ColorSet = {
  color: string;
  colorSoft: string;
  colorTint: string;
};

/**
 * Core 6 subject-box hues — blue / red / yellow first so they always show
 * for a typical class (≤6 subjects).
 */
export const SUBJECT_BOX_HUES: SubjectHue[] = [
  'blue', // #0D47A1
  'red', // #C62828
  'yellow', // #36656B
  'indigo', // #133458 dark blue
  'slate', // #0B1849
  'teal', // #077A7D
];

/** Core 6 + magenta for 7th+. */
export const SUBJECT_HUES: SubjectHue[] = [...SUBJECT_BOX_HUES, 'coral'];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function colorSetForHue(hue: SubjectHue): ColorSet {
  return {
    color: hueColor(hue),
    colorSoft: hueColor(hue, 'soft'),
    colorTint: hueColor(hue, 'tint'),
  };
}

export function deriveColorSet(id: string): ColorSet {
  return colorSetForHue(SUBJECT_HUES[hash(id) % SUBJECT_HUES.length]);
}

export function hueForSeed(id: string): SubjectHue {
  return hueForName(id);
}

/**
 * Assign distinct hues so ≤6 subjects never share a colour.
 * Prefers name-hash when free; otherwise next free core/extra slot.
 */
export function assignDistinctSubjectHues<T extends { id: string; name: string; color: SubjectHue }>(
  subjects: T[],
): T[] {
  if (subjects.length === 0) return subjects;

  const order = [...subjects].sort(
    (a, b) => a.id.localeCompare(b.id) || a.name.localeCompare(b.name),
  );
  const used = new Set<SubjectHue>();
  const byId = new Map<string, SubjectHue>();

  for (const s of order) {
    // ≤6 subjects: only the core 6 user colours (all distinct).
    // 7+: allow dark red / yellow too.
    const pool = order.length <= SUBJECT_BOX_HUES.length ? SUBJECT_BOX_HUES : SUBJECT_HUES;
    const preferred = hueForName(s.name);
    let pick: SubjectHue | undefined =
      pool.includes(preferred) && !used.has(preferred) ? preferred : undefined;

    if (!pick) {
      pick = pool.find((h) => !used.has(h));
    }
    if (!pick) {
      pick = SUBJECT_BOX_HUES[used.size % SUBJECT_BOX_HUES.length];
    }

    used.add(pick);
    byId.set(s.id, pick);
  }

  return subjects.map((s) => ({ ...s, color: byId.get(s.id) ?? s.color }));
}

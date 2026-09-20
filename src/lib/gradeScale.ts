/** Same CBSE-style bands as SMS Admin (`format.gradeFor` / `gpaFor`). */
export function gradeFor(pct: number): string {
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
}

export function gpaFor(grade: string): number {
  return (
    ({ A1: 10, A2: 9, B1: 8, B2: 7, C1: 6, C2: 5, D: 4, E: 3 } as Record<string, number>)[
      grade
    ] ?? 0
  );
}

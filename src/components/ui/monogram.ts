export function monogramFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    const w = words[0];
    // Short codes (e.g. SCC) read better in full than a lone first letter.
    if (w.length <= 3) return w.toUpperCase();
    return w[0].toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

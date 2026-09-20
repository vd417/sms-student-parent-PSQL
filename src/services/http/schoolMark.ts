/** Keep school logo paint-able in RN / web Image (oversized data-URIs often fail). */
export const MAX_SCHOOL_MARK_CHARS = 350_000;

export function pickSchoolMarkUrl(logoUrl?: string | null, imageUrl?: string | null): string {
  return schoolMarkCandidates(logoUrl, imageUrl)[0] ?? '';
}

/** Ordered list: school logo first, then school cover image. */
export function schoolMarkCandidates(
  logoUrl?: string | null,
  imageUrl?: string | null,
): string[] {
  const logo = (logoUrl ?? '').trim();
  const image = (imageUrl ?? '').trim();
  const out: string[] = [];
  const push = (u: string) => {
    if (u && !out.includes(u)) out.push(u);
  };
  push(logo);
  push(image);
  return out;
}

type ShrinkOpts = { maxEdge?: number; quality?: number; maxChars?: number };

/**
 * Shrink a data-URI logo so Image can render it. No-ops for http(s) URLs and
 * already-small marks. Uses canvas (web / RN-web).
 */
export async function ensurePaintableSchoolMark(
  url: string,
  opts: ShrinkOpts = {},
): Promise<string> {
  const src = (url ?? '').trim();
  if (!src) return '';
  const maxChars = opts.maxChars ?? MAX_SCHOOL_MARK_CHARS;
  if (!src.startsWith('data:image/') || src.length <= maxChars) return src;

  try {
    return await shrinkDataUrl(src, {
      /* Keep enough pixels for report-card watermark / header (sharp, not soft 256 JPEG). */
      maxEdge: opts.maxEdge ?? 640,
      quality: opts.quality ?? 0.92,
    });
  } catch {
    return src;
  }
}

export async function shrinkDataUrl(
  dataUrl: string,
  opts: { maxEdge: number; quality: number },
): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;

  const img = await loadHtmlImage(dataUrl);
  const scale = Math.min(1, opts.maxEdge / Math.max(img.width || 1, img.height || 1));
  const w = Math.max(1, Math.round((img.width || 1) * scale));
  const h = Math.max(1, Math.round((img.height || 1) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  /* PNG keeps crisp logo edges (JPEG softens marks on white/transparent). */
  if (dataUrl.startsWith('data:image/png') || dataUrl.includes('image/svg')) {
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/jpeg', opts.quality);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const ImageCtor = typeof window !== 'undefined' ? window.Image : undefined;
    if (!ImageCtor) {
      reject(new Error('no html Image'));
      return;
    }
    const img = new ImageCtor();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });
}

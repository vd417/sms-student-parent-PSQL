export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`Not implemented: ${what}. Provide an HTTP implementation.`);
    this.name = 'NotImplementedError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readErrorCode(rawBody: unknown): string | undefined {
  if (!rawBody || typeof rawBody !== 'object') return undefined;
  const b = rawBody as Record<string, unknown>;
  const nested = b.error;
  if (nested && typeof nested === 'object') {
    const c = (nested as Record<string, unknown>).code;
    if (typeof c === 'string' && c.length > 0) return c;
  }
  return typeof b.code === 'string' && b.code.length > 0 ? b.code : undefined;
}

function readErrorMessage(rawBody: unknown): string | undefined {
  if (!rawBody || typeof rawBody !== 'object') return undefined;
  const b = rawBody as Record<string, unknown>;
  const nested = b.error;
  if (nested && typeof nested === 'object') {
    const m = (nested as Record<string, unknown>).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  if (typeof b.detail === 'string' && b.detail.length > 0) return b.detail;
  if (typeof b.message === 'string' && b.message.length > 0) return b.message;
  if (typeof b.title === 'string' && b.title.length > 0) return b.title;
  return undefined;
}

/**
 * Normalize a non-2xx response body into an ApiError. Tolerant of RFC7807
 * problem+json ({type,title,detail}), the API envelope ({error:{code,message}}),
 * and the simpler {message} shape; falls back to a status string when the body
 * carries no usable text.
 */
export function normalizeError(status: number, rawBody: unknown): ApiError {
  const message = readErrorMessage(rawBody) ?? `Request failed (${status})`;
  return new ApiError(message, status, rawBody, readErrorCode(rawBody));
}

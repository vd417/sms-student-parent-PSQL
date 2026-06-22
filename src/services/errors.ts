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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Normalize a non-2xx response body into an ApiError. Tolerant of RFC7807
 * problem+json ({type,title,detail}) and the simpler {message} shape; falls
 * back to a status string when the body carries no usable text.
 */
export function normalizeError(status: number, rawBody: unknown): ApiError {
  let message = `Request failed (${status})`;
  if (rawBody && typeof rawBody === 'object') {
    const b = rawBody as Record<string, unknown>;
    if (typeof b.detail === 'string') message = b.detail;
    else if (typeof b.message === 'string') message = b.message;
    else if (typeof b.title === 'string') message = b.title;
  }
  return new ApiError(message, status, rawBody);
}

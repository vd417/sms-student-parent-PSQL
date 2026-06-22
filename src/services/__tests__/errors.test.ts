import { ApiError, normalizeError } from '@/services/errors';

describe('normalizeError', () => {
  it('uses RFC7807 detail for the message', () => {
    const e = normalizeError(404, { type: 'about:blank', title: 'Not Found', detail: 'not_registered' });
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(404);
    expect(e.message).toBe('not_registered');
    expect(e.body).toEqual({ type: 'about:blank', title: 'Not Found', detail: 'not_registered' });
  });

  it('falls back to {message}', () => {
    expect(normalizeError(400, { message: 'bad input' }).message).toBe('bad input');
  });

  it('falls back to {title} when no detail/message', () => {
    expect(normalizeError(403, { title: 'Forbidden' }).message).toBe('Forbidden');
  });

  it('falls back to a status string when body is empty', () => {
    expect(normalizeError(500, null).message).toBe('Request failed (500)');
  });
});

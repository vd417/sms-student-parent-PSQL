import { isBlockingError, isInitialLoad } from '@/lib/queryStatus';

describe('queryStatus', () => {
  it('shows cached data instead of a blocking error', () => {
    expect(isBlockingError({ isError: true, data: { id: 1 } })).toBe(false);
    expect(isBlockingError({ isError: true, data: undefined })).toBe(true);
  });

  it('does not treat a cached payload as an initial load', () => {
    expect(isInitialLoad({ isLoading: true, data: { id: 1 } })).toBe(false);
    expect(isInitialLoad({ isLoading: true, data: undefined })).toBe(true);
  });
});

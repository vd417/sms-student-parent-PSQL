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

  it('waits while a query is pending but not fetching (cache restore)', () => {
    expect(
      isInitialLoad({
        isLoading: false,
        isPending: true,
        isError: false,
        isEnabled: true,
        data: undefined,
      }),
    ).toBe(true);
  });

  it('does not spin on a disabled query or a settled error', () => {
    expect(
      isInitialLoad({ isLoading: false, isPending: true, isEnabled: false, data: undefined }),
    ).toBe(false);
    expect(isInitialLoad({ isLoading: false, isPending: false, isError: true, data: undefined })).toBe(
      false,
    );
  });
});

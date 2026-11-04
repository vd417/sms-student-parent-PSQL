import { navigationRef } from '@/navigation/navigationRef';
import { routeFromResponse } from '@/components/PushNotifications';

const mockNavigate = jest.fn();
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: (...a: unknown[]) => mockNavigate(...a),
  },
}));

function response(data: Record<string, unknown>) {
  return { notification: { request: { content: { data } } } } as any;
}

describe('routeFromResponse', () => {
  afterEach(() => jest.clearAllMocks());

  it('navigates a bus push to the Transport screen', () => {
    routeFromResponse(response({ kind: 'approaching', trip_id: 't1' }), 'parent');
    expect(mockNavigate).toHaveBeenCalledWith('Transport');
  });

  it('does nothing when the response is null', () => {
    routeFromResponse(null, 'parent');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when navigation is not ready', () => {
    (navigationRef.isReady as jest.Mock).mockReturnValueOnce(false);
    routeFromResponse(response({ kind: 'approaching' }), 'parent');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

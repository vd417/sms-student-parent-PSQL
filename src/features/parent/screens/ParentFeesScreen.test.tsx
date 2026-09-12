import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ParentFeesScreen } from './ParentFeesScreen';
import { useFees, useCreateRazorpayOrder, useVerifyRazorpayPayment } from '@/hooks/useFees';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useToast } from '@/providers/ToastProvider';

jest.mock('@/hooks/useFees', () => ({
  useFees: jest.fn(),
  useCreateRazorpayOrder: jest.fn(),
  useVerifyRazorpayPayment: jest.fn(),
}));

jest.mock('@/hooks/useParent', () => ({
  useChildren: jest.fn(),
}));

jest.mock('@/providers/ChildProvider', () => ({
  useSelectedChild: jest.fn(),
}));

jest.mock('@/providers/ToastProvider', () => ({
  useToast: jest.fn(),
}));

const dueFee = {
  id: 'fee-1',
  period: 'Term 1',
  dueDate: '2026-09-20',
  amount: 4800,
  status: 'due' as const,
  items: [{ l: 'Tuition', amt: 4800 }],
};

const order = { orderId: 'order_x', amount: 480000, currency: 'INR', keyId: 'rzp_test_x' };

function renderScreen() {
  return render(
    <NavigationContainer>
      <ParentFeesScreen />
    </NavigationContainer>,
  );
}

describe('ParentFeesScreen', () => {
  const toast = jest.fn();
  const mutateAsyncCreateOrder = jest.fn();
  const mutateAsyncVerify = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelectedChild as jest.Mock).mockReturnValue({ childId: 'child-1', setChildId: jest.fn() });
    (useToast as jest.Mock).mockReturnValue(toast);
    (useChildren as jest.Mock).mockReturnValue({
      data: [{ id: 'child-1', name: 'Kid', initials: 'K', grade: '5', school: 'Green Valley School', avg: 0, attn: 0, fee: '', unread: 0, hue: 'blue' }],
    });
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [dueFee],
      refetch: jest.fn(),
    });
    (useCreateRazorpayOrder as jest.Mock).mockReturnValue({
      mutateAsync: mutateAsyncCreateOrder,
      isPending: false,
    });
    (useVerifyRazorpayPayment as jest.Mock).mockReturnValue({
      mutateAsync: mutateAsyncVerify,
      isPending: false,
    });
  });

  it('starts a Razorpay order and opens the checkout modal when "Pay now" is tapped', async () => {
    mutateAsyncCreateOrder.mockResolvedValue(order);
    const { getByText, UNSAFE_getByType } = renderScreen();

    fireEvent.press(getByText('Pay now'));

    await waitFor(() => expect(mutateAsyncCreateOrder).toHaveBeenCalledWith('fee-1'));

    const WebView = require('react-native-webview').WebView;
    await waitFor(() => {
      const webview = UNSAFE_getByType(WebView);
      expect(webview.props.source.html).toContain('order_x');
    });
  });

  it('shows a toast and does not open the modal when order creation fails', async () => {
    mutateAsyncCreateOrder.mockRejectedValue(new Error('network'));
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Pay now'));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('Could not start payment. Please try again.'),
    );
  });

  it('verifies the payment when checkout succeeds and shows a success toast', async () => {
    mutateAsyncCreateOrder.mockResolvedValue(order);
    mutateAsyncVerify.mockResolvedValue({ id: 'fee-1', status: 'paid' });
    const { getByText, UNSAFE_getByType } = renderScreen();

    fireEvent.press(getByText('Pay now'));

    const WebView = require('react-native-webview').WebView;
    let webview;
    await waitFor(() => {
      webview = UNSAFE_getByType(WebView);
    });

    await act(async () => {
      webview!.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'success',
            razorpay_order_id: 'order_x',
            razorpay_payment_id: 'pay_x',
            razorpay_signature: 'sig_x',
          }),
        },
      });
    });

    await waitFor(() =>
      expect(mutateAsyncVerify).toHaveBeenCalledWith({
        feeId: 'fee-1',
        body: { razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'sig_x' },
      }),
    );
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Payment successful'));
  });

  it('shows a toast and dismisses the modal when checkout is dismissed', async () => {
    mutateAsyncCreateOrder.mockResolvedValue(order);
    const { getByText, UNSAFE_getByType, UNSAFE_queryByType } = renderScreen();

    fireEvent.press(getByText('Pay now'));

    const WebView = require('react-native-webview').WebView;
    let webview;
    await waitFor(() => {
      webview = UNSAFE_getByType(WebView);
    });

    await act(async () => {
      webview!.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'dismiss' }) } });
    });

    await waitFor(() => expect(UNSAFE_queryByType(WebView)).toBeNull());
    expect(mutateAsyncVerify).not.toHaveBeenCalled();
  });

  it('disables the button and shows progress copy while the order is being created', () => {
    (useCreateRazorpayOrder as jest.Mock).mockReturnValue({
      mutateAsync: mutateAsyncCreateOrder,
      isPending: true,
    });
    const { getByText } = renderScreen();
    expect(getByText('Starting payment…')).toBeTruthy();
  });
});

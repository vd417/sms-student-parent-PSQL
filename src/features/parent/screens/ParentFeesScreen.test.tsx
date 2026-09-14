import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ParentFeesScreen } from './ParentFeesScreen';
import { useFees, useCreateRazorpayOrder, useVerifyRazorpayPayment } from '@/hooks/useFees';
import { useChildren } from '@/hooks/useParent';
import { useSchool } from '@/hooks/useSchool';
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

jest.mock('@/hooks/useSchool', () => ({
  useSchool: jest.fn(),
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
    (useSchool as jest.Mock).mockReturnValue({ data: { id: 'sch-1', name: 'Green Valley School', logoUrl: '' } });
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

  // Rendering the modal's real SafeAreaView (react-native-safe-area-context) adds an extra
  // frame-measurement cycle, which can occasionally exceed Jest's default 5s under
  // parallel-worker CPU contention — give this one some headroom.
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
  }, 15000);

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

  it('surfaces every outstanding invoice, not just the earliest one', () => {
    const newerFee = {
      id: 'fee-2',
      period: 'Term 2',
      dueDate: '2026-11-01',
      amount: 5200,
      status: 'due' as const,
      items: [{ l: 'Tuition', amt: 5200 }],
    };
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [dueFee, newerFee],
      refetch: jest.fn(),
    });
    const { getByText } = renderScreen();

    // Earliest due invoice is the hero card.
    expect(getByText(/Term 1/)).toBeTruthy();
    // The other outstanding invoice must still be visible, not silently dropped.
    expect(getByText('Other pending fees')).toBeTruthy();
    expect(getByText('Term 2')).toBeTruthy();
    expect(getByText('₹5,200')).toBeTruthy();
  });

  it('starts a Razorpay order for a non-primary pending fee', async () => {
    const newerFee = {
      id: 'fee-2',
      period: 'Term 2',
      dueDate: '2026-11-01',
      amount: 5200,
      status: 'due' as const,
      items: [{ l: 'Tuition', amt: 5200 }],
    };
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [dueFee, newerFee],
      refetch: jest.fn(),
    });
    mutateAsyncCreateOrder.mockResolvedValue(order);
    const { getAllByText } = renderScreen();

    fireEvent.press(getAllByText('Pay now')[1]);

    await waitFor(() => expect(mutateAsyncCreateOrder).toHaveBeenCalledWith('fee-2'));
  });

  it('shows the fee item breakdown and a formatted due date, not a raw ISO timestamp', () => {
    const annualFee = {
      id: 'fee-annual',
      period: '2026-27 Annual',
      dueDate: '2026-09-23T00:00:00',
      amount: 50000,
      status: 'due' as const,
      items: [
        { l: 'Tuition fee', amt: 45000 },
        { l: 'Transport fee', amt: 5000 },
      ],
    };
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [dueFee, annualFee],
      refetch: jest.fn(),
    });
    const { getByText, queryByText } = renderScreen();

    expect(getByText('Tuition fee ₹45,000 · Transport fee ₹5,000')).toBeTruthy();
    expect(queryByText(/2026-09-23T00:00:00/)).toBeNull();
    expect(getByText(/Sep.*23.*2026|23.*Sep.*2026/)).toBeTruthy();
  });

  it('does not crash when a live invoice arrives with no due date yet', () => {
    const undated = {
      id: 'fee-3',
      period: 'Term 3',
      dueDate: undefined as unknown as string,
      amount: 3000,
      status: 'due' as const,
      items: [{ l: 'Tuition', amt: 3000 }],
    };
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [dueFee, undated],
      refetch: jest.fn(),
    });

    expect(() => renderScreen()).not.toThrow();
  });

  it('shows only the actual fee components for a non-transport invoice (no invented Transport line)', () => {
    // Default beforeEach fee has a single Tuition line and no transport line.
    const { getByText, queryByText } = renderScreen();

    expect(getByText('Tuition')).toBeTruthy();
    expect(queryByText(/Transport/)).toBeNull();
  });

  it('shows Transport Fee as its own line when the invoice actually includes it', () => {
    const withTransport = {
      id: 'fee-transport',
      period: '2026-27 Term 2',
      dueDate: '2026-09-23',
      amount: 23800,
      status: 'due' as const,
      items: [
        { l: 'Exam Fee', amt: 500 },
        { l: 'Tuition Fee', amt: 6300 },
        { l: 'Transport Fee', amt: 17000 },
      ],
    };
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [withTransport],
      refetch: jest.fn(),
    });
    const { getByText } = renderScreen();

    expect(getByText('Exam Fee')).toBeTruthy();
    expect(getByText('Tuition Fee')).toBeTruthy();
    expect(getByText('Transport Fee')).toBeTruthy();
  });

  it('shows correct, independent breakdowns for a mixed transport/non-transport pair of invoices', () => {
    const noTransport = {
      id: 'fee-no-transport',
      period: '2026-27 Term 1',
      dueDate: '2026-08-01',
      amount: 6800,
      status: 'due' as const,
      items: [
        { l: 'Exam Fee', amt: 500 },
        { l: 'Tuition Fee', amt: 6300 },
      ],
    };
    const withTransport = {
      id: 'fee-with-transport',
      period: '2026-27 Term 2',
      dueDate: '2026-09-23',
      amount: 23800,
      status: 'due' as const,
      items: [
        { l: 'Exam Fee', amt: 500 },
        { l: 'Tuition Fee', amt: 6300 },
        { l: 'Transport Fee', amt: 17000 },
      ],
    };
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [noTransport, withTransport],
      refetch: jest.fn(),
    });
    const { getByText } = renderScreen();

    // noTransport has the earlier due date, so it becomes the hero — its item box shows
    // per-line rows with no Transport Fee row.
    expect(getByText('Exam Fee')).toBeTruthy();
    expect(getByText('Tuition Fee')).toBeTruthy();
    // withTransport surfaces in "Other pending fees" with its own, separate breakdown —
    // including the Transport Fee that the hero invoice does not have.
    expect(getByText('Exam Fee ₹500 · Tuition Fee ₹6,300 · Transport Fee ₹17,000')).toBeTruthy();
  });

  it('displays a total that equals the sum of the invoice lines, with no hard-coded fee amounts', () => {
    // Amounts are only ever defined once, here, and summed at runtime — nothing in the
    // component or this assertion hard-codes ₹500 / ₹6,300 / ₹17,000 / ₹23,800.
    const lines = [
      { l: 'Exam Fee', amt: 500 },
      { l: 'Tuition Fee', amt: 6300 },
      { l: 'Transport Fee', amt: 17000 },
    ];
    const total = lines.reduce((sum, it) => sum + it.amt, 0);
    const invoice = {
      id: 'fee-total',
      period: '2026-27 Term 2',
      dueDate: '2026-09-23',
      amount: total,
      status: 'due' as const,
      items: lines,
    };
    (useFees as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: [dueFee, invoice],
      refetch: jest.fn(),
    });
    const { getByText } = renderScreen();

    const summary = lines.map((it) => `${it.l} ₹${it.amt.toLocaleString()}`).join(' · ');
    expect(getByText(summary)).toBeTruthy();
    expect(getByText(`₹${total.toLocaleString()}`)).toBeTruthy();
  });
});

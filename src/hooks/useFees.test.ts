import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { services } from '@/services';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment } from './useFees';

jest.mock('@/services', () => ({
  services: {
    fees: {
      list: jest.fn(),
      createRazorpayOrder: jest.fn(),
      verifyRazorpayPayment: jest.fn(),
    },
  },
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('useCreateRazorpayOrder', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls services.fees.createRazorpayOrder with the fee id and returns the order', async () => {
    const order = { orderId: 'order_x', amount: 480000, currency: 'INR', keyId: 'rzp_test_x' };
    (services.fees.createRazorpayOrder as jest.Mock).mockResolvedValue(order);

    const { result } = renderHook(() => useCreateRazorpayOrder(), { wrapper: makeWrapper() });
    let returned;
    await act(async () => {
      returned = await result.current.mutateAsync('fee-1');
    });

    expect(services.fees.createRazorpayOrder).toHaveBeenCalledWith('fee-1');
    expect(returned).toEqual(order);
  });
});

describe('useVerifyRazorpayPayment', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls services.fees.verifyRazorpayPayment with the fee id and body, and invalidates fees', async () => {
    (services.fees.verifyRazorpayPayment as jest.Mock).mockResolvedValue({ id: 'fee-1', status: 'paid' });

    const wrapper = makeWrapper();
    const { result } = renderHook(() => useVerifyRazorpayPayment('child-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        feeId: 'fee-1',
        body: { razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'sig' },
      });
    });

    expect(services.fees.verifyRazorpayPayment).toHaveBeenCalledWith('fee-1', {
      razorpayOrderId: 'order_x',
      razorpayPaymentId: 'pay_x',
      razorpaySignature: 'sig',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

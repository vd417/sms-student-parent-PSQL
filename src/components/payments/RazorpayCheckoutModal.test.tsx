import { render, fireEvent } from '@testing-library/react-native';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';

const order = { orderId: 'order_x', amount: 480000, currency: 'INR', keyId: 'rzp_test_x' };

describe('RazorpayCheckoutModal', () => {
  it('renders a WebView pointed at a checkout page carrying the order details', () => {
    const { UNSAFE_getByType } = render(
      <RazorpayCheckoutModal order={order} visible schoolName="Green Valley School" onSuccess={jest.fn()} onDismiss={jest.fn()} />,
    );
    const WebView = require('react-native-webview').WebView;
    const webview = UNSAFE_getByType(WebView);
    expect(webview.props.source.html).toContain('rzp_test_x');
    expect(webview.props.source.html).toContain('order_x');
  });

  it('calls onSuccess with the parsed payment result when the page posts a success message', () => {
    const onSuccess = jest.fn();
    const { UNSAFE_getByType } = render(
      <RazorpayCheckoutModal order={order} visible schoolName="Green Valley School" onSuccess={onSuccess} onDismiss={jest.fn()} />,
    );
    const WebView = require('react-native-webview').WebView;
    const webview = UNSAFE_getByType(WebView);
    webview.props.onMessage({
      nativeEvent: {
        data: JSON.stringify({
          type: 'success',
          razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'sig_x',
        }),
      },
    });
    expect(onSuccess).toHaveBeenCalledWith({ razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'sig_x' });
  });

  it('calls onDismiss when the page posts a dismiss/failure message', () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getByType } = render(
      <RazorpayCheckoutModal order={order} visible schoolName="Green Valley School" onSuccess={jest.fn()} onDismiss={onDismiss} />,
    );
    const WebView = require('react-native-webview').WebView;
    const webview = UNSAFE_getByType(WebView);
    webview.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'dismiss' }) } });
    expect(onDismiss).toHaveBeenCalled();
  });
});

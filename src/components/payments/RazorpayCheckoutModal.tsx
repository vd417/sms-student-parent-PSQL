import { Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { RazorpayOrder } from '@/services/types';

interface Props {
  order: RazorpayOrder;
  visible: boolean;
  schoolName: string;
  /** What the fee is for, e.g. the invoice period/name — shown on Razorpay's checkout screen. */
  description: string;
  onSuccess: (result: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => void;
  onDismiss: () => void;
}

/** Escapes a value for safe interpolation inside a single-quoted JS string literal in the generated HTML. */
function jsStringLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3C');
}

function checkoutHtml(order: RazorpayOrder, schoolName: string, description: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
  <body style="margin:0">
  <script>
    var options = {
      key: '${jsStringLiteral(order.keyId)}',
      amount: '${jsStringLiteral(String(order.amount))}',
      currency: '${jsStringLiteral(order.currency)}',
      order_id: '${jsStringLiteral(order.orderId)}',
      name: '${jsStringLiteral(schoolName)}',
      description: '${jsStringLiteral(description)}',
      handler: function (response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'success',
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }));
      },
      modal: {
        ondismiss: function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
        },
      },
    };
    var rzp = new Razorpay(options);
    rzp.open();
  </script>
  </body></html>`;
}

export function RazorpayCheckoutModal({ order, visible, schoolName, description, onSuccess, onDismiss }: Props) {
  const handleMessage = (event: WebViewMessageEvent) => {
    // The WebView also hosts Razorpay's own checkout.js plus any bank/3DS redirect
    // pages — third-party code that could post a non-JSON message. Ignore anything
    // that doesn't parse rather than let a malformed message crash mid-payment.
    let msg: { type?: string; [key: string]: unknown };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'success') {
      onSuccess({
        razorpayOrderId: msg.razorpay_order_id as string,
        razorpayPaymentId: msg.razorpay_payment_id as string,
        razorpaySignature: msg.razorpay_signature as string,
      });
    } else if (msg.type === 'dismiss') {
      onDismiss();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safe}>
        <WebView
          originWhitelist={['*']}
          source={{ html: checkoutHtml(order, schoolName, description) }}
          onMessage={handleMessage}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });

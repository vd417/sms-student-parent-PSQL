import { Modal, SafeAreaView, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { RazorpayOrder } from '@/services/types';

interface Props {
  order: RazorpayOrder;
  visible: boolean;
  schoolName: string;
  onSuccess: (result: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => void;
  onDismiss: () => void;
}

/** Escapes a value for safe interpolation inside a single-quoted JS string literal in the generated HTML. */
function jsStringLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3C');
}

function checkoutHtml(order: RazorpayOrder, schoolName: string): string {
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
      description: 'Fee payment',
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

export function RazorpayCheckoutModal({ order, visible, schoolName, onSuccess, onDismiss }: Props) {
  const handleMessage = (event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === 'success') {
      onSuccess({
        razorpayOrderId: msg.razorpay_order_id,
        razorpayPaymentId: msg.razorpay_payment_id,
        razorpaySignature: msg.razorpay_signature,
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
          source={{ html: checkoutHtml(order, schoolName) }}
          onMessage={handleMessage}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });

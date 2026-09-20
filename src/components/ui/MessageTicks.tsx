import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tickColor, type ChatReceiptStatus } from '@/lib/chatReceipt';

export function MessageTicks({ status }: { status: ChatReceiptStatus }) {
  return (
    <View accessibilityLabel={status === 'read' ? 'Read' : status === 'delivered' ? 'Delivered' : 'Sent'}>
      <Ionicons
        name={status === 'sent' ? 'checkmark' : 'checkmark-done'}
        size={14}
        color={tickColor(status)}
      />
    </View>
  );
}

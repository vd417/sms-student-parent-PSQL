import { type ReactNode, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Empty } from '@/components/ui';
import { useKeyboardLift } from '@/hooks/useKeyboardLift';
import { colors, spacing } from '@/theme';

type Props = {
  header: ReactNode;
  composer: ReactNode;
  moderation?: ReactNode;
  empty: boolean;
  scrollRef: RefObject<ScrollView | null>;
  onContentSizeChange: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
};

export function ChatThreadLayout({
  header,
  composer,
  moderation,
  empty,
  scrollRef,
  onContentSizeChange,
  refreshing,
  onRefresh,
  children,
}: Props) {
  const { lift, composerPad, headerPad } = useKeyboardLift();

  return (
    <View style={[styles.root, { paddingBottom: lift }]}>
      <View style={[styles.headerWrap, { paddingTop: headerPad }]}>{header}</View>
      {empty ? (
        <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
          <Empty message="No messages yet. Say hello!" />
        </Pressable>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onContentSizeChange={onContentSizeChange}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {children}
        </ScrollView>
      )}
      {moderation}
      <View style={[styles.composerWrap, { paddingBottom: composerPad }]}>{composer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  headerWrap: { backgroundColor: colors.white },
  thread: {
    paddingHorizontal: spacing.l,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  composerWrap: { backgroundColor: colors.white },
});

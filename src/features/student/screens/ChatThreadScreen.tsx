import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Empty, IconButton, Loading } from '@/components/ui';
import { useThreads, useMessages, useSendMessage } from '@/hooks/useMessaging';
import { colors, fontFamily, hueForName, radius, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatThread'>;
type Route = RouteProp<RootStackParamList, 'ChatThread'>;

export function ChatThreadScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const threadId = route.params.id;

  const threadsQ = useThreads('student');
  const messagesQ = useMessages(threadId);
  const sendMut = useSendMessage(threadId);
  const [draft, setDraft] = useState('');

  const thread =
    threadsQ.data?.find((t) => t.id === threadId) ?? threadsQ.data?.[0];

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    sendMut.mutate(text);
    setDraft('');
  };

  if (threadsQ.isLoading || messagesQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }

  const headerName = thread?.name ?? 'Conversation';
  const headerSubj = thread?.role ?? '';
  const messages = messagesQ.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Avatar initials={initialsFor(headerName)} size={40} hue={hueForName(headerName)} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{headerName}</Text>
          <Text style={styles.subj}>● {headerSubj}</Text>
        </View>
        <IconButton icon="notifications-outline" size={36} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <Empty message="No messages yet. Say hello!" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => {
              const me = m.from === 'me';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleWrap,
                    { alignSelf: me ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      me ? styles.bubbleMe : styles.bubbleThem,
                      { borderBottomRightRadius: me ? 4 : 18, borderBottomLeftRadius: me ? 18 : 4 },
                    ]}
                  >
                    <Text style={[styles.msg, { color: me ? colors.white : colors.ink }]}>
                      {m.text}
                    </Text>
                    <Text
                      style={[
                        styles.time,
                        { color: me ? 'rgba(255,255,255,0.75)' : colors.inkMuted },
                      ]}
                    >
                      {m.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.composer}>
          <IconButton icon="attach" size={40} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message..."
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function initialsFor(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
    backgroundColor: colors.white,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fontFamily.extraBold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  subj: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10.5,
    color: colors.present,
  },
  thread: {
    paddingHorizontal: spacing.l,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 8,
  },
  bubbleWrap: { maxWidth: '78%' },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMe: { backgroundColor: colors.primary },
  bubbleThem: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  msg: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  time: { fontFamily: fontFamily.semiBold, fontSize: 9.5, marginTop: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: 16,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

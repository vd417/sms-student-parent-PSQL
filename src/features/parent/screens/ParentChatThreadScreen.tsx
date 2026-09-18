import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatThreadLayout } from '@/components/chat/ChatThreadLayout';
import { Avatar, IconButton, Loading, MessageTicks } from '@/components/ui';
import { useCachedThread, useMessages, useChatComposer } from '@/hooks/useMessaging';
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll';
import { useChildren } from '@/hooks/useParent';
import { useToast } from '@/providers/ToastProvider';
import { pickAndCompressChatImage } from '@/lib/chatImage';
import { colors, fontFamily, hueForName, radius } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList, 'ChatThread'>;
type Route = RouteProp<ParentStackParamList, 'ChatThread'>;

function initialsFor(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ParentChatThreadScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();
  const route = useRoute<Route>();
  const threadId = route.params.id;

  const messagesQ = useMessages(threadId);
  const thread = useCachedThread('parent', threadId);
  const childrenQ = useChildren();
  const {
    sendMessage,
    sendImage,
    sendPending,
    moderationError,
    moderationWarning,
    clearModerationError,
  } = useChatComposer(threadId);
  const [draft, setDraft] = useState('');
  const [attaching, setAttaching] = useState(false);

  const kidId = route.params.kid ?? thread?.kid;
  const kid = kidId ? childrenQ.data?.find((c) => c.id === kidId) : undefined;
  const name = route.params.name ?? thread?.name ?? 'Conversation';
  const role = route.params.role ?? thread?.role ?? '';

  const send = () => {
    sendMessage(draft, () => setDraft(''));
  };

  const attach = async () => {
    if (attaching || sendPending) return;
    setAttaching(true);
    try {
      const dataUrl = await pickAndCompressChatImage();
      if (dataUrl) sendImage(dataUrl, draft, () => setDraft(''));
    } catch {
      toast('Could not attach image. Try again.');
    } finally {
      setAttaching(false);
    }
  };

  const messages = messagesQ.data ?? [];
  const lastMessageKey = `${messages.length}:${messages[messages.length - 1]?.id ?? ''}`;
  const { scrollRef, onContentSizeChange } = useChatAutoScroll(lastMessageKey);

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => nav.goBack()}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
      </Pressable>
      <Avatar initials={initialsFor(name)} size={40} hue={hueForName(name)} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>
          {role}
          {kid ? ` · re: ${kid.name.split(' ')[0]}` : ''}
        </Text>
      </View>
      <IconButton icon="notifications-outline" size={36} onPress={() => nav.navigate('Announcements')} />
    </View>
  );

  if (messagesQ.isLoading) {
    return (
      <View style={styles.boot}>
        {header}
        <Loading />
      </View>
    );
  }

  return (
    <ChatThreadLayout
      header={header}
      empty={messages.length === 0}
      scrollRef={scrollRef}
      onContentSizeChange={onContentSizeChange}
      refreshing={messagesQ.isRefetching}
      onRefresh={() => {
        messagesQ.refetch();
        childrenQ.refetch();
      }}
      moderation={
        moderationError ? <Text style={styles.moderationErrorText}>{moderationWarning}</Text> : null
      }
      composer={
        <View style={styles.composer}>
          {attaching ? (
            <View style={[styles.composerIconSlot, { alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator size="small" color={colors.inkMuted} />
            </View>
          ) : (
            <IconButton icon="attach" size={40} onPress={attach} disabled={sendPending} />
          )}
          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              if (moderationError) clearModerationError();
            }}
            placeholder="Message..."
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            autoCorrect
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.85 }, sendPending && { opacity: 0.6 }]}
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      }
    >
      {messages.map((m) => {
        const me = m.from === 'me';
        return (
          <View
            key={m.id}
            style={[styles.bubbleWrap, { alignSelf: me ? 'flex-end' : 'flex-start' }]}
          >
            <View
              style={[
                styles.bubble,
                me ? styles.bubbleMe : styles.bubbleThem,
                { borderBottomRightRadius: me ? 4 : 18, borderBottomLeftRadius: me ? 18 : 4 },
              ]}
            >
              {m.imageUrl ? (
                <Image source={{ uri: m.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : null}
              {m.text ? <Text style={styles.msg}>{m.text}</Text> : null}
              <View style={styles.metaRow}>
                <Text style={styles.time}>{m.time}</Text>
                {me && m.status ? <MessageTicks status={m.status} /> : null}
              </View>
            </View>
          </View>
        );
      })}
    </ChatThreadLayout>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.paper },
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
  name: { fontFamily: fontFamily.extraBold, fontSize: 14, color: colors.ink, letterSpacing: -0.1 },
  role: { fontFamily: fontFamily.semiBold, fontSize: 10.5, color: colors.inkMuted },
  bubbleWrap: { maxWidth: '78%' },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMe: { backgroundColor: colors.primarySoft },
  bubbleThem: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  msg: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18, color: colors.ink },
  image: { width: 220, height: 220, borderRadius: 12, marginBottom: 4 },
  composerIconSlot: { width: 40, height: 40 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  time: { fontFamily: fontFamily.semiBold, fontSize: 9.5, marginTop: 0, color: colors.inkMuted },
  moderationErrorText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.coral,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
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

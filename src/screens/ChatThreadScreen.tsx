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
import { Avatar, IconButton } from '@/components/ui';
import { hueForName, teachers } from '@/data/sample';
import { colors, fontFamily, radius, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatThread'>;
type Route = RouteProp<RootStackParamList, 'ChatThread'>;

const SEED = [
  { from: 't', text: 'Hi Maya — great work on the pop quiz!', t: '11:12' },
  { from: 'me', text: 'Thank you Ms. Krishnan! Could I get help on Q12 from problem set 14?', t: '11:14' },
  { from: 't', text: 'Of course. Try factoring first — let me know what you get.', t: '11:18' },
  { from: 't', text: 'Office hours today at 4 PM if you want to walk through it together.', t: '11:18' },
  { from: 'me', text: "I'll come by, thank you!", t: '11:20' },
] as const;

export function ChatThreadScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const teacher =
    teachers.find((t) => t.id === route.params.id) ?? teachers[0];

  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState(SEED.map((m) => ({ ...m })));

  const send = () => {
    if (!draft.trim()) return;
    setMsgs((m) => [...m, { from: 'me', text: draft.trim(), t: 'now' }]);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Avatar initials={teacher.initials} size={40} hue={hueForName(teacher.name)} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{teacher.name}</Text>
          <Text style={styles.subj}>● {teacher.subj}</Text>
        </View>
        <IconButton icon="notifications-outline" size={36} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
        >
          {msgs.map((m, i) => {
            const me = m.from === 'me';
            return (
              <View
                key={i}
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
                    {m.t}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

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

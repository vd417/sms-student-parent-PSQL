import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Empty, ErrorState, IconButton, Loading, SearchField } from '@/components/ui';
import { useDirectory } from '@/hooks/useDirectory';
import { usePeers } from '@/hooks/useStudent';
import { useToast } from '@/providers/ToastProvider';
import { colors, fontFamily, hueForName, radius, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function InboxScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const teachersQ = useDirectory();
  const peersQ = usePeers();

  const isLoading = teachersQ.isLoading || peersQ.isLoading;
  const isError = teachersQ.isError || peersQ.isError;
  const onRefresh = () => {
    teachersQ.refetch();
    peersQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const q = query.trim().toLowerCase();
  const teachers = teachersQ.data!.filter((t) => !q || t.name.toLowerCase().includes(q));
  const peers = peersQ.data!.filter((p) => !q || p.name.toLowerCase().includes(q));
  const noResults = q !== '' && teachers.length === 0 && peers.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={teachersQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <Text style={typography.h1}>Inbox</Text>
          <IconButton icon="create-outline" onPress={() => toast('Coming soon')} />
        </View>

        <View style={{ paddingVertical: 14 }}>
          <SearchField
            placeholder="Search teachers, classmates"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {noResults ? <Empty message={`No matches for “${query}”`} /> : null}

        {teachers.length > 0 ? (
          <Text style={[typography.eyebrow, { marginBottom: 8 }]}>Teachers</Text>
        ) : null}
        <View style={{ gap: 8 }}>
          {teachers.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => nav.navigate('ChatThread', { id: `st-${t.id}` })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View>
                <Avatar initials={t.initials} size={44} hue={hueForName(t.name)} />
                {t.online ? <View style={styles.dot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.meta}>
                  {t.subj}
                  {t.online ? ' · Online' : ' · Offline'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
            </Pressable>
          ))}
        </View>

        {peers.length > 0 ? (
          <Text style={[typography.eyebrow, { marginTop: 18, marginBottom: 8 }]}>Classmates</Text>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {peers.map((p) => (
            <View key={p.id} style={styles.peer}>
              <Avatar initials={p.initials} size={56} hue={hueForName(p.name)} />
              <Text style={styles.peerName}>{p.name.split(' ')[0]}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.present,
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  meta: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  peer: { width: 64, alignItems: 'center' },
  peerName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.ink,
    marginTop: 6,
  },
});

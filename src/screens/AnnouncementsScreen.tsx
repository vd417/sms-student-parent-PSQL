import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Pill, ScreenHeader } from '@/components/ui';
import { announcements } from '@/data/sample';
import { colors, fontFamily, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function AnnouncementsScreen() {
  const nav = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="From the school"
        title="Notices"
        onBack={() => nav.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 10 }}>
          {announcements.map((n) => (
            <Card key={n.id} style={{ padding: 14 }}>
              <View style={styles.top}>
                <Pill tone="primary">{n.role}</Pill>
                <Text style={styles.when}>{n.when}</Text>
              </View>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.body}>{n.body}</Text>
              <Text style={styles.from}>— {n.from}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  when: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    color: colors.ink2,
    lineHeight: 19,
    marginTop: 6,
  },
  from: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 10,
  },
});

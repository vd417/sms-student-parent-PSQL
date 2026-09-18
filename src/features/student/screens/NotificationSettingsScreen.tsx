import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, ErrorState, Loading, ScreenHeader, SectionHeader } from '@/components/ui';
import { useNotifications, useSettings } from '@/hooks/useNotifications';
import { qk } from '@/hooks/keys';
import { services } from '@/services';
import type { AppSettings } from '@/services/types';
import { DEFAULT_NOTICE_PREFS } from '@/lib/noticeAlert';
import { colors, fontFamily, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NotificationSettingsScreen() {
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const settingsQ = useSettings();
  const noticesQ = useNotifications();
  const [busy, setBusy] = useState<keyof AppSettings | null>(null);

  const save = useMutation({
    mutationFn: (patch: Partial<AppSettings>) => services.settings.update(patch),
    onSuccess: (next) => {
      qc.setQueryData(qk.settings, next);
    },
  });

  const markRead = useMutation({
    mutationFn: () => services.notifications.markRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notifications });
      void qc.invalidateQueries({ queryKey: qk.announcements('student') });
      void qc.invalidateQueries({ queryKey: qk.announcements('parent') });
    },
  });

  const onRefresh = useCallback(() => {
    void settingsQ.refetch();
    void noticesQ.refetch();
  }, [noticesQ, settingsQ]);

  if (settingsQ.isLoading && settingsQ.data === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Notifications" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (settingsQ.isError && settingsQ.data === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Notifications" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const prefs = settingsQ.data ?? DEFAULT_NOTICE_PREFS;
  const unread = (noticesQ.data ?? []).filter((n) => n.unread).length;

  const toggle = async (key: keyof AppSettings, value: boolean) => {
    setBusy(key);
    try {
      await save.mutateAsync({ [key]: value });
    } catch {
      /* offline/write errors surface via mutation state; do not crash */
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Notifications" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={settingsQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <SectionHeader title="In this app" />
        <Card style={styles.card}>
          <ToggleRow
            label="In-app toasts"
            hint="Pop-up when a notice arrives while the app is open"
            value={prefs.inAppToasts}
            disabled={busy != null}
            onChange={(v) => void toggle('inAppToasts', v)}
          />
          <ToggleRow
            label="Chat messages"
            hint="Teacher and class conversation alerts"
            value={prefs.chatAlerts}
            disabled={busy != null}
            onChange={(v) => void toggle('chatAlerts', v)}
          />
          <ToggleRow
            label="School notices"
            hint="Timetable, announcements, and other school alerts"
            value={prefs.schoolNotices}
            disabled={busy != null}
            last
            onChange={(v) => void toggle('schoolNotices', v)}
          />
        </Card>

        <SectionHeader title="Inbox" />
        <Card style={styles.card}>
          <View style={[styles.row, styles.divider]}>
            <View style={styles.copy}>
              <Text style={styles.label}>Unread</Text>
              <Text style={styles.hint}>
                {unread === 0 ? 'All caught up' : `${unread} unread ${unread === 1 ? 'notice' : 'notices'}`}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => nav.navigate('Announcements')}
            style={({ pressed }) => [styles.row, styles.divider, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.link}>View notices</Text>
          </Pressable>
          <View style={[styles.row, { paddingVertical: 10 }]}>
            <Button
              variant="secondary"
              full
              disabled={unread === 0 || markRead.isPending}
              loading={markRead.isPending}
              onPress={() => markRead.mutate()}
            >
              Mark all read
            </Button>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  last,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  last?: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.ruleSoft, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.inkSoft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 28 },
  card: { padding: 4, marginTop: 10, marginBottom: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  copy: { flex: 1, minWidth: 0 },
  label: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  hint: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginTop: 3 },
  link: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.primary },
});

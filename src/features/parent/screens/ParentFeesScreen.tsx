import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Empty, ErrorState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { useFees, usePayFee } from '@/hooks/useFees';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, primaryGradient, radius, typography } from '@/theme';

export function ParentFeesScreen() {
  const { childId } = useSelectedChild();
  const feesQ = useFees(childId);
  const payMut = usePayFee(childId);

  if (feesQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Fees" title="Fees & payments" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (feesQ.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Fees" title="Fees & payments" />
        <ErrorState onRetry={() => feesQ.refetch()} />
      </SafeAreaView>
    );
  }

  const fees = feesQ.data!;
  const due = fees.find((f) => f.status === 'due');
  const paid = fees.filter((f) => f.status === 'paid');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="Fees"
        title="Fees & payments"
        right={<IconButton icon="download-outline" />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={feesQ.isRefetching} onRefresh={() => feesQ.refetch()} />}
      >
        {due ? (
          <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
            <LinearGradient
              colors={primaryGradient as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>Amount due</Text>
              <Text style={styles.heroNum}>
                ${due.amount.toLocaleString()}
                <Text style={styles.heroCents}>.00</Text>
              </Text>
              <Text style={styles.heroMeta}>
                {due.period} · due {due.dueDate}
              </Text>

              <View style={styles.items}>
                {(due.items ?? []).map((it, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemLabel}>{it.l}</Text>
                    <Text style={styles.itemAmt}>${it.amt}</Text>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 14 }}>
                <Button
                  variant="white"
                  full
                  loading={payMut.isPending}
                  onPress={() => payMut.mutate(due.id)}
                >
                  Pay now
                </Button>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        <Text style={[typography.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Payment history
        </Text>
        {paid.length === 0 ? (
          <Empty message="No payments yet." />
        ) : (
          <View style={{ paddingHorizontal: 18, gap: 8 }}>
            {paid.map((f) => (
              <View key={f.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="checkmark" size={18} color={colors.present} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{f.period}</Text>
                  <Text style={styles.rowMeta}>
                    {f.method} · {f.paidOn}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.rowAmt}>${f.amount.toLocaleString()}</Text>
                  <Text style={styles.rowPaid}>PAID</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  hero: { borderRadius: radius.lg, padding: 18 },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: 42,
    color: colors.white,
    marginTop: 4,
    letterSpacing: -1,
  },
  heroCents: { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  heroMeta: { fontFamily: fontFamily.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  items: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemLabel: { fontFamily: fontFamily.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  itemAmt: { fontFamily: fontFamily.bold, fontSize: 12, color: colors.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.presentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.ink },
  rowMeta: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  rowAmt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 14,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  rowPaid: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.present },
});

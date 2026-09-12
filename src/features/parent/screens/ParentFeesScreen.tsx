import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Empty, ErrorState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { RazorpayCheckoutModal } from '@/components/payments/RazorpayCheckoutModal';
import { useFees, useCreateRazorpayOrder, useVerifyRazorpayPayment } from '@/hooks/useFees';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useToast } from '@/providers/ToastProvider';
import type { Fee } from '@/models';
import type { RazorpayOrder } from '@/services/types';
import { colors, fontFamily, primaryGradient, radius, spacing, typography } from '@/theme';

export function ParentFeesScreen() {
  const { childId } = useSelectedChild();
  const toast = useToast();
  const feesQ = useFees(childId);
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment(childId);
  const childrenQ = useChildren();
  const child = childrenQ.data?.find((c) => c.id === childId);
  const [checkout, setCheckout] = useState<{ order: RazorpayOrder; feeId: string } | null>(null);

  const handlePay = async (fee: Fee) => {
    try {
      const order = await createOrder.mutateAsync(fee.id);
      setCheckout({ order, feeId: fee.id });
    } catch {
      toast('Could not start payment. Please try again.');
    }
  };

  const handleCheckoutSuccess = async (result: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    if (!checkout) return;
    setCheckout(null);
    try {
      await verifyPayment.mutateAsync({ feeId: checkout.feeId, body: result });
      toast('Payment successful');
    } catch {
      toast('Payment could not be confirmed. If money was deducted, it will be reflected shortly.');
    }
  };

  if (!childId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          kicker="Fees"
          title="Fees & payments"
        />
        <Empty message="No children are linked to this account yet." />
      </SafeAreaView>
    );
  }

  if (feesQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          kicker="Fees"
          title="Fees & payments"
        />
        <Loading />
      </SafeAreaView>
    );
  }
  if (feesQ.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          kicker="Fees"
          title="Fees & payments"
        />
        <ErrorState onRetry={() => feesQ.refetch()} />
      </SafeAreaView>
    );
  }

  const fees = feesQ.data!;
  // 'partial' invoices are still outstanding — a fee only leaves the due card once fully paid.
  const due = fees.find((f) => f.status === 'due' || f.status === 'partial');
  const remaining = due ? due.amount - (due.paidAmount ?? 0) : 0;
  // A partial invoice already has real money against it — that payment belongs in
  // history too, even though the invoice itself is still outstanding above.
  const paid = fees.filter((f) => f.status === 'paid' || (f.status === 'partial' && (f.paidAmount ?? 0) > 0));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="Fees"
        title="Fees & payments"
        right={<IconButton icon="download-outline" onPress={() => toast('Coming soon')} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={feesQ.isRefetching} onRefresh={() => feesQ.refetch()} />
        }
      >
        {due ? (
          <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
            <LinearGradient
              colors={primaryGradient as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>{due.status === 'partial' ? 'Balance due' : 'Amount due'}</Text>
              <Text style={styles.heroNum}>
                ₹{remaining.toLocaleString()}
                <Text style={styles.heroCents}>.00</Text>
              </Text>
              <Text style={styles.heroMeta}>
                {due.period}
                {due.dueDate ? ` · due ${due.dueDate}` : ''}
                {due.status === 'partial' ? ` · ₹${(due.paidAmount ?? 0).toLocaleString()} already paid` : ''}
              </Text>

              <View style={styles.items}>
                {(due.items ?? []).map((it, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemLabel}>{it.l}</Text>
                    <Text style={styles.itemAmt}>₹{it.amt}</Text>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 14 }}>
                <Button
                  variant="white"
                  full
                  onPress={() => { void handlePay(due); }}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? 'Starting payment…' : 'Pay now'}
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
            {paid.map((f) => {
              const isFullyPaid = f.status === 'paid';
              const amountPaid = isFullyPaid ? f.amount : (f.paidAmount ?? 0);
              const meta = [f.method, f.paidOn].filter(Boolean).join(' · ');
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toast('Coming soon')}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name="checkmark" size={18} color={colors.present} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{f.period}</Text>
                    {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowAmt}>₹{amountPaid.toLocaleString()}</Text>
                    <Text style={styles.rowPaid}>{isFullyPaid ? 'PAID' : 'PARTIAL'}</Text>
                  </View>
                  <IconButton
                    icon="download-outline"
                    size={32}
                    onPress={() => toast('Coming soon')}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      {checkout && (
        <RazorpayCheckoutModal
          order={checkout.order}
          visible
          schoolName={child?.school ?? 'School'}
          onSuccess={(result) => { void handleCheckoutSuccess(result); }}
          onDismiss={() => setCheckout(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: spacing.l, paddingTop: spacing.m, gap: spacing.s },
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
  heroMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
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

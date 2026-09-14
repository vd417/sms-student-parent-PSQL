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
import { downloadInvoice } from '../utils/invoicePdf';

/** Human-readable summary of what a fee is for, shown on Razorpay's checkout screen. */
function feeDescription(fee: Fee): string {
  const items = (fee.items ?? []).map((it) => it.l).join(', ');
  return items ? `${fee.period} · ${items}` : fee.period;
}

/** Formats a `YYYY-MM-DD[THH:mm:ss]` backend date as `23 Sep 2026` for display; passes through anything else. */
function formatFeeDate(date: string | undefined): string {
  const raw = (date ?? '').trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Compact "what's included" line, e.g. "Tuition fee ₹40,000 · Transport fee ₹4,800". */
function itemsSummary(fee: Fee): string {
  return (fee.items ?? []).map((it) => `${it.l} ₹${it.amt.toLocaleString()}`).join(' · ');
}

export function ParentFeesScreen() {
  const { childId } = useSelectedChild();
  const toast = useToast();
  const feesQ = useFees(childId);
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment(childId);
  const childrenQ = useChildren();
  const child = childrenQ.data?.find((c) => c.id === childId);
  const [checkout, setCheckout] = useState<{ order: RazorpayOrder; feeId: string; description: string } | null>(null);

  const handleDownload = async (fee: Fee) => {
    try {
      await downloadInvoice(fee, {
        studentName: child?.name ?? 'Student',
        grade: child?.grade,
        school: child?.school,
      });
    } catch {
      toast('Could not generate the invoice. Please try again.');
    }
  };

  const handlePay = async (fee: Fee) => {
    try {
      const order = await createOrder.mutateAsync(fee.id);
      setCheckout({ order, feeId: fee.id, description: feeDescription(fee) });
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
  // Sort by due date so the most urgent outstanding invoice becomes the hero card; any other
  // outstanding invoices (e.g. a newly announced fee) still surface below instead of being
  // silently dropped.
  // Live invoices aren't as tidy as mock fixtures — a freshly created fee can arrive with no
  // due date yet, so guard the comparator instead of trusting the DTO's non-null string type.
  const outstanding = fees
    .filter((f) => f.status === 'due' || f.status === 'partial')
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const due = outstanding[0];
  const otherOutstanding = outstanding.slice(1);
  const remaining = due ? due.amount - (due.paidAmount ?? 0) : 0;
  // A partial invoice already has real money against it — that payment belongs in
  // history too, even though the invoice itself is still outstanding above.
  const paid = fees.filter((f) => f.status === 'paid' || (f.status === 'partial' && (f.paidAmount ?? 0) > 0));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="Fees"
        title="Fees & payments"
        right={due ? <IconButton icon="download-outline" onPress={() => handleDownload(due)} /> : undefined}
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
                {due.dueDate ? ` · due ${formatFeeDate(due.dueDate)}` : ''}
                {due.status === 'partial' ? ` · ₹${(due.paidAmount ?? 0).toLocaleString()} already paid` : ''}
              </Text>

              <View style={styles.items}>
                {(due.items ?? []).map((it, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemLabel}>{it.l}</Text>
                    <Text style={styles.itemAmt}>₹{it.amt.toLocaleString()}</Text>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 14 }}>
                <Button
                  variant="white"
                  full
                  onPress={() => { void handlePay(due); }}
                  disabled={createOrder.isPending || verifyPayment.isPending}
                >
                  {createOrder.isPending ? 'Starting payment…' : 'Pay now'}
                </Button>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        {otherOutstanding.length > 0 ? (
          <View style={{ paddingHorizontal: 18, paddingBottom: 14, gap: 8 }}>
            <Text style={typography.eyebrow}>Other pending fees</Text>
            {otherOutstanding.map((f) => {
              const owed = f.amount - (f.paidAmount ?? 0);
              return (
                <View key={f.id} style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{f.period}</Text>
                    <Text style={styles.rowMeta}>
                      {f.dueDate ? `Due ${formatFeeDate(f.dueDate)}` : ''}
                      {f.status === 'partial' ? ` · ₹${(f.paidAmount ?? 0).toLocaleString()} already paid` : ''}
                    </Text>
                    {itemsSummary(f) ? <Text style={styles.rowItems}>{itemsSummary(f)}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.rowAmt}>₹{owed.toLocaleString()}</Text>
                    <Pressable onPress={() => { void handlePay(f); }} disabled={createOrder.isPending || verifyPayment.isPending}>
                      <Text style={styles.payLink}>Pay now</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
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
                  onPress={() => handleDownload(f)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name="checkmark" size={18} color={colors.present} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{f.period}</Text>
                    {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
                    {itemsSummary(f) ? <Text style={styles.rowItems}>{itemsSummary(f)}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowAmt}>₹{amountPaid.toLocaleString()}</Text>
                    <Text style={styles.rowPaid}>{isFullyPaid ? 'PAID' : 'PARTIAL'}</Text>
                  </View>
                  <IconButton
                    icon="download-outline"
                    size={32}
                    onPress={() => handleDownload(f)}
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
          schoolName={child?.school || 'School'}
          description={checkout.description}
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
  rowItems: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  rowAmt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 14,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  rowPaid: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.present },
  payLink: { fontFamily: fontFamily.bold, fontSize: 12, color: colors.primary },
});

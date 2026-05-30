import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, ScreenHeader, Toast } from '@/components/ui';
import { useSubmitLeave } from '@/hooks/useLeave';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, radius } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

const REASONS = ['Sick', 'Family event', 'Travel', 'Medical', 'Other'];

export function ParentLeaveScreen() {
  const nav = useNavigation<Nav>();
  const { childId } = useSelectedChild();
  const childrenQ = useChildren();
  const submitMut = useSubmitLeave(childId);

  const [reason, setReason] = useState('Family event');
  const [note, setNote] = useState(
    "My family will be travelling to Bangalore for my mother's 70th birthday celebration. We will catch up on missed work upon return.",
  );
  const [toast, setToast] = useState(false);

  const child = childrenQ.data?.find((c) => c.id === childId);
  const from = 'Apr 28';
  const to = 'Apr 30';

  const onSubmit = () => {
    submitMut.mutate(
      { childId, from, to, reason, note },
      {
        onSuccess: () => {
          setToast(true);
          setTimeout(() => nav.goBack(), 1100);
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader kicker={child?.name} title="Apply for leave" onBack={() => nav.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Card style={{ padding: 14 }}>
            <Text style={styles.eyebrow}>Dates</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>FROM</Text>
                <View style={styles.dateBox}>
                  <Text style={styles.dateTxt}>{from}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>TO</Text>
                <View style={styles.dateBox}>
                  <Text style={styles.dateTxt}>{to}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.daysNote}>3 school days</Text>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Text style={[styles.eyebrow, { marginBottom: 10 }]}>Reason</Text>
          <View style={styles.chips}>
            {REASONS.map((r) => {
              const on = reason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                >
                  <Text style={[styles.chipTxt, { color: on ? colors.white : colors.ink2 }]}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Text style={[styles.eyebrow, { marginBottom: 10 }]}>Note to school</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.textarea}
            placeholderTextColor={colors.inkMuted}
          />
          <View style={styles.tip}>
            <Text style={styles.tipTxt}>Tip · attach a doctor&apos;s note if leave is medical</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bar}>
        <Button variant="ghost" leading={<Ionicons name="attach" size={16} color={colors.ink} />}>
          Attach
        </Button>
        <View style={{ flex: 1 }}>
          <Button variant="primary" full loading={submitMut.isPending} onPress={onSubmit}>
            Submit request
          </Button>
        </View>
      </View>

      <Toast show={toast} msg="Leave request sent" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  fieldLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  dateBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.paper2,
  },
  dateTxt: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  daysNote: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 10,
  },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  chipTxt: { fontFamily: fontFamily.bold, fontSize: 12 },
  textarea: {
    minHeight: 90,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  tip: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  tipTxt: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: colors.primary },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: 'rgba(251,251,253,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
});

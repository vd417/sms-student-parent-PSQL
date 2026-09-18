import { Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Empty, ErrorState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { useStudentProfile } from '@/hooks/useStudent';
import { useSubjects } from '@/hooks/useSubjects';
import { useGrades } from '@/hooks/useGrades';
import { useAttendanceSummary } from '@/hooks/useAttendance';
import { useSchool } from '@/hooks/useSchool';
import { useToast } from '@/providers/ToastProvider';
import {
  colors,
  fontFamily,
  hueColor,
  primaryGradient,
  radius,
  spacing,
  typography,
  useBrandColors,
} from '@/theme';
import { subjectShortCode } from '@/services/http/mappers';
import { pickSchoolMarkUrl } from '@/services/http/schoolMark';
import { gradesForClassCatalog, normalizeSubjectName } from '@/lib/belongsToSubject';
import { gradeFor } from '@/lib/gradeScale';
import {
  buildReportFromGrades,
  reportCardStudentFields,
} from '@/lib/reportCardBuild';
import { printReportCard } from '@/lib/reportCardPrint';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Grades'>;

function subjectForGrade(
  subjects: { id: string; name: string }[],
  g: { subjId: string; subjectName?: string },
) {
  if (g.subjId) {
    const byId = subjects.find((s) => s.id === g.subjId);
    if (byId) return byId;
  }
  const name = normalizeSubjectName(g.subjectName);
  if (!name) return undefined;
  return subjects.find((s) => normalizeSubjectName(s.name) === name);
}

export function GradesScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const studentId = route.params?.studentId;
  const toast = useToast();
  const brand = useBrandColors();
  const profileQ = useStudentProfile(studentId);
  const subjectsQ = useSubjects(studentId);
  const gradesQ = useGrades(studentId);
  const schoolQ = useSchool();
  const summaryQ = useAttendanceSummary(studentId);

  const isLoading = (profileQ.isLoading && profileQ.data === undefined) || (gradesQ.isLoading && gradesQ.data === undefined);
  const isError = (profileQ.isError && profileQ.data === undefined) && (gradesQ.isError && gradesQ.data === undefined);
  const onRefresh = () => {
    profileQ.refetch();
    subjectsQ.refetch();
    gradesQ.refetch();
    schoolQ.refetch();
    summaryQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Exams" title="Report card" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Exams" title="Report card" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const student = profileQ.data!;
  const subjects = subjectsQ.data ?? [];
  const grades = gradesForClassCatalog(gradesQ.data ?? [], subjects);
  const school = schoolQ.data;
  const report = buildReportFromGrades(gradesQ.data ?? [], subjects);
  const schoolMark = pickSchoolMarkUrl(school?.logoUrl, school?.imageUrl);
  const officialAttn = summaryQ.data?.attendancePercentage ?? student.attnPct;

  const subjectRows = report.rows.map((r) => {
    const sub =
      subjects.find((s) => normalizeSubjectName(s.name) === normalizeSubjectName(r.subject)) ??
      ({
        id: `name:${r.subject.toLowerCase()}`,
        name: r.subject,
        short: subjectShortCode(r.subject),
        teacher: '',
        avg: 0,
        trend: 0,
        color: 'blue' as const,
      } as (typeof subjects)[number]);
    const avg = r.max > 0 ? Math.round((r.marks / r.max) * 100) : 0;
    return { sub, avg, letter: r.grade };
  });

  const overallFromMarks = report.rows.length ? Math.round(report.pct) : student.overallAvg || 0;
  const overallLetter = report.rows.length ? report.grade : overallFromMarks > 0 ? gradeFor(overallFromMarks) : '—';
  const recentMarks = [...grades].slice(0, 8);

  const onDownload = () => {
    if (!report.rows.length) {
      toast('No exam marks to print yet');
      return;
    }
    if (Platform.OS !== 'web') {
      toast('Open the web app to download / print the report card');
      return;
    }
    const ok = printReportCard({
      schoolName: school?.name || student.school || 'School',
      schoolLogoUrl: school?.logoUrl || null,
      schoolImageUrl: school?.imageUrl || null,
      schoolLogoInitials: school?.shortName || school?.name?.slice(0, 2),
      schoolBrandColor: brand.primary,
      examName: 'Exam marks',
      student: {
        ...reportCardStudentFields(student),
        attendance: officialAttn == null ? 0 : Math.round(officialAttn),
      },
      report,
      rank: student.rank || 0,
      classSize: student.rankOf || 0,
    });
    if (!ok) toast('Could not open print dialog — allow pop-ups and try again');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={student.classroom || student.grade || 'Exams'}
        title="Report card"
        right={<IconButton icon="download-outline" onPress={onDownload} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileQ.isRefetching || gradesQ.isRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        <LinearGradient
          colors={primaryGradient as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>OVERALL FROM EXAMS</Text>
          <View style={styles.heroVal}>
            <Text style={styles.heroNum}>
              {overallFromMarks}
              <Text style={styles.heroPct}>%</Text>
            </Text>
            <View style={styles.heroSide}>
              <Text style={styles.heroGrade}>{overallLetter}</Text>
              <Text style={styles.heroDelta}>
                {report.rows.length ? report.result : student.classroom || student.grade || ''}
              </Text>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <Stat
              label="Class rank"
              value={student.rankOf > 0 ? `${student.rank}/${student.rankOf}` : '—'}
            />
            <Stat label="GPA" value={report.rows.length ? String(report.gpa) : '—'} divider />
            <Stat label="Class" value={student.classroom || student.grade || '—'} />
          </View>
        </LinearGradient>

        <View style={styles.rcSectionHead}>
          <Text style={typography.eyebrow}>Report card</Text>
          {report.rows.length > 0 ? (
            <Button variant="secondary" onPress={onDownload}>
              Download PDF
            </Button>
          ) : null}
        </View>
        {report.rows.length === 0 ? (
          <Empty message="No exam marks entered for you yet" />
        ) : (
          <View style={styles.rcCard}>
            {schoolMark ? (
              <View style={styles.rcWm} pointerEvents="none">
                <Image
                  source={{ uri: schoolMark }}
                  style={styles.rcWmImg}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
            ) : null}
            <View style={styles.rcHead}>
              <View style={styles.rcBrand}>
                {schoolMark ? (
                  <Image
                    source={{ uri: schoolMark }}
                    style={styles.rcLogo}
                    resizeMode="contain"
                    accessibilityLabel="School logo"
                  />
                ) : null}
                <Text style={styles.rcSchool} numberOfLines={2}>
                  {school?.name || student.school || 'School'}
                </Text>
              </View>
              <View
                style={[
                  styles.rcBadge,
                  {
                    backgroundColor:
                      report.result === 'PASS' ? '#dcfce7' : '#fee2e2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rcBadgeTxt,
                    { color: report.result === 'PASS' ? '#166534' : '#b91c1c' },
                  ]}
                >
                  {report.result}
                </Text>
              </View>
            </View>
            <View style={styles.rcInfo}>
              <InfoCell lab="Student" val={student.name} />
              <InfoCell lab="Admission no" val={student.studentId || '—'} />
              <InfoCell
                lab="Class · Roll"
                val={`${student.classroom || student.grade || '—'} · ${student.roll || '—'}`}
              />
              <InfoCell lab="Attendance" val={officialAttn == null ? 'Not marked' : `${Math.round(officialAttn)}%`} />
              <InfoCell
                lab="Class rank"
                val={student.rankOf > 0 ? `${student.rank} / ${student.rankOf}` : '—'}
              />
              <InfoCell lab="GPA" val={String(report.gpa)} />
            </View>
            <View style={styles.rcTable}>
              <View style={styles.rcTh}>
                <Text style={[styles.rcThTxt, { flex: 1.4 }]}>Subject</Text>
                <Text style={[styles.rcThTxt, styles.rcNum]}>Marks</Text>
                <Text style={[styles.rcThTxt, styles.rcNum]}>Max</Text>
                <Text style={[styles.rcThTxt, styles.rcCen]}>Grade</Text>
                <Text style={[styles.rcThTxt, styles.rcCen]}>GPA</Text>
                <Text style={[styles.rcThTxt, styles.rcCen]}>Result</Text>
              </View>
              {report.rows.map((r) => (
                <View key={r.subject} style={styles.rcTr}>
                  <Text style={[styles.rcTd, styles.rcFw, { flex: 1.4 }]} numberOfLines={1}>
                    {r.subject}
                  </Text>
                  <Text style={[styles.rcTd, styles.rcNum]}>{r.marks}</Text>
                  <Text style={[styles.rcTd, styles.rcNum, styles.rcMuted]}>{r.max}</Text>
                  <Text style={[styles.rcTd, styles.rcCen]}>{r.grade}</Text>
                  <Text style={[styles.rcTd, styles.rcCen]}>{r.gpa}</Text>
                  <Text
                    style={[
                      styles.rcTd,
                      styles.rcCen,
                      { color: r.pass ? '#166534' : '#b91c1c', fontFamily: fontFamily.bold },
                    ]}
                  >
                    {r.pass ? 'Pass' : 'Fail'}
                  </Text>
                </View>
              ))}
              <View style={[styles.rcTr, styles.rcTotal]}>
                <Text style={[styles.rcTd, styles.rcFw, { flex: 1.4 }]}>Total</Text>
                <Text style={[styles.rcTd, styles.rcNum, styles.rcFw]}>{report.total}</Text>
                <Text style={[styles.rcTd, styles.rcNum, styles.rcMuted]}>{report.maxTotal}</Text>
                <Text style={[styles.rcTd, styles.rcCen, styles.rcFw]}>{report.grade}</Text>
                <Text style={[styles.rcTd, styles.rcCen, styles.rcFw]}>{report.gpa}</Text>
                <Text style={[styles.rcTd, styles.rcCen, styles.rcFw]}>{report.pct}%</Text>
              </View>
            </View>
            <View style={styles.rcFoot}>
              <FootCell lab="Percentage" val={`${report.pct}%`} />
              <FootCell lab="Overall grade" val={report.grade} />
              <FootCell lab="GPA" val={String(report.gpa)} />
              <FootCell lab="Result" val={report.result} />
            </View>
          </View>
        )}

        <Text style={[typography.eyebrow, { marginTop: 22, marginBottom: 8 }]}>
          Subject breakdown
        </Text>
        {subjectRows.length === 0 ? (
          <Empty message="No exam marks entered for you yet" />
        ) : (
          <View style={{ gap: 10 }}>
            {subjectRows.map(({ sub, avg, letter }) => (
              <Pressable
                key={sub.id}
                onPress={() => {
                  nav.navigate('SubjectDetail', { id: sub.id, studentId });
                }}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.rowTop}>
                  <View style={[styles.subjIcon, { backgroundColor: hueColor(sub.color) }]}>
                    <Text style={styles.subjIconTxt}>{sub.short}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjName}>{sub.name}</Text>
                    <Text style={styles.subjTeacher}>{sub.teacher || letter}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.subjAvg}>{avg > 0 ? `${avg}%` : '—'}</Text>
                    <Text style={[styles.subjTrend, { color: colors.inkMuted }]}>
                      {letter !== '—' ? letter : 'No marks'}
                    </Text>
                  </View>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min(100, avg)}%`, backgroundColor: hueColor(sub.color) },
                    ]}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[typography.eyebrow, { marginTop: 22, marginBottom: 8 }]}>
          Recent marks
        </Text>
        {recentMarks.length === 0 ? (
          <Empty message="Marks appear here after teachers publish exam scores" />
        ) : (
          <View style={{ gap: 8 }}>
            {recentMarks.map((g) => {
              const sub = subjectForGrade(subjects, g);
              const pct = g.max > 0 ? Math.round((g.score / g.max) * 100) : 0;
              return (
                <View key={g.id} style={styles.markRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.markTitle}>{g.title}</Text>
                    <Text style={styles.markMeta}>
                      {sub?.name || g.subjectName || 'Subject'} · {g.date || '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.markScore}>
                      {g.score}
                      <Text style={styles.markMax}>/{g.max}</Text>
                    </Text>
                    <Text style={styles.markGrade}>
                      {g.grade || gradeFor(pct)} · {pct}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCell({ lab, val }: { lab: string; val: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLab}>{lab}</Text>
      <Text style={styles.infoVal} numberOfLines={1}>
        {val}
      </Text>
    </View>
  );
}

function FootCell({ lab, val }: { lab: string; val: string }) {
  return (
    <View style={styles.footCell}>
      <Text style={styles.infoLab}>{lab}</Text>
      <Text style={styles.footVal}>{val}</Text>
    </View>
  );
}

function Stat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View
      style={[
        styles.stat,
        divider && {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        },
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  hero: { padding: 18, borderRadius: radius.lg },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
  },
  heroVal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: 8,
  },
  heroNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: 56,
    color: colors.white,
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroPct: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },
  heroSide: { paddingBottom: 8 },
  heroGrade: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.white },
  heroDelta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroBottom: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  stat: { flex: 1, paddingHorizontal: 8 },
  statLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.white,
    marginTop: 4,
  },
  rcSectionHead: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rcCard: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
    overflow: 'hidden',
  },
  rcWm: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  rcWmImg: {
    width: '58%',
    maxWidth: 280,
    aspectRatio: 1,
    opacity: 0.2,
  },
  rcHead: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    backgroundColor: 'rgba(236,254,255,0.92)',
  },
  rcBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  rcLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  rcSchool: {
    flex: 1,
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    color: colors.ink,
  },
  rcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  rcBadgeTxt: { fontFamily: fontFamily.bold, fontSize: 11 },
  rcInfo: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  infoCell: { width: '33.33%', paddingHorizontal: 4, paddingVertical: 6 },
  infoLab: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.inkMuted,
  },
  infoVal: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.ink,
    marginTop: 2,
  },
  rcTable: { position: 'relative', zIndex: 1, paddingBottom: 4, backgroundColor: 'rgba(255,255,255,0.62)' },
  rcTh: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rcThTxt: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rcTr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  rcTotal: { backgroundColor: 'rgba(248,250,252,0.9)' },
  rcTd: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.ink,
  },
  rcFw: { fontFamily: fontFamily.bold },
  rcMuted: { color: colors.inkMuted },
  rcNum: { textAlign: 'right' },
  rcCen: { textAlign: 'center' },
  rcFoot: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: 'rgba(248,250,252,0.9)',
  },
  footCell: { width: '25%', paddingHorizontal: 4 },
  footVal: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    color: colors.ink,
    marginTop: 2,
  },
  row: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjIconTxt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 12,
    color: colors.white,
  },
  subjName: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  subjTeacher: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  subjAvg: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  subjTrend: { fontFamily: fontFamily.bold, fontSize: 10 },
  barBg: {
    height: 6,
    backgroundColor: colors.ruleSoft,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  markTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  markMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  markScore: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  markMax: { fontSize: 12, color: colors.inkMuted },
  markGrade: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.inkMuted, marginTop: 2 },
});

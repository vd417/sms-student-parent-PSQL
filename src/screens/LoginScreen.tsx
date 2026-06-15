import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/ui';
import { colors, fontFamily, primaryGradient, radius, shadow, spacing } from '@/theme';
import type { Role } from '@/models';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/errors';
import type { AuthStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const loginSchema = z.object({
  studentId: z.string().min(3, 'Enter your student ID'),
  password: z.string().min(4, 'Password is too short'),
});
type LoginForm = z.infer<typeof loginSchema>;

// Accepts an email or a 7–15 digit phone number (formatting characters allowed).
function isValidIdentifier(value: string): boolean {
  const v = value.trim();
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { signIn, requestOtp, signInWithOtp } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const isParent = role === 'parent';

  // --- Student: ID + password ---
  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { studentId: 'WBA-2024-1042', password: '' },
  });

  const submit = handleSubmit(async (data) => {
    await signIn(data.studentId, data.password, role);
  });

  // --- Parent: mobile/email + OTP ---
  const [otpStep, setOtpStep] = useState<'idle' | 'sent'>('idle');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<'sms' | 'email' | null>(null);

  const resetOtp = () => {
    setOtpStep('idle');
    setCode('');
    setOtpError(null);
    setSentChannel(null);
  };

  const switchRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    resetOtp();
  };

  const mapOtpError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 404) return 'Not registered — contact your school.';
      if (err.status === 401) return 'Incorrect or expired code. Try again.';
    }
    return 'Something went wrong. Please try again.';
  };

  const sendCode = async () => {
    if (!isValidIdentifier(identifier)) {
      setOtpError('Enter a valid mobile number or email.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await requestOtp(identifier.trim());
      setSentChannel(res.channel);
      setOtpStep('sent');
      setCode('');
    } catch (err) {
      setOtpError(mapOtpError(err));
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 4) {
      setOtpError('Enter the code we sent you.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      await signInWithOtp(identifier.trim(), code.trim());
    } catch (err) {
      setOtpError(mapOtpError(err));
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={
        [primaryGradient[0], primaryGradient[1], primaryGradient[2]] as [string, string, string]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flow}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            onPress={() => nav.goBack()}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>
          <View style={styles.hero}>
            <View style={styles.appLogo}>
              <Ionicons name="school" size={28} color={colors.primary} />
            </View>
            <Text style={styles.appName}>Student Help Desk</Text>
            <Text style={styles.tagline}>Welcome! Let&apos;s get you signed in</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.roleToggle}>
              {(['student', 'parent'] as Role[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => switchRole(r)}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                    {r === 'student' ? 'Student' : 'Parent'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!isParent ? (
              <>
                <Controller
                  control={control}
                  name="studentId"
                  render={({ field, fieldState }) => (
                    <View>
                      <Text style={styles.label}>Student ID</Text>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="WBA-2024-1042"
                        placeholderTextColor={colors.inkMuted}
                        autoCapitalize="characters"
                        style={styles.input}
                      />
                      {fieldState.error ? (
                        <Text style={styles.error}>{fieldState.error.message}</Text>
                      ) : null}
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <View>
                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="••••••••"
                        placeholderTextColor={colors.inkMuted}
                        secureTextEntry
                        style={styles.input}
                      />
                      {fieldState.error ? (
                        <Text style={styles.error}>{fieldState.error.message}</Text>
                      ) : null}
                    </View>
                  )}
                />

                <Button
                  variant="primary"
                  size="lg"
                  full
                  loading={formState.isSubmitting}
                  onPress={submit}
                >
                  Sign in
                </Button>
              </>
            ) : otpStep === 'idle' ? (
              <View style={styles.otpBlock}>
                <Text style={styles.label}>Parent email or number</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (otpError) setOtpError(null);
                  }}
                  placeholder="priya.patel@home.com or 415 555 0142"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                {otpError ? <Text style={styles.error}>{otpError}</Text> : null}
                <Button variant="primary" size="lg" full loading={otpLoading} onPress={sendCode}>
                  Send code
                </Button>
              </View>
            ) : (
              <View style={styles.otpBlock}>
                <Text style={styles.otpSentTo}>
                  Code sent via {sentChannel === 'sms' ? 'SMS' : 'email'} to{' '}
                  <Text style={styles.helpStrong}>{identifier.trim()}</Text>
                </Text>
                <Text style={styles.devHint}>Demo code: 123456</Text>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/\D/g, ''));
                    if (otpError) setOtpError(null);
                  }}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
                {otpError ? <Text style={styles.error}>{otpError}</Text> : null}
                <Button variant="primary" size="lg" full loading={otpLoading} onPress={verifyCode}>
                  Verify &amp; sign in
                </Button>
                <View style={styles.otpActions}>
                  <Pressable onPress={sendCode} disabled={otpLoading} hitSlop={8}>
                    <Text style={styles.otpLink}>Resend code</Text>
                  </Pressable>
                  <Pressable onPress={resetOtp} disabled={otpLoading} hitSlop={8}>
                    <Text style={styles.otpLink}>Change number/email</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.help}>
              Need help? <Text style={styles.helpStrong}>Ask your class teacher</Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.xxl },
  back: {
    position: 'absolute',
    top: spacing.s,
    left: 0,
    zIndex: 2,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flow: { flex: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  appLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  appName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 24,
    color: colors.white,
  },
  tagline: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  form: {
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.pop,
  },
  roleToggle: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  roleChipActive: { backgroundColor: colors.primary },
  roleChipText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.inkMuted,
  },
  roleChipTextActive: { color: colors.white },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.rule,
    color: colors.ink,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
  },
  error: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.absent,
    marginTop: 4,
  },
  help: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 4,
  },
  helpStrong: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  otpBlock: { gap: 12 },
  otpSentTo: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.ink,
  },
  devHint: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpLink: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
});

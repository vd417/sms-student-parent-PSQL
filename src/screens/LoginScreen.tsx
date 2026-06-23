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
import { isStrongPassword, PASSWORD_RULE_TEXT } from '@/services/auth/password';

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
  const { signIn, requestOtp, verifyResetCode, setPassword } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const isParent = role === 'parent';

  // --- Student: ID + password ---
  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { studentId: 'WBA-2024-1042', password: '' },
  });

  const [loginError, setLoginError] = useState<string | null>(null);

  const submit = handleSubmit(async (data) => {
    setLoginError(null);
    try {
      await signIn(data.studentId, data.password, role);
    } catch (err) {
      setLoginError(mapAuthError(err));
    }
  });

  // --- Parent: password login + OTP-to-set-password reset flow ---
  type ParentStep = 'password' | 'otp-request' | 'otp-verify' | 'set-password';
  const [parentStep, setParentStep] = useState<ParentStep>('password');
  const [identifier, setIdentifier] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<'sms' | 'email' | null>(null);

  const resetParentFlow = () => {
    setParentStep('password');
    setCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setParentError(null);
    setSentChannel(null);
  };

  const switchRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    resetParentFlow();
    setNotice(null);
  };

  const mapAuthError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 404)
        return 'No account is registered for this email/mobile. Contact your school to get set up.';
      if (err.status === 401) return 'Incorrect code or password. Try again.';
      if (err.status === 409)
        return 'No password yet — use "First time or forgot password?" below.';
      if (err.status === 410) return 'That code expired. Request a new one.';
    }
    return 'Something went wrong. Please try again.';
  };

  const parentLogin = async () => {
    if (!isValidIdentifier(identifier)) {
      setParentError('Enter a valid mobile number or email.');
      return;
    }
    if (parentPassword.length === 0) {
      setParentError('Enter your password.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      await signIn(identifier.trim(), parentPassword, 'parent');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
    }
  };

  const sendCode = async () => {
    if (!isValidIdentifier(identifier)) {
      setParentError('Enter a valid mobile number or email.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      const res = await requestOtp(identifier.trim());
      setSentChannel(res.channel);
      setCode('');
      setParentStep('otp-verify');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) {
      setParentError('Enter the 6-digit code we sent you.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      const { resetToken: token } = await verifyResetCode(identifier.trim(), code.trim());
      setResetToken(token);
      setNewPassword('');
      setConfirmPassword('');
      setParentStep('set-password');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (!isStrongPassword(newPassword)) {
      setParentError(PASSWORD_RULE_TEXT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setParentError('Passwords do not match.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      await setPassword({ token: resetToken, password: newPassword });
      // Do NOT auto sign-in: send them back to login with identifier prefilled.
      setParentPassword('');
      resetParentFlow();
      setNotice('Password set — please log in with your new password.');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
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

                {loginError ? <Text style={styles.error}>{loginError}</Text> : null}
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
            ) : parentStep === 'password' ? (
              <View style={styles.otpBlock}>
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                <Text style={styles.label}>Parent email or number</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="priya.patel@home.com or 415 555 0142"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={parentPassword}
                  onChangeText={(t) => {
                    setParentPassword(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button
                  variant="primary"
                  size="lg"
                  full
                  loading={parentLoading}
                  onPress={parentLogin}
                >
                  Log in
                </Button>
                <Pressable
                  onPress={() => {
                    setNotice(null);
                    setParentError(null);
                    setParentStep('otp-request');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.otpLink}>First time or forgot password?</Text>
                </Pressable>
              </View>
            ) : parentStep === 'otp-request' ? (
              <View style={styles.otpBlock}>
                <Text style={styles.label}>Parent email or number</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="priya.patel@home.com or 415 555 0142"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button variant="primary" size="lg" full loading={parentLoading} onPress={sendCode}>
                  Send code
                </Button>
                <Pressable onPress={resetParentFlow} hitSlop={8}>
                  <Text style={styles.otpLink}>Back to login</Text>
                </Pressable>
              </View>
            ) : parentStep === 'otp-verify' ? (
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
                    if (parentError) setParentError(null);
                  }}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button
                  variant="primary"
                  size="lg"
                  full
                  loading={parentLoading}
                  onPress={verifyCode}
                >
                  Verify code
                </Button>
                <View style={styles.otpActions}>
                  <Pressable onPress={sendCode} disabled={parentLoading} hitSlop={8}>
                    <Text style={styles.otpLink}>Resend code</Text>
                  </Pressable>
                  <Pressable onPress={resetParentFlow} disabled={parentLoading} hitSlop={8}>
                    <Text style={styles.otpLink}>Back to login</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.otpBlock}>
                <Text style={styles.otpSentTo}>Create your password</Text>
                <Text style={styles.devHint}>{PASSWORD_RULE_TEXT}</Text>
                <Text style={styles.label}>New password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button
                  variant="primary"
                  size="lg"
                  full
                  loading={parentLoading}
                  onPress={submitNewPassword}
                >
                  Set password
                </Button>
                <Pressable onPress={resetParentFlow} disabled={parentLoading} hitSlop={8}>
                  <Text style={styles.otpLink}>Back to login</Text>
                </Pressable>
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
  notice: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
    marginBottom: 2,
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

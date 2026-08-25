import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/ui';
import { colors, fontFamily, primaryGradient, radius, shadow, spacing } from '@/theme';
import type { Role } from '@/models';
import { useAuth } from '@/providers/AuthProvider';
import type { AuthStackParamList } from '@/navigation/types';
import { isStrongPassword, PASSWORD_RULE_TEXT } from '@/services/auth/password';
import { isEmailOrPhone, normalizeLoginIdentifier } from '@/services/auth/identifier';
import { loginPrefs } from '@/services/auth/loginPrefs';
import { mapAuthError } from '@/services/auth/authError';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const ROLE_COPY: Record<
  Role,
  { label: string; placeholder: string; autoCapitalize: 'none' | 'characters' }
> = {
  student: {
    label: 'Student ID or email',
    placeholder: 'WBA-2024-1042 or you@school.edu',
    // none — emails must not be uppercased (was causing "No account found")
    autoCapitalize: 'none',
  },
  parent: {
    label: 'Email or mobile',
    placeholder: 'you@email.com or 98765 43210',
    autoCapitalize: 'none',
  },
};

function isValidLoginIdentifier(value: string, role: Role): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  if (isEmailOrPhone(v)) return true;
  return role === 'student' && v.length >= 3;
}

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { signIn, requestPasswordReset, resetPassword } = useAuth();
  const [role, setRole] = useState<Role>('student');

  type Step = 'sign-in' | 'send-code' | 'set-password';
  const [step, setStep] = useState<Step>('sign-in');
  const [identifier, setIdentifier] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<'sms' | 'email' | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otpRecipient, setOtpRecipient] = useState<'self' | 'parent' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loginPrefs.load();
      if (cancelled) return;
      if (saved?.rememberMe && saved.identifier) {
        setRole(saved.role);
        setIdentifier(saved.identifier);
        setRememberMe(true);
      }
      setPrefsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = ROLE_COPY[role];

  const backToSignIn = () => {
    setStep('sign-in');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSentChannel(null);
    setSentTo(null);
    setOtpRecipient(null);
  };

  const switchRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    setIdentifier('');
    setPasswordInput('');
    backToSignIn();
    setNotice(null);
  };

  const persistLoginPrefs = async () => {
    await loginPrefs.save({
      rememberMe,
      role,
      identifier: normalizeLoginIdentifier(identifier),
    });
  };

  const login = async () => {
    if (!isValidLoginIdentifier(identifier, role)) {
      setError(role === 'student' ? 'Enter student ID or email.' : 'Enter email or mobile number.');
      return;
    }
    if (passwordInput.length === 0) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    setError(null);
    const id = normalizeLoginIdentifier(identifier);
    try {
      await signIn(id, passwordInput, role);
      await persistLoginPrefs();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const startPasswordSetup = () => {
    setNotice(null);
    setError(null);
    setStep('send-code');
  };

  const sendCode = async () => {
    if (!isValidLoginIdentifier(identifier, role)) {
      setError(role === 'student' ? 'Enter student ID or email.' : 'Enter email or mobile number.');
      return;
    }
    setLoading(true);
    setError(null);
    const id = normalizeLoginIdentifier(identifier);
    try {
      const res = await requestPasswordReset(id, role);
      setIdentifier(id);
      setSentChannel(res.channel);
      setSentTo(res.sentTo);
      setOtpRecipient(res.recipient);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('set-password');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_RULE_TEXT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    const id = normalizeLoginIdentifier(identifier);
    try {
      await resetPassword(id, code.trim(), newPassword);
      setPasswordInput('');
      backToSignIn();
      setNotice('Password saved — sign in with your new password.');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!prefsLoaded) return null;

  const tagline =
    step === 'sign-in'
      ? "Welcome! Let's get you signed in"
      : step === 'send-code'
        ? 'Set up or reset password'
        : 'Create your new password';

  return (
    <LinearGradient
      colors={[primaryGradient[0], primaryGradient[1], primaryGradient[2]] as [string, string, string]}
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
            onPress={step === 'sign-in' ? () => nav.goBack() : backToSignIn}
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
            <Text style={styles.tagline}>{tagline}</Text>
          </View>

          <View style={styles.form}>
            <ScrollView
              contentContainerStyle={styles.formScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {step === 'sign-in' ? (
                <>
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

                  {notice ? (
                    <View style={styles.noticeBox}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={styles.notice}>{notice}</Text>
                    </View>
                  ) : null}

                  <Field label={copy.label}>
                    <TextInput
                      value={identifier}
                      onChangeText={(t) => {
                        setIdentifier(t);
                        if (error) setError(null);
                      }}
                      placeholder={copy.placeholder}
                      placeholderTextColor={colors.inkMuted}
                      autoCapitalize={copy.autoCapitalize}
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Password">
                    <TextInput
                      value={passwordInput}
                      onChangeText={(t) => {
                        setPasswordInput(t);
                        if (error) setError(null);
                      }}
                      placeholder="Enter password"
                      placeholderTextColor={colors.inkMuted}
                      secureTextEntry
                      style={styles.input}
                    />
                  </Field>

                  <View style={styles.optionsRow}>
                    <Pressable
                      onPress={() => {
                        setRememberMe((v) => {
                          const next = !v;
                          if (!next) void loginPrefs.clear();
                          return next;
                        });
                      }}
                      style={styles.rememberRow}
                      hitSlop={6}
                    >
                      <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                        {rememberMe ? (
                          <Ionicons name="checkmark" size={12} color={colors.white} />
                        ) : null}
                      </View>
                      <Text style={styles.rememberText}>Remember me</Text>
                    </Pressable>
                    <Pressable onPress={startPasswordSetup} hitSlop={8}>
                      <Text style={styles.linkText}>Set up or reset password</Text>
                    </Pressable>
                  </View>

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Button variant="primary" size="lg" full loading={loading} onPress={login}>
                    Sign in
                  </Button>
                </>
              ) : step === 'send-code' ? (
                <>
                  <RoleBadge role={role} />
                  <Text style={styles.stepHint}>
                    Enter your registered{' '}
                    {role === 'student' ? 'student ID or email' : 'email or mobile'}. We&apos;ll send
                    a verification code.
                  </Text>
                  <Field label={copy.label}>
                    <TextInput
                      value={identifier}
                      onChangeText={(t) => {
                        setIdentifier(t);
                        if (error) setError(null);
                      }}
                      placeholder={copy.placeholder}
                      placeholderTextColor={colors.inkMuted}
                      autoCapitalize={copy.autoCapitalize}
                      style={styles.input}
                    />
                  </Field>
                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Button variant="primary" size="lg" full loading={loading} onPress={sendCode}>
                    Send verification code
                  </Button>
                  <Pressable onPress={backToSignIn} hitSlop={8} style={styles.backLink}>
                    <Text style={styles.linkText}>Back to login</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <RoleBadge role={role} />
                  <Text style={styles.stepHint}>
                    {otpRecipient === 'parent'
                      ? 'No student email on file (or delivery failed) — code sent to parent/caregiver via '
                      : 'Code sent via '}
                    {sentChannel === 'sms' ? 'SMS' : 'email'}
                    {sentTo ? (
                      <>
                        {' '}
                        to <Text style={styles.stepHintStrong}>{sentTo}</Text>
                      </>
                    ) : null}
                  </Text>
                  <Field label="Verification code">
                    <TextInput
                      value={code}
                      onChangeText={(t) => {
                        setCode(t.replace(/\D/g, ''));
                        if (error) setError(null);
                      }}
                      placeholder="6-digit code"
                      placeholderTextColor={colors.inkMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.input}
                    />
                  </Field>
                  <Field label="New password">
                    <TextInput
                      value={newPassword}
                      onChangeText={(t) => {
                        setNewPassword(t);
                        if (error) setError(null);
                      }}
                      placeholder="At least 8 characters"
                      placeholderTextColor={colors.inkMuted}
                      secureTextEntry
                      style={styles.input}
                    />
                  </Field>
                  <Field label="Confirm password">
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        if (error) setError(null);
                      }}
                      placeholder="Re-enter password"
                      placeholderTextColor={colors.inkMuted}
                      secureTextEntry
                      style={styles.input}
                    />
                  </Field>
                  <Text style={styles.ruleHint}>{PASSWORD_RULE_TEXT}</Text>
                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Button variant="primary" size="lg" full loading={loading} onPress={submitNewPassword}>
                    Save password
                  </Button>
                  <View style={styles.otpActions}>
                    <Pressable onPress={sendCode} disabled={loading} hitSlop={8}>
                      <Text style={styles.linkText}>Resend code</Text>
                    </Pressable>
                    <Pressable onPress={backToSignIn} disabled={loading} hitSlop={8}>
                      <Text style={styles.linkText}>Back to login</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <View style={styles.roleBadge}>
      <Text style={styles.roleBadgeText}>{role === 'student' ? 'Student' : 'Parent'}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '62%',
    ...shadow.pop,
  },
  formScroll: { gap: 14 },
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
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  roleBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  field: { gap: 6 },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.inkSoft,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.ink,
  },
  linkText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  backLink: { alignItems: 'center' },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  notice: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
  },
  stepHint: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 21,
  },
  stepHintStrong: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
  },
  ruleHint: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: -8,
  },
  error: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.absent,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

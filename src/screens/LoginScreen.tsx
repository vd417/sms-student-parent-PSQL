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
import type { AuthStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const loginSchema = z.object({
  studentId: z.string().min(3, 'Enter your student ID'),
  password: z.string().min(4, 'Password is too short'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { studentId: 'WBA-2024-1042', password: '' },
  });

  const submit = handleSubmit(async (data) => {
    await signIn(data.studentId, data.password, role);
  });

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
                  onPress={() => setRole(r)}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                    {r === 'student' ? 'Student' : 'Parent'}
                  </Text>
                </Pressable>
              ))}
            </View>

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
});

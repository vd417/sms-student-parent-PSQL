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
import { Button, SchoolBadge } from '@/components/ui';
import { colors, fontFamily, primaryGradient, radius, spacing } from '@/theme';
import type { Role } from '@/models';
import { useAuth } from '@/providers/AuthProvider';

const loginSchema = z.object({
  studentId: z.string().min(3, 'Enter your student ID'),
  password: z.string().min(4, 'Password is too short'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
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
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.hero}>
            <View style={styles.brandWrap}>
              <SchoolBadge light />
            </View>
            <Text style={styles.tagline}>For students · Grade 4 to 12</Text>
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
                    placeholderTextColor="rgba(255,255,255,0.55)"
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
                    placeholderTextColor="rgba(255,255,255,0.55)"
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
              variant="white"
              size="lg"
              full
              loading={formState.isSubmitting}
              onPress={submit}
            >
              Sign in
            </Button>

            <Pressable
              style={({ pressed }) => [styles.qr, pressed && { opacity: 0.7 }]}
              onPress={() => signIn('WBA-2024-1042', 'guest', role)}
            >
              <Ionicons name="qr-code-outline" size={18} color={colors.white} />
              <Text style={styles.qrTxt}>Scan school ID card</Text>
            </Pressable>

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
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  brandWrap: { marginBottom: spacing.l },
  tagline: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: -8,
  },
  form: { gap: 12, paddingBottom: spacing.l },
  roleToggle: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  roleChipActive: { backgroundColor: colors.white },
  roleChipText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  roleChipTextActive: { color: colors.primary },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
  },
  error: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: '#FFD0D0',
    marginTop: 4,
  },
  qr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  qrTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.white,
  },
  help: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  helpStrong: {
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
});

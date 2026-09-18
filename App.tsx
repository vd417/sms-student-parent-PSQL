import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { RootNavigator } from '@/navigation/RootNavigator';
import { QueryProvider } from '@/providers/QueryProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { LiveProvider } from '@/providers/LiveProvider';
import { BrandProvider } from '@/providers/BrandProvider';
import { ChildProvider } from '@/providers/ChildProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { colors } from '@/theme';

const isWeb = Platform.OS === 'web';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.primary, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  const inner = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="auto" />
        <QueryProvider>
          <NetworkProvider>
            <AuthProvider>
              <LiveProvider>
                <BrandProvider>
                  <ChildProvider>
                    <ToastProvider>
                      <AppErrorBoundary>
                        <RootNavigator />
                      </AppErrorBoundary>
                    </ToastProvider>
                  </ChildProvider>
                </BrandProvider>
              </LiveProvider>
            </AuthProvider>
          </NetworkProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (isWeb) {
    return (
      <View style={webStyles.shell}>
        <View style={webStyles.phone}>
          <View style={webStyles.statusBar} pointerEvents="none">
            <View style={webStyles.camera} />
          </View>
          <View style={webStyles.body}>{inner}</View>
          <View style={webStyles.homeBar} pointerEvents="none">
            <View style={webStyles.homePill} />
          </View>
        </View>
      </View>
    );
  }

  return inner;
}

const webStyles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only style
    minHeight: '100vh',
  },
  phone: {
    width: 390,
    height: 844,
    // @ts-expect-error web-only style
    maxHeight: '95vh',
    backgroundColor: colors.paper,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#0B0E1F',
    // @ts-expect-error web-only style
    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
  },
  statusBar: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  camera: {
    width: 72,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B0E1F',
  },
  body: { flex: 1 },
  homeBar: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  homePill: {
    width: 96,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11,14,31,0.22)',
  },
});

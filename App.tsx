import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ActivityIndicator, Platform, View } from 'react-native';
import { RootNavigator } from '@/navigation/RootNavigator';
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
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (isWeb) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.primaryDeep,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh' as unknown as number,
        }}
      >
        <View
          style={{
            width: 390,
            height: 844,
            maxHeight: '95vh' as unknown as number,
            backgroundColor: colors.paper,
            borderRadius: 44,
            overflow: 'hidden',
            borderWidth: 8,
            borderColor: '#0B0E1F',
            // @ts-expect-error web-only style
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          }}
        >
          {inner}
        </View>
      </View>
    );
  }

  return inner;
}

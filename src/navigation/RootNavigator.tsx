import { NavigationContainer } from '@react-navigation/native';
import { useIsRestoring } from '@tanstack/react-query';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { Loading } from '@/components/ui/Loading';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { NoticeWatcher } from '@/hooks/useNotifications';
import { PushNotifications } from '@/components/PushNotifications';
import { navigationRef } from './navigationRef';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { ParentNavigator } from './ParentNavigator';

export function RootNavigator() {
  const { status, role } = useAuth();
  // PersistQueryClientProvider renders children while AsyncStorage restore is
  // still running. Queries then report pending + not loading + no data, and
  // the dashboard throws. Hold the signed-in tree until that restore finishes.
  const cacheRestoring = useIsRestoring();
  const authed = status === 'authenticated' && !cacheRestoring;
  return (
    <View style={styles.root}>
      {status !== 'restoring' ? <OfflineBanner /> : null}
      <NavigationContainer ref={navigationRef}>
        {authed ? <NoticeWatcher /> : null}
        {authed ? <PushNotifications /> : null}
        {status === 'restoring' || (status === 'authenticated' && cacheRestoring) ? (
          <Loading />
        ) : status === 'unauthenticated' ? (
          <AuthNavigator />
        ) : role === 'parent' ? (
          <ParentNavigator />
        ) : (
          <StudentNavigator />
        )}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

import { NavigationContainer } from '@react-navigation/native';
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
  const authed = status === 'authenticated';
  return (
    <View style={styles.root}>
      {authed ? <OfflineBanner /> : null}
      <NavigationContainer ref={navigationRef}>
        {authed ? <NoticeWatcher /> : null}
        {authed ? <PushNotifications /> : null}
        {status === 'restoring' ? (
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

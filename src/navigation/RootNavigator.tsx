import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { Loading } from '@/components/ui/Loading';
import { NoticeWatcher } from '@/hooks/useNotifications';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { ParentNavigator } from './ParentNavigator';

export function RootNavigator() {
  const { status, role } = useAuth();
  const authed = status === 'authenticated';
  return (
    <NavigationContainer>
      {authed ? <NoticeWatcher /> : null}
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
  );
}

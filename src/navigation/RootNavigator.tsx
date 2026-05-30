import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { LoginScreen } from '@/screens/LoginScreen';
import { StudentNavigator } from './StudentNavigator';
import { ParentNavigator } from './ParentNavigator';

export function RootNavigator() {
  const { status, role } = useAuth();
  return (
    <NavigationContainer>
      {status === 'unauthenticated' ? (
        <LoginScreen />
      ) : role === 'parent' ? (
        <ParentNavigator />
      ) : (
        <StudentNavigator />
      )}
    </NavigationContainer>
  );
}

import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { LoginScreen } from '@/screens/LoginScreen';
import { StudentNavigator } from './StudentNavigator';
// ParentNavigator is introduced in Milestone 3.

export function RootNavigator() {
  const { status } = useAuth();
  return (
    <NavigationContainer>
      {status === 'unauthenticated' ? (
        <LoginScreen />
      ) : (
        // Milestone 1: both roles land on the student experience.
        // Milestone 3 replaces the parent branch with <ParentNavigator />.
        <StudentNavigator />
      )}
    </NavigationContainer>
  );
}

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentTabNavigator } from './ParentTabNavigator';
import { ParentAttendanceScreen } from '@/features/parent/screens/ParentAttendanceScreen';
import { ParentPTMScreen } from '@/features/parent/screens/ParentPTMScreen';
import { ParentTransportScreen } from '@/features/parent/screens/ParentTransportScreen';
import { ParentLeaveScreen } from '@/features/parent/screens/ParentLeaveScreen';
import { ParentAnnouncementsScreen } from '@/features/parent/screens/ParentAnnouncementsScreen';
import { ParentChatThreadScreen } from '@/features/parent/screens/ParentChatThreadScreen';
import type { ParentStackParamList } from './types';

const Stack = createNativeStackNavigator<ParentStackParamList>();

export function ParentNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Main" component={ParentTabNavigator} />
      <Stack.Screen name="Attendance" component={ParentAttendanceScreen} />
      <Stack.Screen name="PTM" component={ParentPTMScreen} />
      <Stack.Screen name="Transport" component={ParentTransportScreen} />
      <Stack.Screen name="Leave" component={ParentLeaveScreen} />
      <Stack.Screen name="Announcements" component={ParentAnnouncementsScreen} />
      <Stack.Screen name="ChatThread" component={ParentChatThreadScreen} />
    </Stack.Navigator>
  );
}

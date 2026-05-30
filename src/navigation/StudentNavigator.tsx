import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScheduleScreen } from '@/screens/ScheduleScreen';
import { HomeworkDetailScreen } from '@/screens/HomeworkDetailScreen';
import { SubjectDetailScreen } from '@/screens/SubjectDetailScreen';
import { GradesScreen } from '@/screens/GradesScreen';
import { ChatThreadScreen } from '@/screens/ChatThreadScreen';
import { AnnouncementsScreen } from '@/screens/AnnouncementsScreen';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function StudentNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="Grades" component={GradesScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
    </Stack.Navigator>
  );
}

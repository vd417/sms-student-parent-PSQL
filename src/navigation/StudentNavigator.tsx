import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScheduleScreen } from '@/features/student/screens/ScheduleScreen';
import { StudentAttendanceScreen } from '@/features/student/screens/StudentAttendanceScreen';
import { HomeworkDetailScreen } from '@/features/student/screens/HomeworkDetailScreen';
import { SubjectDetailScreen } from '@/features/student/screens/SubjectDetailScreen';
import { GradesScreen } from '@/features/student/screens/GradesScreen';
import { ChatThreadScreen } from '@/features/student/screens/ChatThreadScreen';
import { AnnouncementsScreen } from '@/features/student/screens/AnnouncementsScreen';
import { PersonalInfoScreen } from '@/features/student/screens/PersonalInfoScreen';
import { PrivacyScreen } from '@/features/student/screens/PrivacyScreen';
import { NotificationSettingsScreen } from '@/features/student/screens/NotificationSettingsScreen';
import { ParentTransportScreen } from '@/features/parent/screens/ParentTransportScreen';
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
      <Stack.Screen name="Attendance" component={StudentAttendanceScreen} />
      <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="Grades" component={GradesScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Transport" component={ParentTransportScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}

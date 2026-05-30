import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/theme';
import { HomeScreen } from '@/features/student/screens/HomeScreen';
import { HomeworkListScreen } from '@/features/student/screens/HomeworkListScreen';
import { SubjectsScreen } from '@/features/student/screens/SubjectsScreen';
import { InboxScreen } from '@/features/student/screens/InboxScreen';
import { ProfileScreen } from '@/features/student/screens/ProfileScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Homework: 'book',
  Subjects: 'grid',
  Inbox: 'chatbubbles',
  Profile: 'person',
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fontFamily.bold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.rule,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const name = ICONS[route.name];
          const final: keyof typeof Ionicons.glyphMap = focused
            ? name
            : (`${name}-outline` as keyof typeof Ionicons.glyphMap);
          return <Ionicons name={final} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="Homework" component={HomeworkListScreen} options={{ title: 'Homework' }} />
      <Tab.Screen name="Subjects" component={SubjectsScreen} options={{ title: 'Subjects' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

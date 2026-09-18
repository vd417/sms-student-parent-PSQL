import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/theme';
import { HomeScreen } from '@/features/student/screens/HomeScreen';
import { HomeworkListScreen } from '@/features/student/screens/HomeworkListScreen';
import { SubjectsScreen } from '@/features/student/screens/SubjectsScreen';
import { InboxScreen } from '@/features/student/screens/InboxScreen';
import { ChatThreadScreen } from '@/features/student/screens/ChatThreadScreen';
import { ProfileScreen } from '@/features/student/screens/ProfileScreen';
import { useInboxUnreadCount } from '@/hooks/useMessaging';
import { inboxTabBadge } from '@/lib/noticeRoute';
import { tabBarScreenOptions, useTabSafeAreaInsets } from './tabBar';
import type { InboxStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const InboxStack = createNativeStackNavigator<InboxStackParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Homework: 'book',
  Subjects: 'grid',
  Inbox: 'chatbubbles',
  Profile: 'person',
};

function InboxStackNavigator() {
  return (
    <InboxStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <InboxStack.Screen name="InboxList" component={InboxScreen} />
      <InboxStack.Screen name="ChatThread" component={ChatThreadScreen} />
    </InboxStack.Navigator>
  );
}

export function TabNavigator() {
  const inboxUnread = useInboxUnreadCount('student');
  const safeAreaInsets = useTabSafeAreaInsets();
  return (
    <Tab.Navigator
      backBehavior="history"
      safeAreaInsets={safeAreaInsets}
      screenOptions={({ route }) => ({
        ...tabBarScreenOptions,
        tabBarStyle: {
          ...tabBarScreenOptions.tabBarStyle,
          paddingBottom: safeAreaInsets.bottom,
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Homework" component={HomeworkListScreen} options={{ title: 'Homework' }} />
      <Tab.Screen name="Subjects" component={SubjectsScreen} options={{ title: 'Subjects' }} />
      <Tab.Screen
        name="Inbox"
        component={InboxStackNavigator}
        options={{
          title: 'Inbox',
          tabBarBadge: inboxTabBadge(inboxUnread),
          tabBarBadgeStyle: { backgroundColor: colors.coral, fontSize: 10, fontFamily: fontFamily.extraBold },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

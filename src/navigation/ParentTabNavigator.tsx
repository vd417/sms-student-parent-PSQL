import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/theme';
import { ParentHomeScreen } from '@/features/parent/screens/ParentHomeScreen';
import { ParentClassScreen } from '@/features/parent/screens/ParentClassScreen';
import { ParentFeesScreen } from '@/features/parent/screens/ParentFeesScreen';
import { ParentChatScreen } from '@/features/parent/screens/ParentChatScreen';
import { ParentChatThreadScreen } from '@/features/parent/screens/ParentChatThreadScreen';
import { ParentProfileScreen } from '@/features/parent/screens/ParentProfileScreen';
import { useInboxUnreadCount } from '@/hooks/useMessaging';
import { inboxTabBadge } from '@/lib/noticeRoute';
import { tabBarScreenOptions, useTabSafeAreaInsets } from './tabBar';
import type { InboxStackParamList, ParentTabParamList } from './types';

const Tab = createBottomTabNavigator<ParentTabParamList>();
const InboxStack = createNativeStackNavigator<InboxStackParamList>();

const ICONS: Record<keyof ParentTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Class: 'school',
  Fees: 'card',
  Inbox: 'chatbubbles',
  Profile: 'person',
};

function ParentInboxStackNavigator() {
  return (
    <InboxStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <InboxStack.Screen name="InboxList" component={ParentChatScreen} />
      <InboxStack.Screen name="ChatThread" component={ParentChatThreadScreen} />
    </InboxStack.Navigator>
  );
}

export function ParentTabNavigator() {
  const inboxUnread = useInboxUnreadCount('parent');
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
      <Tab.Screen name="Home" component={ParentHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Class" component={ParentClassScreen} options={{ title: 'Class' }} />
      <Tab.Screen name="Fees" component={ParentFeesScreen} options={{ title: 'Fees' }} />
      <Tab.Screen
        name="Inbox"
        component={ParentInboxStackNavigator}
        options={{
          title: 'Inbox',
          tabBarBadge: inboxTabBadge(inboxUnread),
          tabBarBadgeStyle: { backgroundColor: colors.coral, fontSize: 10, fontFamily: fontFamily.extraBold },
        }}
      />
      <Tab.Screen name="Profile" component={ParentProfileScreen} options={{ title: 'Me' }} />
    </Tab.Navigator>
  );
}

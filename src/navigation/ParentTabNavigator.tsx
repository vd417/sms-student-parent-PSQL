import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/theme';
import { ParentHomeScreen } from '@/features/parent/screens/ParentHomeScreen';
import { ParentClassScreen } from '@/features/parent/screens/ParentClassScreen';
import { ParentFeesScreen } from '@/features/parent/screens/ParentFeesScreen';
import { ParentChatScreen } from '@/features/parent/screens/ParentChatScreen';
import { ParentProfileScreen } from '@/features/parent/screens/ParentProfileScreen';
import type { ParentTabParamList } from './types';

const Tab = createBottomTabNavigator<ParentTabParamList>();

const ICONS: Record<keyof ParentTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Class: 'school',
  Fees: 'card',
  Inbox: 'chatbubbles',
  Profile: 'person',
};

export function ParentTabNavigator() {
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
      <Tab.Screen name="Home" component={ParentHomeScreen} options={{ title: 'Today' }} />
      <Tab.Screen
        name="Class"
        component={ParentClassScreen}
        options={{ title: 'Class' }}
      />
      <Tab.Screen name="Fees" component={ParentFeesScreen} options={{ title: 'Fees' }} />
      <Tab.Screen name="Inbox" component={ParentChatScreen} options={{ title: 'Inbox' }} />
      <Tab.Screen name="Profile" component={ParentProfileScreen} options={{ title: 'Me' }} />
    </Tab.Navigator>
  );
}

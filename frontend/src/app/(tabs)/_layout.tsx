import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, lift } from '@/components/ui';
import { usePushNotifications } from '@/features/notifications/push';
import { useActiveSpace } from '@/features/spaces/api';
import { useSpaceRealtime } from '@/features/spaces/useSpaceRealtime';
import { usePalette } from '@/lib/theme';
import { useSession } from '@/stores/session';

const TABS: { name: string; key: string; icon: IconName; active: IconName }[] = [
  { name: 'index', key: 'home', icon: 'home-outline', active: 'home' },
  { name: 'transactions', key: 'transactions', icon: 'swap-vertical-outline', active: 'swap-vertical' },
  { name: 'ipon', key: 'ipon', icon: 'wallet-outline', active: 'wallet' },
  { name: 'spaces', key: 'spaces', icon: 'people-outline', active: 'people' },
  { name: 'profile', key: 'profile', icon: 'person-circle-outline', active: 'person-circle' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  useSpaceRealtime(useActiveSpace()?.id);
  usePushNotifications(useSession((s) => s.session?.user.id));

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // each tab draws its own gradient header
        tabBarActiveTintColor: c.brandInk,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopWidth: 0,
          height: 68 + insets.bottom, // room for label descenders at large font sizes
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
          ...lift(c, 2),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.key}`),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.active : tab.icon} color={color as string} size={24} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

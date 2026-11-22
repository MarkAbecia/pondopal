import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { usePushNotifications } from '@/features/notifications/push';
import { useActiveSpace } from '@/features/spaces/api';
import { SpaceSwitcher } from '@/features/spaces/SpaceSwitcher';
import { useSpaceRealtime } from '@/features/spaces/useSpaceRealtime';
import { useSession } from '@/stores/session';

type Icon = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; key: string; icon: Icon; switcher: boolean }[] = [
  { name: 'index', key: 'home', icon: 'home', switcher: true },
  { name: 'transactions', key: 'transactions', icon: 'list', switcher: true },
  { name: 'ipon', key: 'ipon', icon: 'wallet', switcher: true },
  { name: 'spaces', key: 'spaces', icon: 'people', switcher: false },
  { name: 'profile', key: 'profile', icon: 'person', switcher: false },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  useSpaceRealtime(useActiveSpace()?.id);
  usePushNotifications(useSession((s) => s.session?.user.id));

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#0B7A44', tabBarInactiveTintColor: '#6B7280' }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.key}`),
            headerTitle: tab.switcher ? () => <SpaceSwitcher /> : undefined,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}

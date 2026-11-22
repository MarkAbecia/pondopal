import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Push tokens need an EAS project id; without one (Expo Go, no `eas init` yet) we skip push and
// reminders still land in the in-app notifications table.
const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;

async function register(userId: string) {
  if (!projectId || Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      // eslint-disable-next-line import/namespace -- re-exported via export *, which the rule misses
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.from('profiles').update({ expo_push_token: token }).eq('user_id', userId);
}

/** Call before signing out so this device stops getting the old account's reminders. */
export async function unregisterPush(userId: string) {
  await supabase.from('profiles').update({ expo_push_token: null }).eq('user_id', userId);
}

/** Registers this device for reminders and opens the right screen when one is tapped. */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    register(userId).catch(() => undefined); // best effort: reminders also live in the inbox
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string | undefined>;
      if (data.challenge_id) router.push(`/challenge/${data.challenge_id}`);
      else if (data.kind === 'bill_due' && data.space_id) router.push(`/space/${data.space_id}`);
    });
    return () => sub.remove();
  }, [userId]);
}

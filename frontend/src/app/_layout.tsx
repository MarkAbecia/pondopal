import '../global.css';
import '@/i18n';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { registerTransactionMutations } from '@/features/transactions/api';
import { persister, queryClient } from '@/lib/query';
import { useSession } from '@/stores/session';

void SplashScreen.preventAutoHideAsync();
// Before restore, so paused offline mutations can find their mutationFn and resume.
registerTransactionMutations(queryClient);

export default function RootLayout() {
  const session = useSession((s) => s.session);
  const ready = useSession((s) => s.ready);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}
      onSuccess={() => queryClient.resumePausedMutations()}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="space/[id]" />
          <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge" />
          <Stack.Screen name="goal" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" />
      </Stack>
    </PersistQueryClientProvider>
  );
}

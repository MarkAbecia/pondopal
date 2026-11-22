import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

// Mutations made offline pause and resume (in order) when the network returns.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 24 * 60 * 60 * 1000, retry: 2 },
    mutations: { retry: 3 },
  },
});

export const PERSIST_KEY = 'pondopal-query-cache';
export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: PERSIST_KEY });

/** On sign-out: no cached money data left on the device. */
export async function clearLocalData(): Promise<void> {
  queryClient.clear();
  await AsyncStorage.removeItem(PERSIST_KEY);
}

import * as SecureStore from 'expo-secure-store';

/**
 * Supabase session storage in the device keychain/keystore. Sessions can exceed SecureStore's
 * ~2 KB per-value limit, so values are split across numbered keys.
 */
const CHUNK = 1800;

async function count(key: string): Promise<number> {
  return Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = await count(key);
    if (n === 0) return null;
    const parts = await Promise.all(
      Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    return parts.some((p) => p === null) ? null : parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    // count last: a crash mid-write leaves no readable (half) session
    await SecureStore.setItemAsync(`${key}.n`, String(n));
  },

  async removeItem(key: string): Promise<void> {
    const n = await count(key);
    await SecureStore.deleteItemAsync(`${key}.n`);
    await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
  },
};

// Web has no SecureStore: use localStorage (Supabase's own web default).
// During server rendering there is no window, so nothing is stored and nobody is signed in.
const store = () => (typeof window === 'undefined' ? null : window.localStorage);

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return store()?.getItem(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store()?.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store()?.removeItem(key);
  },
};

import { secureStorage } from './secure-storage';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockStore.set(k, v),
  deleteItemAsync: async (k: string) => void mockStore.delete(k),
}));

beforeEach(() => mockStore.clear());

describe('secureStorage', () => {
  it('round-trips values larger than one chunk', async () => {
    const big = 'x'.repeat(5000);
    await secureStorage.setItem('sb-token', big);
    expect(mockStore.get('sb-token.n')).toBe('3');
    expect(await secureStorage.getItem('sb-token')).toBe(big);
  });

  it('shrinking a value removes stale chunks', async () => {
    await secureStorage.setItem('k', 'y'.repeat(4000));
    await secureStorage.setItem('k', 'short');
    expect(await secureStorage.getItem('k')).toBe('short');
    expect(mockStore.has('k.1')).toBe(false);
  });

  it('returns null when missing or incomplete', async () => {
    expect(await secureStorage.getItem('none')).toBeNull();
    await secureStorage.setItem('k', 'z'.repeat(4000));
    mockStore.delete('k.1');
    expect(await secureStorage.getItem('k')).toBeNull();
  });

  it('removes everything', async () => {
    await secureStorage.setItem('k', 'z'.repeat(4000));
    await secureStorage.removeItem('k');
    expect(mockStore.size).toBe(0);
  });
});

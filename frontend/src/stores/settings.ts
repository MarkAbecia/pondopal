import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n';

type SettingsState = {
  language: Language | 'system';
  setLanguage: (language: Language | 'system') => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'pondopal-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

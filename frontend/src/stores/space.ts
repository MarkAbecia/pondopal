import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SpaceState = {
  activeSpaceId: string | null; // null = fall back to the personal space
  setActiveSpace: (id: string | null) => void;
};

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set) => ({
      activeSpaceId: null,
      setActiveSpace: (activeSpaceId) => set({ activeSpaceId }),
    }),
    { name: 'pondopal-space', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

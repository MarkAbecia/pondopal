import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { clearLocalData } from '@/lib/query';
import { supabase } from '@/lib/supabase';

import { useSpaceStore } from './space';

type SessionState = { session: Session | null; ready: boolean };

export const useSession = create<SessionState>(() => ({ session: null, ready: false }));

supabase.auth.onAuthStateChange((event, session) => {
  useSession.setState({ session, ready: true });
  if (event === 'SIGNED_OUT') {
    void clearLocalData();
    useSpaceStore.getState().setActiveSpace(null);
  }
});

export const userId = (): string | undefined => useSession.getState().session?.user.id;

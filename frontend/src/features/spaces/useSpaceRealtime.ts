import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/** Live updates for the active space: a partner's new expense shows up without a refresh. */
export function useSpaceRealtime(spaceId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!spaceId) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['transactions', spaceId] });
      void qc.invalidateQueries({ queryKey: ['budgets', spaceId] });
      void qc.invalidateQueries({ queryKey: ['month-summary'] });
    };
    // RLS applies to Realtime too: only rows this user can read are delivered.
    const channel = supabase
      .channel(`space:${spaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `space_id=eq.${spaceId}` },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, spaceId]);
}

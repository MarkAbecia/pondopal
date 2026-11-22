import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/** Live updates for the active space: a partner's new expense or ticked cell shows up without a refresh. */
export function useSpaceRealtime(spaceId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!spaceId) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['transactions', spaceId] });
      void qc.invalidateQueries({ queryKey: ['budgets', spaceId] });
      void qc.invalidateQueries({ queryKey: ['month-summary'] });
      void qc.invalidateQueries({ queryKey: ['challenge'] }); // no-spend days follow expenses too
    };
    const ipon = () => {
      void qc.invalidateQueries({ queryKey: ['challenge'] });
      void qc.invalidateQueries({ queryKey: ['goal'] });
    };
    // RLS applies to Realtime too: only rows this user can read are delivered.
    const channel = supabase
      .channel(`space:${spaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `space_id=eq.${spaceId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenge_entries', filter: `space_id=eq.${spaceId}` },
        ipon,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goal_contributions', filter: `space_id=eq.${spaceId}` },
        ipon,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, spaceId]);
}

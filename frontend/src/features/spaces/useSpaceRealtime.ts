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
    const shared = () => {
      void qc.invalidateQueries({ queryKey: ['splits'] });
      void qc.invalidateQueries({ queryKey: ['settle-up', spaceId] });
      void qc.invalidateQueries({ queryKey: ['paluwagan'] });
    };
    // RLS applies to Realtime too: only rows this user can read are delivered.
    // Unique topic per run: supabase.channel() returns an existing channel of the same name, and the
    // previous run's channel may still be subscribed (removeChannel is async; dev runs effects twice).
    const channel = supabase
      .channel(`space:${spaceId}:${Math.random().toString(36).slice(2)}`)
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
      );
    for (const table of ['transaction_splits', 'settlements', 'paluwagan_rounds'] as const) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `space_id=eq.${spaceId}` }, shared);
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, spaceId]);
}

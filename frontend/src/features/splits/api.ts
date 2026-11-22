import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { supabase, unwrap } from '@/lib/supabase';

import type { SplitBody } from './shares';

// Shapes from misc/api/openapi.json (backend/app/schemas/splits.py)
export type Share = { user_id: string; share_centavos: number };
export type SettleUp = {
  balances: { user_id: string; display_name: string | null; net_centavos: number }[];
  transfers: { from_user: string; to_user: string; amount_centavos: number }[];
};

export function useSplits(txnId: string | undefined) {
  return useQuery({
    queryKey: ['splits', txnId],
    enabled: !!txnId,
    queryFn: async (): Promise<Share[]> =>
      unwrap(await supabase.from('transaction_splits').select('user_id, share_centavos').eq('transaction_id', txnId!)),
  });
}

/** Splits change balances, so settle-up refreshes too. */
function useRefresh(txnId: string, spaceId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['splits', txnId] });
    void qc.invalidateQueries({ queryKey: ['settle-up', spaceId] });
  };
}

export function useSetSplits(txnId: string, spaceId: string) {
  const refresh = useRefresh(txnId, spaceId);
  return useMutation({
    mutationFn: (body: SplitBody) => api<Share[]>(`/v1/transactions/${txnId}/splits`, { method: 'PUT', body }),
    onSettled: refresh,
  });
}

export function useClearSplits(txnId: string, spaceId: string) {
  const refresh = useRefresh(txnId, spaceId);
  return useMutation({
    mutationFn: async () => unwrap(await supabase.from('transaction_splits').delete().eq('transaction_id', txnId)),
    onSettled: refresh,
  });
}

export function useSettleUp(spaceId: string) {
  return useQuery({
    queryKey: ['settle-up', spaceId],
    queryFn: () => api<SettleUp>(`/v1/spaces/${spaceId}/settle-up`),
  });
}

/** Record that `from` paid `to` (RLS: you record your own payments; owners/admins anyone's). */
export function useRecordSettlement(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { from_user: string; to_user: string; amount_centavos: number }) =>
      unwrap(await supabase.from('settlements').insert({ space_id: spaceId, ...t })),
    onSettled: () => qc.invalidateQueries({ queryKey: ['settle-up', spaceId] }),
  });
}

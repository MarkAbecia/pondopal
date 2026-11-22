import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { supabase, unwrap } from '@/lib/supabase';
import type { Row } from '@/types/models';

// Shapes from misc/api/openapi.json (backend/app/schemas/paluwagan.py)
export type Frequency = Row<'paluwagan'>['frequency'];
export type Paluwagan = {
  id: string;
  space_id: string;
  name: string;
  contribution_centavos: number;
  frequency: Frequency;
  start_date: string;
  status: string;
};
export type Schedule = {
  paluwagan: Paluwagan;
  members: { user_id: string; display_name: string | null; payout_order: number }[];
  rounds: {
    round_number: number;
    due_date: string;
    recipient_id: string | null;
    pot_centavos: number;
    paid_count: number;
    payments: { user_id: string; paid_at: string | null }[];
  }[];
  current_round: number | null;
};
export type NewPaluwagan = Omit<Paluwagan, 'id' | 'status'> & { member_ids: string[] };

export function usePaluwagans(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['paluwagan-list', spaceId],
    enabled: !!spaceId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('paluwagan')
          .select('id, name, contribution_centavos, frequency, status')
          .eq('space_id', spaceId!)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false }),
      ),
  });
}

export function useCreatePaluwagan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewPaluwagan) => api<Paluwagan>('/v1/paluwagan', { method: 'POST', body }),
    onSuccess: (p) => qc.invalidateQueries({ queryKey: ['paluwagan-list', p.space_id] }),
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: ['paluwagan', id],
    queryFn: () => api<Schedule>(`/v1/paluwagan/${id}/schedule`),
  });
}

/** Mark a contribution paid or unpaid. Members mark their own; owners/admins anyone's. */
export function usePay(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { round: number; userId: string; paid: boolean }) =>
      api(`/v1/paluwagan/${id}/rounds/${input.round}/pay`, {
        method: 'POST',
        body: { user_id: input.userId, paid: input.paid },
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['paluwagan', id] }),
  });
}

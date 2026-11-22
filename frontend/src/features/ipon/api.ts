import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { supabase, unwrap } from '@/lib/supabase';
import { useSession } from '@/stores/session';
import type { Row } from '@/types/models';

// Shapes from misc/api/openapi.json (backend/app/schemas/challenges.py, goals.py)
export type ChallengeSettings = {
  reverse?: boolean;
  target_bills?: number;
  target_centavos?: number;
  leaderboard?: boolean;
};
export type Template = { key: string; name: string; description: string | null; rules: Record<string, unknown> };
export type Challenge = {
  id: string;
  space_id: string;
  template_key: string;
  name: string;
  base_centavos: number;
  settings: ChallengeSettings;
  start_date: string;
  status: string;
};
export type MemberProgress = {
  user_id: string;
  display_name: string | null;
  saved_centavos: number;
  target_centavos: number | null;
  cells_done: number;
  total_cells: number | null;
  percent: number | null;
  streak: number;
};
export type ChallengeProgress = { challenge: Challenge; me: MemberProgress; cells: number[]; members: MemberProgress[] };
export type NewChallenge = {
  space_id: string;
  template_key: string;
  name: string;
  base_centavos?: number;
  settings: ChallengeSettings;
};
export type EntryInput = { cell_index?: number; bills?: number; amount_centavos?: number };
export type GoalPlan = {
  goal_id: string;
  target_centavos: number;
  contributed_centavos: number;
  remaining_centavos: number;
  deadline: string;
  pay_frequency: string;
  periods_left: number;
  per_period_centavos: number;
  per_day_centavos: number;
  per_week_centavos: number;
  per_payday_centavos: number;
  status: 'on_track' | 'behind' | 'done';
  projected_finish: string | null;
};
export type NewGoal = Pick<Row<'goals'>, 'space_id' | 'name' | 'target_centavos' | 'deadline' | 'pay_frequency'>;

export function useTemplates() {
  return useQuery({
    queryKey: ['challenge-templates'],
    staleTime: Infinity,
    queryFn: () => api<Template[]>('/v1/challenges/templates'),
  });
}

/** Active challenges and goals in a space, for the Ipon tab. */
export function useIpon(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['ipon', spaceId],
    enabled: !!spaceId,
    queryFn: async () => {
      const [challenges, goals] = await Promise.all([
        supabase
          .from('challenges')
          .select('id, name, template_key, base_centavos, settings, start_date')
          .eq('space_id', spaceId!)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('goals')
          .select('id, name, target_centavos, deadline')
          .eq('space_id', spaceId!)
          .order('deadline'),
      ]);
      return { challenges: unwrap(challenges), goals: unwrap(goals) };
    },
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewChallenge) => api<Challenge>('/v1/challenges', { method: 'POST', body: input }),
    onSuccess: (c) => qc.invalidateQueries({ queryKey: ['ipon', c.space_id] }),
  });
}

export function useChallengeProgress(id: string) {
  return useQuery({
    queryKey: ['challenge', id],
    queryFn: () => api<ChallengeProgress>(`/v1/challenges/${id}/progress`),
  });
}

/** Tick a cell (or log bills / an amount). The cell shows as done right away. */
// shortcut: entries need a connection (amounts are computed server-side); queue them like
// transactions (registerTransactionMutations) if offline ticking turns out to matter.
export function useAddEntry(id: string) {
  const qc = useQueryClient();
  const key = ['challenge', id];
  return useMutation({
    mutationFn: (input: EntryInput) => api(`/v1/challenges/${id}/entries`, { method: 'POST', body: input }),
    onMutate: async (input) => {
      if (input.cell_index === undefined) return;
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<ChallengeProgress>(key, (p) => p && { ...p, cells: [...p.cells, input.cell_index!] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Untick one of my cells. RLS lets managers delete anyone's entry, so filter to my own. */
export function useRemoveEntry(id: string) {
  const qc = useQueryClient();
  const uid = useSession((s) => s.session?.user.id);
  const key = ['challenge', id];
  return useMutation({
    mutationFn: async (cell: number) =>
      unwrap(
        await supabase
          .from('challenge_entries')
          .delete()
          .eq('challenge_id', id)
          .eq('user_id', uid!)
          .eq('cell_index', cell),
      ),
    onMutate: async (cell) => {
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<ChallengeProgress>(key, (p) => p && { ...p, cells: p.cells.filter((c) => c !== cell) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewGoal) => unwrap(await supabase.from('goals').insert(input).select('id').single()).id,
    onSuccess: (_, input) => qc.invalidateQueries({ queryKey: ['ipon', input.space_id] }),
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goal', id],
    queryFn: async () => {
      const [goal, plan, contributions] = await Promise.all([
        supabase.from('goals').select('id, space_id, name').eq('id', id).single(),
        api<GoalPlan>(`/v1/goals/${id}/plan`, { method: 'POST' }),
        supabase
          .from('goal_contributions')
          .select('id, amount_centavos, contributed_at, user_id')
          .eq('goal_id', id)
          .order('contributed_at', { ascending: false })
          .limit(50),
      ]);
      return { goal: unwrap(goal), plan, contributions: unwrap(contributions) };
    },
  });
}

export function useContribute(goalId: string, spaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) =>
      unwrap(
        await supabase
          .from('goal_contributions')
          .insert({ goal_id: goalId, space_id: spaceId!, amount_centavos: amount }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ['goal', goalId] }),
  });
}

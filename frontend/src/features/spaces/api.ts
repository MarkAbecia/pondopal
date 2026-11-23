import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { supabase, unwrap } from '@/lib/supabase';
import { useSession } from '@/stores/session';
import { useSpaceStore } from '@/stores/space';
import type { SpaceRole, SpaceType } from '@/types/models';

export type MySpace = { id: string; name: string; type: SpaceType; role: SpaceRole };

const ORDER: Record<SpaceType, number> = { personal: 0, partner: 1, family: 2, group: 3 };

export function useMySpaces() {
  const uid = useSession((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['spaces', uid],
    enabled: !!uid,
    queryFn: async (): Promise<MySpace[]> => {
      const rows = unwrap(
        await supabase
          .from('space_members')
          .select('role, space:spaces(id, name, type)')
          .eq('user_id', uid!)
          .is('left_at', null),
      );
      return rows
        .flatMap((r) => (r.space ? [{ ...r.space, role: r.role }] : []))
        .sort((a, b) => ORDER[a.type] - ORDER[b.type] || a.name.localeCompare(b.name));
    },
  });
}

/** The chosen space, falling back to the personal space. */
export function useActiveSpace(): MySpace | undefined {
  const { data } = useMySpaces();
  const activeId = useSpaceStore((s) => s.activeSpaceId);
  return data?.find((s) => s.id === activeId) ?? data?.find((s) => s.type === 'personal');
}

export const canWrite = (role?: SpaceRole) => role === 'owner' || role === 'admin' || role === 'member';
export const canManage = (role?: SpaceRole) => role === 'owner' || role === 'admin';

export function useCreateSpace() {
  const qc = useQueryClient();
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  return useMutation({
    mutationFn: async (input: { name: string; type: Exclude<SpaceType, 'personal'> }) =>
      unwrap(await supabase.from('spaces').insert(input).select('id').single()).id,
    onSuccess: (id) => {
      setActive(id);
      return qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

export function useJoinSpace() {
  const qc = useQueryClient();
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  return useMutation({
    mutationFn: (code: string) =>
      api<{ space_id: string }>(`/v1/invites/${encodeURIComponent(code.trim())}/accept`, {
        method: 'POST',
      }),
    onSuccess: ({ space_id }) => {
      setActive(space_id);
      return qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

export function useCreateInvite(spaceId: string) {
  return useMutation({
    mutationFn: (role: 'admin' | 'member' | 'viewer') =>
      api<{ code: string; expires_at: string }>(`/v1/spaces/${spaceId}/invites`, {
        method: 'POST',
        body: { role },
      }),
  });
}

export type Member = {
  id: string;
  userId: string;
  role: SpaceRole;
  name: string | null;
  avatarUrl: string | null;
};

export function useMembers(spaceId: string) {
  return useQuery({
    queryKey: ['members', spaceId],
    queryFn: async (): Promise<Member[]> => {
      const members = unwrap(
        await supabase
          .from('space_members')
          .select('id, user_id, role')
          .eq('space_id', spaceId)
          .is('left_at', null),
      );
      // profiles aren't FK-linked to space_members, so fetch them separately
      const profiles = unwrap(
        await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', members.map((m) => m.user_id)),
      );
      const byUser = new Map(profiles.map((p) => [p.user_id, p]));
      return members.map((m) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role,
        name: byUser.get(m.user_id)?.display_name ?? null,
        avatarUrl: byUser.get(m.user_id)?.avatar_url ?? null,
      }));
    },
  });
}

export function useRemoveMember(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) =>
      unwrap(
        await supabase
          .from('space_members')
          .update({ left_at: new Date().toISOString() })
          .eq('id', memberId),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ['members', spaceId] }),
  });
}

/** Owner only, shared spaces only (RLS). Everything in the space goes with it (on delete cascade). */
export function useDeleteSpace() {
  const qc = useQueryClient();
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  return useMutation({
    mutationFn: async (spaceId: string) => {
      // RLS filters a forbidden delete to 0 rows instead of erroring, so check what came back
      const rows = unwrap(await supabase.from('spaces').delete().eq('id', spaceId).select('id'));
      if (!rows.length) throw new Error('Only the owner can delete this space');
    },
    onSuccess: () => {
      setActive(null);
      return qc.invalidateQueries();
    },
  });
}

export function useLeaveSpace() {
  const qc = useQueryClient();
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  return useMutation({
    mutationFn: async (spaceId: string) =>
      unwrap(await supabase.rpc('leave_space', { p_space_id: spaceId })),
    onSuccess: () => {
      setActive(null);
      return qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}

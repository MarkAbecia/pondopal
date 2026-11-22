import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import { supabase, unwrap } from '@/lib/supabase';
import type { TxnType } from '@/types/models';

export type Txn = {
  id: string;
  space_id: string;
  user_id: string | null;
  type: TxnType;
  amount_centavos: number;
  occurred_at: string;
  note: string | null;
  category_id: string | null;
  payment_source_id: string | null;
  receipt_path: string | null;
  category: { name: string; icon: string | null } | null;
};

/** What the form saves. `id` is generated on the device so offline retries are idempotent. */
export type TxnInput = Omit<Txn, 'user_id' | 'category'>;

type Cursor = { occurredAt: string; id: string };
type Pages = InfiniteData<Txn[], Cursor | null>;

const PAGE = 30;
const SELECT =
  'id, space_id, user_id, type, amount_centavos, occurred_at, note, category_id, payment_source_id, receipt_path, category:categories(name, icon)';

export const listKey = (spaceId: string) => ['transactions', spaceId] as const;

export function useTransactions(spaceId: string | undefined) {
  return useInfiniteQuery({
    queryKey: listKey(spaceId ?? ''),
    enabled: !!spaceId,
    initialPageParam: null as Cursor | null,
    queryFn: async ({ pageParam }): Promise<Txn[]> => {
      let q = supabase
        .from('transactions')
        .select(SELECT)
        .eq('space_id', spaceId!)
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE);
      if (pageParam) {
        // keyset pagination on (occurred_at desc, id desc), matching the DB index
        const at = `"${pageParam.occurredAt}"`;
        q = q.or(`occurred_at.lt.${at},and(occurred_at.eq.${at},id.lt.${pageParam.id})`);
      }
      return unwrap(await q);
    },
    getNextPageParam: (last): Cursor | undefined => {
      const tail = last.at(-1);
      return last.length < PAGE || !tail ? undefined : { occurredAt: tail.occurred_at, id: tail.id };
    },
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transaction', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('transactions').select(SELECT).eq('id', id!).single()),
  });
}

function withPages(qc: QueryClient, spaceId: string, edit: (rows: Txn[]) => Txn[]) {
  qc.setQueryData<Pages>(listKey(spaceId), (data) =>
    data ? { ...data, pages: data.pages.map(edit) } : data,
  );
}

function invalidate(qc: QueryClient, spaceId: string) {
  void qc.invalidateQueries({ queryKey: listKey(spaceId) });
  void qc.invalidateQueries({ queryKey: ['budgets', spaceId] });
  void qc.invalidateQueries({ queryKey: ['month-summary'] });
}

/**
 * Mutation logic lives in defaults (not in components) so mutations paused offline can be
 * persisted and resumed after an app restart.
 */
export function registerTransactionMutations(qc: QueryClient) {
  qc.setMutationDefaults(['txn', 'save'], {
    mutationFn: async (input: TxnInput) => {
      unwrap(await supabase.from('transactions').upsert(input));
    },
    onMutate: async (input: TxnInput) => {
      await qc.cancelQueries({ queryKey: listKey(input.space_id) });
      const previous = qc.getQueryData<Pages>(listKey(input.space_id));
      const categories = qc.getQueryData<{ id: string; name: string; icon: string | null }[]>([
        'categories',
        input.space_id,
      ]);
      const cat = categories?.find((c) => c.id === input.category_id);
      const row: Txn = {
        ...input,
        user_id: null,
        category: cat ? { name: cat.name, icon: cat.icon } : null,
      };
      const exists = previous?.pages.some((p) => p.some((t) => t.id === input.id));
      if (exists) {
        withPages(qc, input.space_id, (rows) => rows.map((t) => (t.id === input.id ? { ...t, ...row, user_id: t.user_id } : t)));
      } else if (previous) {
        qc.setQueryData<Pages>(listKey(input.space_id), {
          ...previous,
          pages: [[row, ...(previous.pages[0] ?? [])], ...previous.pages.slice(1)],
        });
      }
      return { previous };
    },
    onError: (_err, input: TxnInput, ctx) => {
      const previous = (ctx as { previous?: Pages } | undefined)?.previous;
      if (previous) qc.setQueryData(listKey(input.space_id), previous);
    },
    onSettled: (_d, _e, input: TxnInput) => invalidate(qc, input.space_id),
  });

  qc.setMutationDefaults(['txn', 'delete'], {
    mutationFn: async (input: TxnRef) => {
      unwrap(await supabase.from('transactions').delete().eq('id', input.id));
    },
    onMutate: async (input: TxnRef) => {
      await qc.cancelQueries({ queryKey: listKey(input.space_id) });
      const previous = qc.getQueryData<Pages>(listKey(input.space_id));
      withPages(qc, input.space_id, (rows) => rows.filter((t) => t.id !== input.id));
      return { previous };
    },
    onError: (_err, input: TxnRef, ctx) => {
      const previous = (ctx as { previous?: Pages } | undefined)?.previous;
      if (previous) qc.setQueryData(listKey(input.space_id), previous);
    },
    onSettled: (_d, _e, input: TxnRef) => invalidate(qc, input.space_id),
  });
}

type TxnRef = { id: string; space_id: string };

export const useSaveTransaction = () => useMutation<void, Error, TxnInput>({ mutationKey: ['txn', 'save'] });
export const useDeleteTransaction = () => useMutation<void, Error, TxnRef>({ mutationKey: ['txn', 'delete'] });

/** Upload a receipt photo to receipts/<space_id>/<txn_id>.jpg (needs a connection). */
export async function uploadReceipt(spaceId: string, txnId: string, uri: string): Promise<string> {
  const path = `${spaceId}/${txnId}.jpg`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

export function useCategories(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['categories', spaceId],
    enabled: !!spaceId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('categories')
          .select('id, name, icon, type')
          .or(`space_id.is.null,space_id.eq.${spaceId}`)
          .order('name'),
      ),
  });
}

export function usePaymentSources() {
  return useQuery({
    queryKey: ['payment-sources'],
    queryFn: async () =>
      unwrap(await supabase.from('payment_sources').select('id, name, kind').order('created_at')),
  });
}

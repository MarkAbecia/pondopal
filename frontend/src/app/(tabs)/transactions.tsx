import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Button, ErrorNote, Money, Muted } from '@/components/ui';
import { canWrite, useActiveSpace } from '@/features/spaces/api';
import { type Txn, useTransactions } from '@/features/transactions/api';
import { manilaDate } from '@/lib/dates';
import { formatPHP } from '@/lib/money';

function Row({ txn }: { txn: Txn }) {
  const { t } = useTranslation();
  const title = txn.category?.name ?? t(`transactions.${txn.type}`);
  const date = manilaDate(new Date(txn.occurred_at));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${txn.type === 'expense' ? '-' : '+'}${formatPHP(txn.amount_centavos)}, ${date}`}
      onPress={() => router.push(`/transaction/${txn.id}`)}
      className="min-h-11 flex-row items-center justify-between border-b border-line-soft px-4 py-3">
      <View className="flex-1 pr-2">
        <Text className="text-base text-fg">{title}</Text>
        <Muted>{txn.note ? `${date} · ${txn.note}` : date}</Muted>
      </View>
      <Money centavos={txn.amount_centavos} type={txn.type} />
    </Pressable>
  );
}

export default function Transactions() {
  const { t } = useTranslation();
  const active = useActiveSpace();
  const q = useTransactions(active?.id);
  const rows = q.data?.pages.flat() ?? [];

  return (
    <View className="flex-1 bg-card">
      {canWrite(active?.role) ? (
        <View className="p-4">
          <Button label={t('transactions.add')} onPress={() => router.push('/transaction/new')} />
        </View>
      ) : null}
      {q.error ? (
        <View className="px-4">
          <ErrorNote message={t('common.error')} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Row txn={item} />}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}
        ListEmptyComponent={
          q.isPending ? undefined : (
            <View className="p-4">
              <Muted>{t('transactions.empty')}</Muted>
            </View>
          )
        }
      />
    </View>
  );
}

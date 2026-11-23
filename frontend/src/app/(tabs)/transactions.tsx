import { router } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Donut } from '@/components/Donut';
import {
  BigMoney,
  Card,
  FIGURE,
  CategoryTile,
  Empty,
  ErrorNote,
  Fab,
  GradientHeader,
  HeaderNote,
  HeaderStat,
  lift,
  Money,
  Segmented,
  StatusScrim,
  Title,
} from '@/components/ui';
import { useCategoryBreakdown, useMonthSummary } from '@/features/home/api';
import { canWrite, useActiveSpace } from '@/features/spaces/api';
import { SpaceSwitcher } from '@/features/spaces/SpaceSwitcher';
import { type Txn, useTransactions } from '@/features/transactions/api';
import { manilaDate, manilaMonth, monthRange } from '@/lib/dates';
import { formatPHP } from '@/lib/money';
import { categoryColor, usePalette } from '@/lib/theme';
import type { TxnType } from '@/types/models';

const SLICES = 5; // the rest fold into "Other"
const MONTHS = 6; // how far back the month strip reaches

/** The current Manila month and the ones before it, newest last: YYYY-MM-01. */
function recentMonths(): string[] {
  const [y, m] = manilaMonth().split('-').map(Number);
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (MONTHS - 1 - i), 1));
    return `${d.toISOString().slice(0, 7)}-01`;
  });
}

/** Month tabs on the gradient; the selected one is a white pill. */
function MonthStrip({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const { t, i18n } = useTranslation();
  const c = usePalette();
  const months = recentMonths();
  const strip = useRef<ComponentRef<typeof ScrollView>>(null);
  const name = (m: string) =>
    new Date(`${m}T00:00:00Z`).toLocaleString(i18n.language === 'fil' ? 'fil-PH' : 'en-PH', { month: 'short', timeZone: 'UTC' });
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={t('transactions.month')}
      className="-mx-5 mt-5"
      contentContainerClassName="gap-2 px-5"
      ref={strip}
      // newest month is on the right; start there
      onContentSizeChange={() => strip.current?.scrollToEnd({ animated: false })}>
      {months.map((m) => {
        const selected = m === value;
        return (
          <Pressable
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={new Date(`${m}T00:00:00Z`).toLocaleString(i18n.language === 'fil' ? 'fil-PH' : 'en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            onPress={() => onChange(m)}
            style={selected ? undefined : { backgroundColor: c.glass }}
            className={`active:opacity-70 min-h-11 min-w-16 items-center justify-center rounded-full px-4 ${selected ? 'bg-white' : ''}`}>
            <Text style={{ color: selected ? c.gradTo : '#FFFFFF' }} className="text-sm font-semibold">
              {name(m)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Row({ txn, first, last }: { txn: Txn; first: boolean; last: boolean }) {
  const { t } = useTranslation();
  const c = usePalette();
  const title = txn.category?.name ?? t(`transactions.${txn.type}`);
  const date = manilaDate(new Date(txn.occurred_at));
  return (
    <View
      style={first ? lift(c) : undefined}
      className={`mx-4 bg-card px-4 ${first ? 'rounded-t-3xl pt-2' : ''} ${last ? 'rounded-b-3xl pb-2' : ''}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${txn.type === 'expense' ? '-' : '+'}${formatPHP(txn.amount_centavos)}, ${date}`}
        onPress={() => router.push(`/transaction/${txn.id}`)}
        className={`min-h-16 flex-row items-center gap-3 py-3 active:opacity-70 ${first ? '' : 'border-t border-line-soft'}`}>
        <CategoryTile name={title} icon={txn.category?.icon} size={46} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-base font-semibold text-fg">
            {title}
          </Text>
          <Text numberOfLines={1} className="text-sm text-muted">
            {txn.note ? `${txn.note}, ${date}` : date}
          </Text>
        </View>
        <Money centavos={txn.amount_centavos} type={txn.type} />
      </Pressable>
    </View>
  );
}

function Report({ spaceId, month }: { spaceId: string | undefined; month: string }) {
  const { t } = useTranslation();
  const c = usePalette();
  const [view, setView] = useState<TxnType>('expense');
  const groups = useCategoryBreakdown(spaceId, month).data?.[view] ?? [];
  const named = groups.map((g) => ({ ...g, label: g.name ?? t('home.uncategorised') }));
  const head = named.slice(0, SLICES).map((g) => ({ key: g.label, value: g.total, color: categoryColor(g.label), icon: g.icon }));
  const rest = named.slice(SLICES).reduce((s, g) => s + g.total, 0);
  const slices = rest > 0 ? [...head, { key: t('home.other'), value: rest, color: c.muted, icon: 'ellipsis-horizontal' }] : head;
  const total = named.reduce((s, g) => s + g.total, 0);

  return (
    <View className="gap-4 px-4 pb-4 pt-5">
      <Segmented
        label={t('home.view')}
        options={[
          { value: 'expense', label: t('home.expense') },
          { value: 'income', label: t('home.income') },
        ]}
        value={view}
        onChange={setView}
      />
      <Card>
        <Text accessibilityRole="header" className="text-base font-bold text-fg">
          {t('transactions.byCategory')}
        </Text>
        {total === 0 ? (
          <Text className="text-sm text-muted">{t('home.nothingYet')}</Text>
        ) : (
          <View className="flex-row items-center gap-4 pt-2">
            <Donut
              slices={slices}
              size={128}
              stroke={20}
              label={slices.map((s) => `${s.key} ${Math.round((s.value * 100) / total)}%`).join(', ')}>
              <Text className="text-xs text-muted">{t('transactions.total')}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={FIGURE} className="max-w-[84px] text-sm text-fg">
                {formatPHP(total)}
              </Text>
            </Donut>
            <View className="flex-1 gap-2.5">
              {slices.map((s) => (
                <View key={s.key} className="flex-row items-center gap-2">
                  <View style={{ backgroundColor: s.color }} className="h-3 w-3 rounded-full" />
                  <Text numberOfLines={1} className="flex-1 text-sm text-fg-2">
                    {s.key}
                  </Text>
                  <Text style={{ fontVariant: ['tabular-nums'] }} className="text-sm font-semibold text-fg">{`${Math.round((s.value * 100) / total)}%`}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>
      <Title>{t('tabs.transactions')}</Title>
    </View>
  );
}

export default function Transactions() {
  const { t } = useTranslation();
  const active = useActiveSpace();
  const [month, setMonth] = useState(manilaMonth);
  const q = useTransactions(active?.id);
  const totals = useMonthSummary(month).data?.bySpace[active?.id ?? ''] ?? { income: 0, expense: 0 };
  const loaded = q.data?.pages.flat() ?? [];
  const { from, to } = monthRange(month);
  // ISO instants in the same UTC format compare correctly as strings
  const rows = loaded.filter((r) => r.occurred_at >= from && r.occurred_at < to);
  const oldest = loaded.at(-1)?.occurred_at;
  const needMore = !!q.hasNextPage && !q.isFetchingNextPage && !!oldest && oldest >= from;

  // the list pages newest first: keep paging until it reaches back past the chosen month
  useEffect(() => {
    if (needMore) void q.fetchNextPage();
  }, [needMore, q]);

  const header = (
    <>
      <GradientHeader>
        <SpaceSwitcher />
        <View className="mt-6 gap-1">
          <HeaderNote>{t('transactions.spent')}</HeaderNote>
          <BigMoney centavos={totals.expense} />
        </View>
        <View className="mt-5 flex-row gap-3">
          <HeaderStat icon="arrow-down" label={t('transactions.earned')} centavos={totals.income} />
          <HeaderStat icon="wallet-outline" label={t('home.net')} centavos={totals.income - totals.expense} />
        </View>
        <MonthStrip value={month} onChange={setMonth} />
      </GradientHeader>
      <Report spaceId={active?.id} month={month} />
      {q.error ? (
        <View className="px-4 pb-4">
          <ErrorNote message={t('common.error')} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />
        </View>
      ) : null}
    </>
  );

  return (
    <View className="flex-1 bg-canvas">
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <Row txn={item} first={index === 0} last={index === rows.length - 1} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 120 }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}
        ListEmptyComponent={
          q.isPending || needMore ? undefined : (
            <View className="px-4">
              <Empty icon="receipt-outline" message={t(month === manilaMonth() ? 'transactions.empty' : 'transactions.emptyMonth')} />
            </View>
          )
        }
      />
      <StatusScrim />
      {canWrite(active?.role) ? <Fab label={t('transactions.add')} onPress={() => router.push('/transaction/new')} /> : null}
    </View>
  );
}

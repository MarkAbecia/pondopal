import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  BigMoney,
  Card,
  CategoryTile,
  Empty,
  ErrorNote,
  Fab,
  GradientHeader,
  HeaderNote,
  HeaderStat,
  lift,
  ListRow,
  Money,
  PillBar,
  Screen,
  Segmented,
  Title,
} from '@/components/ui';
import { useBudgetSummary } from '@/features/budgets/api';
import { useCategoryBreakdown, useMonthSummary } from '@/features/home/api';
import { canWrite, useActiveSpace, useMySpaces } from '@/features/spaces/api';
import { SPACE_ICON, SpaceSwitcher } from '@/features/spaces/SpaceSwitcher';
import { daysLeftInMonth, manilaMonth } from '@/lib/dates';
import { formatPHP } from '@/lib/money';
import { usePalette } from '@/lib/theme';
import { useSpaceStore } from '@/stores/space';
import type { TxnType } from '@/types/models';

/** Every space at a glance, plus where this space's money went and what's safe to spend. */
export default function Home() {
  const { t } = useTranslation();
  const c = usePalette();
  const month = manilaMonth();
  const summary = useMonthSummary(month);
  const { data: spaces = [] } = useMySpaces();
  const active = useActiveSpace();
  const breakdown = useCategoryBreakdown(active?.id, month).data;
  const budget = useBudgetSummary(active?.id, month).data;
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  const [view, setView] = useState<TxnType>('expense');
  const all = summary.data?.all ?? { income: 0, expense: 0 };
  const top = breakdown?.[view] ?? [];
  const mine = summary.data?.bySpace[active?.id ?? ''] ?? { income: 0, expense: 0 };
  const scale = Math.max(mine.income, mine.expense, 1);

  const header = (
    <GradientHeader>
      <SpaceSwitcher />
      <View className="mt-6 gap-1">
        <HeaderNote>{t('home.netAll')}</HeaderNote>
        <BigMoney centavos={all.income - all.expense} />
      </View>
      <View className="mt-5 flex-row gap-3">
        <HeaderStat icon="arrow-down" label={t('home.income')} centavos={all.income} />
        <HeaderStat icon="arrow-up" label={t('home.expense')} centavos={all.expense} />
      </View>
    </GradientHeader>
  );

  return (
    <Screen
      header={header}
      overlay={canWrite(active?.role) ? <Fab label={t('transactions.add')} onPress={() => router.push('/transaction/new')} /> : null}>
      {summary.error ? <ErrorNote message={t('common.error')} onRetry={() => summary.refetch()} retryLabel={t('common.retry')} /> : null}

      <Segmented
        label={t('home.view')}
        options={[
          { value: 'expense', label: t('home.expense') },
          { value: 'income', label: t('home.income') },
        ]}
        value={view}
        onChange={setView}
      />

      {active ? (
        <Card>
          <Text className="text-sm text-muted">{t('home.savings', { name: active.name })}</Text>
          <BigMoney centavos={mine.income - mine.expense} className={mine.income < mine.expense ? 'text-expense' : 'text-fg'} size={30} />
          <View className="mt-2 gap-3">
            {(['income', 'expense'] as const).map((k) => (
              <View key={k} className="flex-row items-center gap-3">
                <Text className="w-16 text-sm font-semibold text-fg-2">{t(k === 'income' ? 'transactions.earned' : 'transactions.spent')}</Text>
                <View className="flex-1">
                  <PillBar
                    value={mine[k]}
                    max={scale}
                    showMax={false}
                    color={k === 'income' ? c.income : c.expense}
                    label={t(k === 'income' ? 'transactions.earned' : 'transactions.spent')}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <View className="flex-row items-center justify-between">
        <Title flush>{t(view === 'expense' ? 'home.topExpense' : 'home.topIncome')}</Title>
        {top.length ? (
          <Pressable accessibilityRole="link" onPress={() => router.push('/transactions')} className="active:opacity-70 min-h-12 justify-center px-1">
            <Text className="text-sm font-semibold text-brand-dark">{t('home.seeAll')}</Text>
          </Pressable>
        ) : null}
      </View>
      {top.length === 0 ? (
        <Empty icon="receipt-outline" message={t('home.nothingYet')} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="gap-3 px-4">
          {top.slice(0, 8).map((x) => {
            const name = x.name ?? t('home.uncategorised');
            return (
              <View
                key={name}
                accessible
                accessibilityLabel={`${name}, ${formatPHP(x.total)}`}
                className="w-24 items-center gap-2">
                <CategoryTile name={name} icon={x.icon} size={60} variant="tint" />
                <Text numberOfLines={1} className="text-xs font-semibold text-fg">
                  {name}
                </Text>
                <Text numberOfLines={1} className="text-xs text-muted">
                  {formatPHP(x.total)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {budget && budget.totalLimit > 0 && active ? (
        <>
          <View className="flex-row items-center justify-between">
            <Title flush>{t('home.monthlyBudget')}</Title>
            <Pressable accessibilityRole="link" onPress={() => router.push(`/space/${active.id}/budgets`)} className="active:opacity-70 min-h-12 justify-center px-1">
              <Text className="text-sm font-semibold text-brand-dark">{t('home.seeAll')}</Text>
            </Pressable>
          </View>
          <Text className="-mt-3 text-sm text-muted">
            {budget.remaining >= 0
              ? `${t('budgets.safeToSpend')}: ${t('budgets.perDay', { amount: formatPHP(budget.perDay), days: daysLeftInMonth() })}`
              : t('budgets.overBudget', { amount: formatPHP(-budget.remaining) })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="gap-3 px-4 pb-2">
            {budget.lines.map((line) => (
              <Pressable
                key={line.categoryId}
                accessibilityRole="button"
                accessibilityLabel={`${line.name}, ${t('budgets.spentOf', { spent: formatPHP(line.spent), limit: formatPHP(line.limit) })}`}
                onPress={() => router.push(`/space/${active.id}/budgets`)}
                style={lift(c)}
                className="w-60 gap-3 rounded-3xl bg-card p-4 active:opacity-80">
                <View className="flex-row items-center gap-3">
                  <CategoryTile name={line.name} icon={line.icon} size={40} variant="tint" />
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-sm font-semibold text-fg">
                      {line.name}
                    </Text>
                    <Text numberOfLines={1} className={`text-xs ${line.spent > line.limit ? 'text-expense' : 'text-muted'}`}>
                      {line.spent > line.limit ? t('budgets.over') : t('home.left', { amount: formatPHP(line.limit - line.spent) })}
                    </Text>
                  </View>
                </View>
                <PillBar value={line.spent} max={line.limit} label={line.name} />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Title>{t('home.yourSpaces')}</Title>
      <Card>
        {spaces.map((s, i) => {
          const totals = summary.data?.bySpace[s.id] ?? { income: 0, expense: 0 };
          return (
            <View key={s.id} className={i ? 'border-t border-line-soft' : ''}>
              <ListRow
                tile={<CategoryTile name={s.name} icon={SPACE_ICON[s.type]} color={c.brand} size={44} variant="tint" />}
                title={s.name}
                note={t(`spaces.types.${s.type}`)}
                right={<Money centavos={totals.income - totals.expense} />}
                label={`${s.name}, ${t('home.net')} ${formatPHP(totals.income - totals.expense)}`}
                onPress={() => {
                  setActive(s.id);
                  router.push(`/space/${s.id}`);
                }}
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

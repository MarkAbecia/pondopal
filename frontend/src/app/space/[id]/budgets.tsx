import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { SpendLine } from '@/components/SpendLine';
import { BigMoney, Button, Card, CategoryTile, ErrorNote, HeaderNote, Muted, PillBar, Screen, StackHeader, TextField, TilePicker, Title } from '@/components/ui';
import { useBudgetSummary, useDeleteBudget, useSetBudget } from '@/features/budgets/api';
import { useCategoryBreakdown } from '@/features/home/api';
import { canManage, useMySpaces } from '@/features/spaces/api';
import { useCategories } from '@/features/transactions/api';
import { daysLeftInMonth, manilaDate, manilaMonth } from '@/lib/dates';
import { formatPHP, parsePesos } from '@/lib/money';
import { usePalette } from '@/lib/theme';

/** One line under each budget: on track, close to the limit, or over it. */
function Status({ spent, limit }: { spent: number; limit: number }) {
  const { t } = useTranslation();
  const c = usePalette();
  const [icon, color, key] =
    spent > limit
      ? (['close-circle', c.expense, 'budgets.over'] as const)
      : spent >= limit * 0.8
        ? (['alert-circle', c.expense, 'budgets.nearLimit'] as const)
        : (['checkmark-circle', c.income, 'budgets.onTrack'] as const);
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={18} color={color} />
      <Text className="text-sm text-muted">{t(key)}</Text>
    </View>
  );
}

export default function Budgets() {
  const { t } = useTranslation();
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const month = manilaMonth();
  const daily = useCategoryBreakdown(id, month).data?.daily;
  const today = Number(manilaDate().slice(8, 10));
  const space = useMySpaces().data?.find((s) => s.id === id);
  const summary = useBudgetSummary(id, month);
  const categories = useCategories(id);
  const setBudget = useSetBudget(id, month);
  const deleteBudget = useDeleteBudget(id);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const manager = canManage(space?.role);
  const s = summary.data;
  const limitCentavos = parsePesos(limit);

  const header = (
    <StackHeader options={{ title: t('spaces.budgets') }} navigation={{ goBack: () => router.back() }} back>
      {s ? (
        <View className="mt-3 gap-1">
          <HeaderNote>{t('budgets.safeToSpend')}</HeaderNote>
          <BigMoney centavos={s.remaining} />
          <HeaderNote>
            {s.remaining >= 0
              ? t('budgets.perDay', { amount: formatPHP(s.perDay), days: daysLeftInMonth() })
              : t('budgets.overBudget', { amount: formatPHP(-s.remaining) })}
          </HeaderNote>
        </View>
      ) : null}
      {daily ? (
        <View className="mt-5">
          <SpendLine
            days={daily}
            upTo={today}
            label={`${t('budgets.dailySpend')}: ${formatPHP(daily.slice(0, today).reduce((a, b) => a + b, 0))}`}
          />
        </View>
      ) : null}
    </StackHeader>
  );

  return (
    <Screen header={header}>
      {/* this screen draws its own taller header with the safe-to-spend figure and the spending line */}
      <Stack.Screen options={{ headerShown: false }} />
      {summary.error ? <ErrorNote message={t('common.error')} onRetry={() => summary.refetch()} retryLabel={t('common.retry')} /> : null}
      {s && s.lines.length === 0 ? <Muted>{t('budgets.empty')}</Muted> : null}
      {s?.lines.map((line) => (
        <Card key={line.categoryId}>
          <View className="flex-row items-center gap-3">
            <CategoryTile name={line.name} icon={line.icon} size={44} variant="tint" />
            <View className="flex-1">
              <Text className="text-base font-bold text-fg">{line.name}</Text>
              <Muted>{t('budgets.spentOf', { spent: formatPHP(line.spent), limit: formatPHP(line.limit) })}</Muted>
            </View>
            {manager ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('common.delete')}, ${line.name}`}
                onPress={() => deleteBudget.mutate(line.budgetId)}
                className="-mr-2 h-12 w-12 items-center justify-center rounded-full active:bg-danger-soft">
                <Ionicons name="trash-outline" size={20} color={c.muted} />
              </Pressable>
            ) : null}
          </View>
          <View className="mt-2">
            <PillBar value={line.spent} max={line.limit} label={line.name} />
          </View>
          <Status spent={line.spent} limit={line.limit} />
        </Card>
      ))}

      {manager ? (
        <>
          <Title>{t('budgets.setLimit')}</Title>
          <TilePicker
            label={t('transactions.category')}
            options={(categories.data ?? []).filter((c) => c.type === 'expense').map((c) => ({ value: c.id, label: c.name, icon: c.icon }))}
            value={categoryId}
            onChange={setCategoryId}
          />
          <TextField label={t('budgets.limit')} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" />
          {setBudget.error ? <ErrorNote message={setBudget.error.message} /> : null}
          <Button
            label={t('common.save')}
            disabled={!categoryId || !limitCentavos || limitCentavos <= 0}
            loading={setBudget.isPending}
            onPress={() =>
              setBudget.mutate(
                { categoryId: categoryId!, limit: limitCentavos! },
                { onSuccess: () => (setLimit(''), setCategoryId(null)) },
              )
            }
          />
        </>
      ) : null}
    </Screen>
  );
}

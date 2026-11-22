import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, Card, Choice, ErrorNote, Money, Muted, Screen, TextField, Title } from '@/components/ui';
import { useBudgetSummary, useDeleteBudget, useSetBudget } from '@/features/budgets/api';
import { canManage, useMySpaces } from '@/features/spaces/api';
import { useCategories } from '@/features/transactions/api';
import { daysLeftInMonth, manilaMonth } from '@/lib/dates';
import { formatPHP, parsePesos } from '@/lib/money';

function Bar({ spent, limit }: { spent: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((spent * 100) / limit)) : 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className="h-2 overflow-hidden rounded-full bg-line-soft">
      <View className={`h-2 ${spent > limit ? 'bg-expense' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
    </View>
  );
}

export default function Budgets() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const month = manilaMonth();
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

  return (
    <Screen>
      <Stack.Screen options={{ title: t('spaces.budgets') }} />
      {summary.error ? <ErrorNote message={t('common.error')} onRetry={() => summary.refetch()} retryLabel={t('common.retry')} /> : null}
      {s ? (
        <Card>
          <Muted>{t('budgets.safeToSpend')}</Muted>
          <Money centavos={s.remaining} className="text-3xl" />
          <Muted>
            {s.remaining >= 0
              ? t('budgets.perDay', { amount: formatPHP(s.perDay), days: daysLeftInMonth() })
              : t('budgets.overBudget', { amount: formatPHP(-s.remaining) })}
          </Muted>
        </Card>
      ) : null}
      {s && s.lines.length === 0 ? <Muted>{t('budgets.empty')}</Muted> : null}
      {s?.lines.map((line) => (
        <Card key={line.categoryId}>
          <View className="flex-row justify-between">
            <Text className="text-base text-fg">{line.name}</Text>
            <Muted>{t('budgets.spentOf', { spent: formatPHP(line.spent), limit: formatPHP(line.limit) })}</Muted>
          </View>
          <Bar spent={line.spent} limit={line.limit} />
          {manager ? (
            <Button label={t('common.delete')} variant="secondary" onPress={() => deleteBudget.mutate(line.budgetId)} />
          ) : null}
        </Card>
      ))}

      {manager ? (
        <>
          <Title>{t('budgets.setLimit')}</Title>
          <Choice
            label={t('transactions.category')}
            options={(categories.data ?? []).filter((c) => c.type === 'expense').map((c) => ({ value: c.id, label: c.name }))}
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

import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Card, ErrorNote, Money, Muted, Screen, Title } from '@/components/ui';
import { useBudgetSummary } from '@/features/budgets/api';
import { useMonthSummary } from '@/features/home/api';
import { useActiveSpace, useMySpaces } from '@/features/spaces/api';
import { daysLeftInMonth, manilaMonth } from '@/lib/dates';
import { formatPHP } from '@/lib/money';
import { useSpaceStore } from '@/stores/space';

function Totals({ income, expense }: { income: number; expense: number }) {
  const { t } = useTranslation();
  return (
    <>
      <View className="flex-row justify-between">
        <Text className="text-fg-2">{t('home.income')}</Text>
        <Money centavos={income} type="income" />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-fg-2">{t('home.expense')}</Text>
        <Money centavos={expense} type="expense" />
      </View>
      <View className="flex-row justify-between">
        <Text className="font-semibold text-fg">{t('home.net')}</Text>
        <Money centavos={income - expense} />
      </View>
    </>
  );
}

/** Roll-up of every space the user belongs to, plus safe-to-spend for the active one. */
export default function Home() {
  const { t } = useTranslation();
  const month = manilaMonth();
  const summary = useMonthSummary(month);
  const { data: spaces = [] } = useMySpaces();
  const active = useActiveSpace();
  const budget = useBudgetSummary(active?.id, month).data;
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  const zero = { income: 0, expense: 0 };

  return (
    <Screen>
      {summary.error ? <ErrorNote message={t('common.error')} onRetry={() => summary.refetch()} retryLabel={t('common.retry')} /> : null}
      {budget && budget.totalLimit > 0 ? (
        <Card label={t('budgets.safeToSpend')} onPress={() => active && router.push(`/space/${active.id}/budgets`)}>
          <Muted>{`${t('budgets.safeToSpend')} · ${active?.name ?? ''}`}</Muted>
          <Money centavos={budget.remaining} className="text-3xl" />
          <Muted>{t('budgets.perDay', { amount: formatPHP(budget.perDay), days: daysLeftInMonth() })}</Muted>
        </Card>
      ) : null}
      <Title>{`${t('home.thisMonth')} · ${t('home.allSpaces')}`}</Title>
      <Card>
        <Totals {...(summary.data?.all ?? zero)} />
      </Card>
      {spaces.map((s) => (
        <Card
          key={s.id}
          label={s.name}
          onPress={() => {
            setActive(s.id);
            router.push(`/space/${s.id}`);
          }}>
          <Text className="text-base font-semibold text-fg">{s.name}</Text>
          <Totals {...(summary.data?.bySpace.get(s.id) ?? zero)} />
        </Card>
      ))}
    </Screen>
  );
}

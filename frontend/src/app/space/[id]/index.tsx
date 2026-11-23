import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BigMoney, Button, Card, CategoryTile, ErrorNote, type IconName, ListRow, Muted, Screen } from '@/components/ui';
import { useMonthSummary } from '@/features/home/api';
import { useLeaveSpace, useMySpaces } from '@/features/spaces/api';
import { manilaMonth } from '@/lib/dates';
import { usePalette } from '@/lib/theme';
import { useSpaceStore } from '@/stores/space';

export default function SpaceDashboard() {
  const { t } = useTranslation();
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const space = useMySpaces().data?.find((s) => s.id === id);
  const totals = useMonthSummary(manilaMonth()).data?.bySpace[id] ?? { income: 0, expense: 0 };
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  const leave = useLeaveSpace();

  if (!space) return <Screen><Muted>{t('common.loading')}</Muted></Screen>;
  const canLeave = space.type !== 'personal' && space.role !== 'owner';
  const shared = space.type !== 'personal';

  const links: { icon: IconName; label: string; go: () => void }[] = [
    {
      icon: 'swap-vertical',
      label: t('tabs.transactions'),
      go: () => {
        setActive(space.id);
        router.push('/transactions');
      },
    },
    { icon: 'pie-chart', label: t('spaces.budgets'), go: () => router.push(`/space/${space.id}/budgets`) },
    ...(shared
      ? [
          { icon: 'people' as const, label: t('spaces.members'), go: () => router.push(`/space/${space.id}/members`) },
          { icon: 'git-compare' as const, label: t('splits.settleUp'), go: () => router.push(`/space/${space.id}/settle`) },
        ]
      : []),
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: space.name }} />
      <Card>
        <Muted>{`${t('home.net')}, ${t('home.thisMonth').toLowerCase()}`}</Muted>
        <BigMoney centavos={totals.income - totals.expense} className="text-fg" size={32} />
        <View className="mt-2 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-income-soft px-3 py-2">
            <Muted>{t('home.income')}</Muted>
            <BigMoney centavos={totals.income} className="text-income" size={16} />
          </View>
          <View className="flex-1 rounded-2xl bg-danger-soft px-3 py-2">
            <Muted>{t('home.expense')}</Muted>
            <BigMoney centavos={totals.expense} className="text-expense" size={16} />
          </View>
        </View>
      </Card>
      <Card>
        {links.map((l, i) => (
          <View key={l.label} className={i ? 'border-t border-line-soft' : ''}>
            <ListRow tile={<CategoryTile name={l.label} icon={l.icon} color={c.brand} size={40} variant="tint" />} title={l.label} onPress={l.go} />
          </View>
        ))}
      </Card>
      {leave.error ? <ErrorNote message={leave.error.message} /> : null}
      {canLeave ? (
        <Button
          icon="exit-outline"
          label={t('spaces.leave')}
          variant="danger"
          loading={leave.isPending}
          onPress={() => leave.mutate(space.id, { onSuccess: () => router.replace('/spaces') })}
        />
      ) : null}
    </Screen>
  );
}

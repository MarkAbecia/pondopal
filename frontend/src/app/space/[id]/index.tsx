import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, Card, ErrorNote, Money, Muted, Screen } from '@/components/ui';
import { useMonthSummary } from '@/features/home/api';
import { useLeaveSpace, useMySpaces } from '@/features/spaces/api';
import { manilaMonth } from '@/lib/dates';
import { useSpaceStore } from '@/stores/space';

export default function SpaceDashboard() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const space = useMySpaces().data?.find((s) => s.id === id);
  const totals = useMonthSummary(manilaMonth()).data?.bySpace.get(id) ?? { income: 0, expense: 0 };
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  const leave = useLeaveSpace();

  if (!space) return <Screen><Muted>{t('common.loading')}</Muted></Screen>;
  const canLeave = space.type !== 'personal' && space.role !== 'owner';

  return (
    <Screen>
      <Stack.Screen options={{ title: space.name }} />
      <Card>
        <Muted>{t('home.thisMonth')}</Muted>
        <View className="flex-row justify-between">
          <Text className="text-fg-2">{t('home.income')}</Text>
          <Money centavos={totals.income} type="income" />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-fg-2">{t('home.expense')}</Text>
          <Money centavos={totals.expense} type="expense" />
        </View>
      </Card>
      <Button
        label={t('tabs.transactions')}
        onPress={() => {
          setActive(space.id);
          router.push('/transactions');
        }}
      />
      <Button label={t('spaces.budgets')} variant="secondary" onPress={() => router.push(`/space/${space.id}/budgets`)} />
      {space.type !== 'personal' ? (
        <Button label={t('spaces.members')} variant="secondary" onPress={() => router.push(`/space/${space.id}/members`)} />
      ) : null}
      <Button label={t('spaces.bills')} variant="secondary" disabled onPress={() => {}} />
      {leave.error ? <ErrorNote message={leave.error.message} /> : null}
      {canLeave ? (
        <Button
          label={t('spaces.leave')}
          variant="danger"
          loading={leave.isPending}
          onPress={() => leave.mutate(space.id, { onSuccess: () => router.replace('/spaces') })}
        />
      ) : null}
    </Screen>
  );
}

import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ProgressRing } from '@/components/ProgressRing';
import { Button, Card, ErrorNote, Money, Muted, Screen, TextField, Title } from '@/components/ui';
import { useContribute, useGoal } from '@/features/ipon/api';
import { canWrite, useMySpaces } from '@/features/spaces/api';
import { manilaDate } from '@/lib/dates';
import { formatPHP, parsePesos } from '@/lib/money';

const STATUS_STYLE = { on_track: 'bg-brand-light text-brand-dark', behind: 'bg-red-50 text-expense', done: 'bg-brand text-white' };

function Row({ label, centavos }: { label: string; centavos: number }) {
  return (
    <View className="min-h-11 flex-row items-center justify-between">
      <Text className="text-base text-gray-700">{label}</Text>
      <Money centavos={centavos} className="text-base" />
    </View>
  );
}

export default function GoalScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const spaceId = goal.data?.goal.space_id;
  const role = useMySpaces().data?.find((s) => s.id === spaceId)?.role;
  const contribute = useContribute(id, spaceId);
  const [amount, setAmount] = useState('');
  const centavos = parsePesos(amount);

  if (!goal.data) {
    return (
      <Screen>
        {goal.error ? (
          <ErrorNote message={goal.error.message} onRetry={() => goal.refetch()} retryLabel={t('common.retry')} />
        ) : (
          <Muted>{t('common.loading')}</Muted>
        )}
      </Screen>
    );
  }

  const { plan, contributions } = goal.data;
  const percent = Math.min(100, Math.floor((plan.contributed_centavos * 100) / plan.target_centavos));
  const summary = t('ipon.savedOf', { saved: formatPHP(plan.contributed_centavos), target: formatPHP(plan.target_centavos) });

  return (
    <Screen>
      <Stack.Screen options={{ title: goal.data.goal.name }} />
      <ProgressRing percent={percent} label={summary}>
        <Money centavos={plan.contributed_centavos} className="text-xl" />
        <Muted>{`${percent}%`}</Muted>
      </ProgressRing>
      <Text className="text-center text-base text-gray-700">{summary}</Text>
      <Text className={`self-center rounded-full px-4 py-1 text-base font-semibold ${STATUS_STYLE[plan.status]}`}>
        {t(`ipon.status.${plan.status}`)}
      </Text>

      {plan.status !== 'done' ? (
        <Card>
          <Muted>{t('ipon.remaining', { amount: formatPHP(plan.remaining_centavos) })}</Muted>
          <Row label={t('ipon.perDay')} centavos={plan.per_day_centavos} />
          <Row label={t('ipon.perWeek')} centavos={plan.per_week_centavos} />
          <Row label={t('ipon.perPayday')} centavos={plan.per_payday_centavos} />
          {plan.projected_finish ? <Muted>{t('ipon.projected', { date: plan.projected_finish })}</Muted> : null}
        </Card>
      ) : null}

      {canWrite(role) ? (
        <Card>
          <TextField label={t('ipon.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          {contribute.error ? <ErrorNote message={contribute.error.message} /> : null}
          <Button
            label={t('ipon.contribute')}
            disabled={!centavos || centavos <= 0}
            loading={contribute.isPending}
            onPress={() => contribute.mutate(centavos!, { onSuccess: () => setAmount('') })}
          />
        </Card>
      ) : null}

      {contributions.length > 0 ? (
        <Card>
          <Title>{t('ipon.contributions')}</Title>
          {contributions.map((c) => (
            <View key={c.id} className="min-h-11 flex-row items-center justify-between">
              <Muted>{manilaDate(new Date(c.contributed_at))}</Muted>
              <Money centavos={c.amount_centavos} type="income" />
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

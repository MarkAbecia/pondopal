import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, Card, ErrorNote, Money, Muted, Screen, Title } from '@/components/ui';
import { type Schedule, usePay, useSchedule } from '@/features/paluwagan/api';
import { canManage, canWrite, useMySpaces } from '@/features/spaces/api';
import { manilaDate } from '@/lib/dates';
import { formatPHP } from '@/lib/money';
import { useSession } from '@/stores/session';

type RoundT = Schedule['rounds'][number];

export default function PaluwaganScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useSession((s) => s.session?.user.id);
  const schedule = useSchedule(id);
  const pay = usePay(id);
  const data = schedule.data;
  const role = useMySpaces().data?.find((s) => s.id === data?.paluwagan.space_id)?.role;

  if (!data) {
    return (
      <Screen>
        {schedule.error ? (
          <ErrorNote message={schedule.error.message} onRetry={() => schedule.refetch()} retryLabel={t('common.retry')} />
        ) : (
          <Muted>{t('common.loading')}</Muted>
        )}
      </Screen>
    );
  }

  const { paluwagan: p, rounds, current_round: current } = data;
  const name = (uid: string | null) =>
    uid === me ? t('ipon.you') : (data.members.find((m) => m.user_id === uid)?.display_name ?? '—');
  const myTurn = rounds.find((r) => r.recipient_id === me);
  const active = p.status === 'active';
  const today = manilaDate();

  const paymentRow = (r: RoundT, pm: RoundT['payments'][number]) => {
    const mine = pm.user_id === me;
    const allowed = active && (canManage(role) || (mine && canWrite(role)));
    const paid = pm.paid_at !== null;
    return (
      <View key={pm.user_id} className="min-h-11 flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="text-base text-fg">{name(pm.user_id)}</Text>
          <Text className={paid ? 'text-sm text-income' : 'text-sm text-muted'}>
            {paid ? t('paluwagan.paid') : t('paluwagan.unpaid')}
          </Text>
        </View>
        {allowed ? (
          <Button
            label={paid ? t('ipon.undo') : mine ? t('paluwagan.iPaid') : t('paluwagan.markPaid')}
            variant={paid ? 'secondary' : 'primary'}
            loading={pay.isPending && pay.variables?.userId === pm.user_id && pay.variables.round === r.round_number}
            onPress={() => pay.mutate({ round: r.round_number, userId: pm.user_id, paid: !paid })}
          />
        ) : null}
      </View>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: p.name }} />
      <Card>
        <Muted>{t('paluwagan.each', { amount: formatPHP(p.contribution_centavos), every: t(`ipon.freq.${p.frequency}`) })}</Muted>
        <Money centavos={rounds[0]?.pot_centavos ?? 0} className="text-2xl" />
        <Muted>{t('paluwagan.potPerRound')}</Muted>
        {p.status === 'completed' ? <Text className="text-base font-semibold text-brand-dark">{t('paluwagan.done')}</Text> : null}
        {myTurn ? <Text className="text-base text-fg">{t('paluwagan.yourTurn', { n: myTurn.round_number, date: myTurn.due_date })}</Text> : null}
      </Card>
      {pay.error ? <ErrorNote message={pay.error.message} /> : null}

      {rounds.map((r) => {
        // payments are editable for the current round and anything already due
        const open = r.round_number === current || r.due_date <= today;
        return (
          <Card key={r.round_number}>
            <View className="flex-row items-center justify-between">
              <Title>{t('paluwagan.round', { n: r.round_number })}</Title>
              <Muted>{r.due_date}</Muted>
            </View>
            <Text className="text-base text-fg">
              {t('paluwagan.receives', { name: name(r.recipient_id), pot: formatPHP(r.pot_centavos) })}
            </Text>
            <Muted>{t('paluwagan.paidCount', { paid: r.paid_count, total: r.payments.length })}</Muted>
            {open ? r.payments.map((pm) => paymentRow(r, pm)) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

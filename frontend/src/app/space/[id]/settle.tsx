import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, Card, ErrorNote, Money, Muted, Screen, Title } from '@/components/ui';
import { useRecordSettlement, useSettleUp } from '@/features/splits/api';
import { canManage, canWrite, useMySpaces } from '@/features/spaces/api';
import { formatPHP } from '@/lib/money';
import { useSession } from '@/stores/session';

export default function SettleUpScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useSession((s) => s.session?.user.id);
  const role = useMySpaces().data?.find((s) => s.id === id)?.role;
  const settle = useSettleUp(id);
  const record = useRecordSettlement(id);
  const data = settle.data;
  const name = (uid: string) =>
    uid === me ? t('ipon.you') : (data?.balances.find((b) => b.user_id === uid)?.display_name ?? '—');

  return (
    <Screen>
      <Stack.Screen options={{ title: t('splits.settleUp') }} />
      {settle.error ? (
        <ErrorNote message={settle.error.message} onRetry={() => settle.refetch()} retryLabel={t('common.retry')} />
      ) : null}
      {!data ? <Muted>{t('common.loading')}</Muted> : null}

      {data ? (
        <>
          <Title>{t('splits.whoOwesWhom')}</Title>
          {data.transfers.length === 0 ? <Muted>{t('splits.allSettled')}</Muted> : null}
          {data.transfers.map((tr) => {
            // you can record what you paid; owners/admins can record anyone's payment
            const canRecord = canManage(role) || (canWrite(role) && tr.from_user === me);
            return (
              <Card key={`${tr.from_user}-${tr.to_user}`}>
                <Text className="text-base text-fg">
                  {t('splits.pays', { from: name(tr.from_user), to: name(tr.to_user), amount: formatPHP(tr.amount_centavos) })}
                </Text>
                {canRecord ? (
                  <Button
                    label={t('splits.markPaid')}
                    variant="secondary"
                    loading={record.isPending && record.variables?.from_user === tr.from_user}
                    onPress={() => record.mutate(tr)}
                  />
                ) : null}
              </Card>
            );
          })}
          {record.error ? <ErrorNote message={record.error.message} /> : null}

          <Title>{t('splits.balances')}</Title>
          <Card>
            {data.balances.map((b) => (
              <View key={b.user_id} className="min-h-11 flex-row items-center justify-between">
                <View>
                  <Text className="text-base text-fg">{name(b.user_id)}</Text>
                  <Muted>
                    {b.net_centavos > 0 ? t('splits.isOwed') : b.net_centavos < 0 ? t('splits.owes') : t('splits.even')}
                  </Muted>
                </View>
                <Money centavos={Math.abs(b.net_centavos)} type={b.net_centavos > 0 ? 'income' : b.net_centavos < 0 ? 'expense' : undefined} />
              </View>
            ))}
          </Card>
          <Muted>{t('splits.howItWorks')}</Muted>
        </>
      ) : null}
    </Screen>
  );
}

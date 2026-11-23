import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ProgressRing';
import { Button, Card, ErrorNote, Money, Muted, Screen, TextField, Title } from '@/components/ui';
import { type ChallengeProgress, type MemberProgress, useAddEntry, useChallengeProgress, useRemoveEntry } from '@/features/ipon/api';
import { cellValue, daysSince, GRID_CELLS, shortPesos, type TemplateKey } from '@/features/ipon/grid';
import { canWrite, useMySpaces } from '@/features/spaces/api';
import { manilaDate } from '@/lib/dates';
import { formatPHP, parsePesos } from '@/lib/money';
import { useSession } from '@/stores/session';

function Cell({
  index,
  label,
  amount,
  done,
  disabled,
  onPress,
}: {
  index: number;
  label: string;
  amount: number | null;
  done: boolean;
  disabled: boolean;
  onPress: (index: number, done: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={t('ipon.cell', { label, index, amount: amount === null ? '' : formatPHP(amount) })}
      accessibilityHint={disabled || done ? undefined : t('ipon.cellHint')}
      accessibilityState={{ checked: done, disabled }}
      disabled={disabled}
      onPress={() => onPress(index, done)}
      className={`active:opacity-70 m-0.5 h-11 w-11 items-center justify-center rounded-lg border ${done ? 'border-brand bg-brand' : 'border-line bg-card'}`}>
      {/* fixed 44pt cells: cap scaling so big system fonts don't overflow; the full value is in the label */}
      <Text maxFontSizeMultiplier={1.3} className={`text-xs font-semibold ${done ? 'text-white' : 'text-fg-2'}`}>
        {index}
      </Text>
      {amount !== null ? (
        <Text maxFontSizeMultiplier={1.3} className={`text-[10px] ${done ? 'text-white' : 'text-muted'}`}>
          {shortPesos(amount)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function Members({ data, me }: { data: ChallengeProgress; me: string | undefined }) {
  const { t } = useTranslation();
  if (data.members.length < 2) return null;
  const ranked = !!data.challenge.settings.leaderboard;
  const unit = data.challenge.template_key === 'week_52' ? 'week' : 'day';
  const line = (m: MemberProgress) =>
    data.challenge.template_key === 'no_spend'
      ? t('ipon.noSpendDays', { count: m.cells_done })
      : m.target_centavos
        ? t('ipon.savedOf', { saved: formatPHP(m.saved_centavos), target: formatPHP(m.target_centavos) })
        : t('ipon.saved', { saved: formatPHP(m.saved_centavos) });
  return (
    <Card>
      <Title>{ranked ? t('ipon.ranking') : t('ipon.members')}</Title>
      {data.members.map((m, i) => (
        <View key={m.user_id} className="min-h-11 flex-row items-center gap-3">
          {ranked ? <Text className="w-6 text-base font-bold text-brand-dark">{i + 1}</Text> : null}
          <View className="flex-1">
            <Text className="text-base text-fg">{m.user_id === me ? t('ipon.you') : (m.display_name ?? '—')}</Text>
            <Muted>{line(m)}</Muted>
          </View>
          {m.streak > 0 ? <Muted>{t(`ipon.streak_${unit}`, { count: m.streak })}</Muted> : null}
        </View>
      ))}
    </Card>
  );
}

function LogForm({ id, kind }: { id: string; kind: 'bill_50' | 'custom' }) {
  const { t } = useTranslation();
  const add = useAddEntry(id);
  const [value, setValue] = useState('');
  const bills = Number.parseInt(value, 10);
  const amount = parsePesos(value);
  const ok = kind === 'bill_50' ? Number.isInteger(bills) && bills > 0 && String(bills) === value.trim() : !!amount && amount > 0;
  return (
    <Card>
      <TextField
        label={kind === 'bill_50' ? t('ipon.bills') : t('ipon.amount')}
        value={value}
        onChangeText={setValue}
        keyboardType={kind === 'bill_50' ? 'number-pad' : 'decimal-pad'}
      />
      {add.error ? <ErrorNote message={add.error.message} /> : null}
      <Button
        label={kind === 'bill_50' ? t('ipon.addBills') : t('ipon.addAmount')}
        disabled={!ok}
        loading={add.isPending}
        onPress={() =>
          add.mutate(kind === 'bill_50' ? { bills } : { amount_centavos: amount! }, { onSuccess: () => setValue('') })
        }
      />
    </Card>
  );
}

export default function ChallengeScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useSession((s) => s.session?.user.id);
  const progress = useChallengeProgress(id);
  const add = useAddEntry(id);
  const remove = useRemoveEntry(id);
  const data = progress.data;
  const role = useMySpaces().data?.find((s) => s.id === data?.challenge.space_id)?.role;

  if (!data) {
    return (
      <Screen>
        {progress.error ? (
          <ErrorNote message={progress.error.message} onRetry={() => progress.refetch()} retryLabel={t('common.retry')} />
        ) : (
          <Muted>{t('common.loading')}</Muted>
        )}
      </Screen>
    );
  }

  const { challenge: ch, me: mine } = data;
  const key = ch.template_key as TemplateKey;
  const noSpend = key === 'no_spend';
  const writable = canWrite(role) && ch.status === 'active';
  const cellCount = GRID_CELLS[key] ?? (noSpend ? daysSince(ch.start_date, manilaDate()) : 0);
  const done = new Set(data.cells);
  const unit = key === 'week_52' ? 'week' : 'day';

  const onCell = (index: number, isDone: boolean) => {
    if (!isDone) return add.mutate({ cell_index: index });
    Alert.alert(t('ipon.undoTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('ipon.undo'), style: 'destructive', onPress: () => remove.mutate(index) },
    ]);
  };

  const headline = noSpend
    ? t('ipon.noSpendDays', { count: mine.cells_done })
    : mine.target_centavos
      ? t('ipon.savedOf', { saved: formatPHP(mine.saved_centavos), target: formatPHP(mine.target_centavos) })
      : t('ipon.saved', { saved: formatPHP(mine.saved_centavos) });

  return (
    <Screen>
      <Stack.Screen options={{ title: ch.name }} />
      <ProgressRing percent={mine.percent ?? 0} label={headline}>
        {noSpend ? (
          <Text className="text-3xl font-bold text-fg">{mine.cells_done}</Text>
        ) : (
          <Money centavos={mine.saved_centavos} className="text-xl" />
        )}
        {mine.percent !== null ? <Muted>{`${mine.percent}%`}</Muted> : null}
      </ProgressRing>
      <Text className="text-center text-base text-fg-2">{headline}</Text>
      <Text accessibilityRole="text" className="text-center text-lg font-semibold text-brand-dark">
        {t(`ipon.streak_${unit}`, { count: mine.streak })}
      </Text>
      {mine.total_cells ? <Muted>{t('ipon.cellsDone', { done: mine.cells_done, total: mine.total_cells })}</Muted> : null}
      {noSpend ? <Muted>{t('ipon.noSpendHint')}</Muted> : null}
      {!writable && !noSpend ? <Muted>{t('ipon.viewOnly')}</Muted> : null}
      {add.error ? <ErrorNote message={add.error.message} /> : null}

      {cellCount > 0 ? (
        <View className="flex-row flex-wrap justify-center">
          {Array.from({ length: cellCount }, (_, i) => i + 1).map((n) => (
            <Cell
              key={n}
              index={n}
              label={unit === 'week' ? t('ipon.week') : t('ipon.day')}
              amount={noSpend ? null : cellValue(key, n, ch.base_centavos, ch.settings.reverse)}
              done={done.has(n)}
              disabled={noSpend || !writable}
              onPress={onCell}
            />
          ))}
        </View>
      ) : null}

      {writable && (key === 'bill_50' || key === 'custom') ? <LogForm id={id} kind={key} /> : null}
      <Members data={data} me={me} />
    </Screen>
  );
}

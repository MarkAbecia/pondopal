import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Button, Choice, ErrorNote, Muted, Screen, TextField } from '@/components/ui';
import { type Frequency, useCreatePaluwagan } from '@/features/paluwagan/api';
import { useActiveSpace, useMembers } from '@/features/spaces/api';
import { isIsoDate, manilaDate } from '@/lib/dates';
import { formatPHP, parsePesos } from '@/lib/money';

const FREQUENCIES: Frequency[] = ['semi_monthly', 'monthly', 'weekly', 'daily'];

export default function NewPaluwagan() {
  const { t } = useTranslation();
  const space = useActiveSpace();
  const members = useMembers(space?.id ?? '').data ?? [];
  const create = useCreatePaluwagan();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('semi_monthly');
  const [start, setStart] = useState(manilaDate());
  const [order, setOrder] = useState<string[]>([]); // payout order, in the order tapped
  const [touched, setTouched] = useState(false);

  const contribution = parsePesos(amount);
  const errors = {
    amount: !contribution || contribution < 100 ? t('transactions.invalidAmount') : undefined,
    start: !isIsoDate(start) ? t('transactions.invalidDate') : undefined,
    members: order.length < 2 ? t('paluwagan.pickTwo') : undefined,
  };
  const valid = !!space && name.trim().length > 0 && !errors.amount && !errors.start && !errors.members;
  const toggle = (id: string) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    create.mutate(
      {
        space_id: space.id,
        name: name.trim(),
        contribution_centavos: contribution!,
        frequency,
        start_date: start,
        member_ids: order,
      },
      { onSuccess: (p) => router.replace(`/paluwagan/${p.id}`) },
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('paluwagan.new') }} />
      <Muted>{t('paluwagan.explain')}</Muted>
      <TextField label={t('ipon.name')} value={name} onChangeText={setName} maxLength={80} />
      <TextField
        label={t('paluwagan.contribution')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        error={touched ? errors.amount : undefined}
      />
      <Choice
        label={t('paluwagan.frequency')}
        options={FREQUENCIES.map((f) => ({ value: f, label: t(`ipon.freq.${f}`) }))}
        value={frequency}
        onChange={setFrequency}
      />
      <TextField label={t('paluwagan.start')} value={start} onChangeText={setStart} error={touched ? errors.start : undefined} />

      <Text className="text-sm font-medium text-fg-2">{t('paluwagan.order')}</Text>
      <Muted>{t('paluwagan.orderHint')}</Muted>
      {members.map((m) => {
        const pos = order.indexOf(m.userId) + 1;
        return (
          <Pressable
            key={m.userId}
            accessibilityRole="checkbox"
            accessibilityLabel={pos ? t('paluwagan.turnOf', { n: pos, name: m.name ?? '—' }) : (m.name ?? '—')}
            accessibilityState={{ checked: pos > 0 }}
            onPress={() => toggle(m.userId)}
            className={`active:opacity-70 min-h-11 flex-row items-center gap-3 rounded-xl border px-3 ${pos ? 'border-brand bg-brand-light' : 'border-line bg-card'}`}>
            <View className={`h-7 w-7 items-center justify-center rounded-full ${pos ? 'bg-brand' : 'bg-line-soft'}`}>
              <Text className={pos ? 'font-bold text-white' : 'text-muted'}>{pos || ''}</Text>
            </View>
            <Text className="text-base text-fg">{m.name ?? '—'}</Text>
          </Pressable>
        );
      })}
      {touched && errors.members ? <ErrorNote message={errors.members} /> : null}
      {contribution && order.length >= 2 ? (
        <Muted>{t('paluwagan.potHint', { pot: formatPHP(contribution * order.length), rounds: order.length })}</Muted>
      ) : null}
      {create.error ? <ErrorNote message={create.error.message} /> : null}
      <Button label={t('paluwagan.create')} loading={create.isPending} onPress={submit} />
    </Screen>
  );
}

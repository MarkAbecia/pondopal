import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Choice, ErrorNote, Money, Muted, TextField, Title } from '@/components/ui';
import { useMembers } from '@/features/spaces/api';
import { formatPHP } from '@/lib/money';

import { useClearSplits, useSetSplits, useSplits } from './api';
import { buildSplit, type SplitMethod } from './shares';

type Props = { txnId: string; spaceId: string; amount: number };

/** Split an expense between members: equally, by percentage or by exact amounts. */
export function SplitEditor({ txnId, spaceId, amount }: Props) {
  const { t } = useTranslation();
  const members = useMembers(spaceId).data ?? [];
  const current = useSplits(txnId).data ?? [];
  const save = useSetSplits(txnId, spaceId);
  const clear = useClearSplits(txnId, spaceId);
  const [method, setMethod] = useState<SplitMethod>('equal');
  const [picked, setPicked] = useState<string[] | null>(null); // null: not touched yet
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  // until the user changes it: the saved split's people, or everyone
  const selected = picked ?? (current.length ? current.map((s) => s.user_id) : members.map((m) => m.userId));

  const check = buildSplit(method, selected, inputs, amount);
  const toggle = (id: string) => setPicked(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const name = (id: string) => members.find((m) => m.userId === id)?.name ?? '—';
  const problem = !touched || check.ok
    ? null
    : check.reason === 'nobody'
      ? t('splits.pickSomeone')
      : check.reason === 'invalid'
        ? t('transactions.invalidAmount')
        : method === 'percent'
          ? t('splits.percentLeft', { value: ((check.remaining ?? 0) / 100).toFixed(2) })
          : t('splits.amountLeft', { amount: formatPHP(check.remaining ?? 0) });

  return (
    <Card>
      <Title>{t('splits.title')}</Title>
      {current.length > 0 ? (
        <View className="gap-1">
          {current.map((s) => (
            <View key={s.user_id} className="flex-row justify-between">
              <Text className="text-fg-2">{name(s.user_id)}</Text>
              <Money centavos={s.share_centavos} />
            </View>
          ))}
        </View>
      ) : (
        <Muted>{t('splits.notSplit')}</Muted>
      )}

      <Choice
        label={t('splits.method')}
        options={(['equal', 'percent', 'exact'] as const).map((m) => ({ value: m, label: t(`splits.methods.${m}`) }))}
        value={method}
        onChange={setMethod}
      />
      {members.map((m) => {
        const on = selected.includes(m.userId);
        return (
          <View key={m.userId} className="gap-1">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={m.name ?? '—'}
              accessibilityState={{ checked: on }}
              onPress={() => toggle(m.userId)}
              className="min-h-11 flex-row items-center gap-3">
              <View className={`h-6 w-6 items-center justify-center rounded border ${on ? 'border-brand bg-brand' : 'border-line'}`}>
                {on ? <Text className="font-bold text-white">✓</Text> : null}
              </View>
              <Text className="text-base text-fg">{m.name ?? '—'}</Text>
            </Pressable>
            {on && method !== 'equal' ? (
              <TextField
                label={method === 'percent' ? t('splits.percentOf', { name: m.name ?? '—' }) : t('splits.amountOf', { name: m.name ?? '—' })}
                value={inputs[m.userId] ?? ''}
                onChangeText={(v) => setInputs((s) => ({ ...s, [m.userId]: v }))}
                keyboardType="decimal-pad"
              />
            ) : null}
          </View>
        );
      })}
      {problem ? <ErrorNote message={problem} /> : null}
      {save.error ? <ErrorNote message={save.error.message} /> : null}
      <Button
        label={t('splits.save')}
        loading={save.isPending}
        onPress={() => {
          setTouched(true);
          if (check.ok) save.mutate(check.body);
        }}
      />
      {current.length > 0 ? (
        <Button label={t('splits.remove')} variant="secondary" loading={clear.isPending} onPress={() => clear.mutate()} />
      ) : null}
    </Card>
  );
}

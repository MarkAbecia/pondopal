import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Text, View } from 'react-native';

import { Button, Choice, ErrorNote, Muted, Screen, TextField } from '@/components/ui';
import { useCreateChallenge, useTemplates } from '@/features/ipon/api';
import { GRID_CELLS, gridTotal, isGrid, type TemplateKey } from '@/features/ipon/grid';
import { useActiveSpace } from '@/features/spaces/api';
import { formatPHP, fromCentavos, parsePesos } from '@/lib/money';

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="min-h-11 flex-row items-center justify-between gap-2">
      <Text className="flex-1 text-base text-fg">{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

export default function NewChallenge() {
  const { t } = useTranslation();
  const space = useActiveSpace();
  const templates = useTemplates();
  const create = useCreateChallenge();
  const [key, setKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [base, setBase] = useState('');
  const [reverse, setReverse] = useState(false);
  const [leaderboard, setLeaderboard] = useState(false);
  const [targetBills, setTargetBills] = useState('');
  const [target, setTarget] = useState('');

  const template = templates.data?.find((x) => x.key === key);
  const defaultBase = Number(template?.rules.default_base_centavos ?? 0);
  const baseCentavos = base ? parsePesos(base) : defaultBase;
  const cells = GRID_CELLS[key as TemplateKey];
  const bills = targetBills ? Number.parseInt(targetBills, 10) : undefined;
  const targetCentavos = target ? parsePesos(target) : undefined;
  const valid =
    !!space &&
    !!key &&
    name.trim().length > 0 &&
    (!isGrid(key) || (!!baseCentavos && baseCentavos > 0)) &&
    (bills === undefined || (Number.isInteger(bills) && bills > 0)) &&
    (targetCentavos === undefined || (!!targetCentavos && targetCentavos > 0));

  const submit = () =>
    create.mutate(
      {
        space_id: space!.id,
        template_key: key!,
        name: name.trim(),
        base_centavos: isGrid(key!) ? baseCentavos! : undefined,
        settings: {
          ...(key === 'week_52' && reverse ? { reverse } : {}),
          ...(key === 'bill_50' && bills ? { target_bills: bills } : {}),
          ...(key === 'custom' && targetCentavos ? { target_centavos: targetCentavos } : {}),
          ...(leaderboard ? { leaderboard } : {}),
        },
      },
      { onSuccess: (c) => router.replace(`/challenge/${c.id}`) },
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('ipon.newChallenge') }} />
      {templates.error ? <ErrorNote message={t('common.error')} onRetry={() => templates.refetch()} retryLabel={t('common.retry')} /> : null}
      <Choice
        label={t('ipon.template')}
        options={(templates.data ?? []).map((x) => ({ value: x.key, label: x.name }))}
        value={key}
        onChange={(k) => {
          setKey(k);
          if (!name) setName(templates.data?.find((x) => x.key === k)?.name ?? '');
        }}
      />
      {template?.description ? <Muted>{template.description}</Muted> : null}
      <TextField label={t('ipon.name')} value={name} onChangeText={setName} maxLength={80} />
      {key && cells ? (
        <>
          <TextField
            label={t('ipon.base')}
            value={base}
            placeholder={fromCentavos(defaultBase)}
            onChangeText={setBase}
            keyboardType="decimal-pad"
          />
          {baseCentavos ? <Muted>{t('ipon.baseHint', { total: formatPHP(gridTotal(baseCentavos, cells)) })}</Muted> : null}
        </>
      ) : null}
      {key === 'week_52' ? <Toggle label={t('ipon.reverse')} value={reverse} onChange={setReverse} /> : null}
      {key === 'bill_50' ? (
        <TextField label={t('ipon.targetBills')} value={targetBills} onChangeText={setTargetBills} keyboardType="number-pad" />
      ) : null}
      {key === 'custom' ? (
        <TextField label={t('ipon.targetAmount')} value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
      ) : null}
      {space && space.type !== 'personal' ? (
        <Toggle label={t('ipon.leaderboard')} value={leaderboard} onChange={setLeaderboard} />
      ) : null}
      {create.error ? <ErrorNote message={create.error.message} /> : null}
      <Button label={t('ipon.start')} disabled={!valid} loading={create.isPending} onPress={submit} />
    </Screen>
  );
}

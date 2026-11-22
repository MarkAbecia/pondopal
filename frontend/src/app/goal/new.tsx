import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Choice, ErrorNote, Screen, TextField } from '@/components/ui';
import { useCreateGoal } from '@/features/ipon/api';
import { useActiveSpace } from '@/features/spaces/api';
import { isIsoDate, manilaDate } from '@/lib/dates';
import { parsePesos } from '@/lib/money';
import type { Row } from '@/types/models';

type Frequency = Row<'goals'>['pay_frequency'];
const FREQUENCIES: Frequency[] = ['semi_monthly', 'monthly', 'weekly', 'daily'];

export default function NewGoal() {
  const { t } = useTranslation();
  const space = useActiveSpace();
  const create = useCreateGoal();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('semi_monthly');
  const [touched, setTouched] = useState(false);

  const targetCentavos = parsePesos(target);
  const targetError = !targetCentavos || targetCentavos <= 0 ? t('ipon.invalidTarget') : undefined;
  const deadlineError = !isIsoDate(deadline)
    ? t('transactions.invalidDate')
    : deadline <= manilaDate()
      ? t('ipon.deadlinePast')
      : undefined;
  const valid = !!space && name.trim().length > 0 && !targetError && !deadlineError;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    create.mutate(
      { space_id: space.id, name: name.trim(), target_centavos: targetCentavos!, deadline, pay_frequency: frequency },
      { onSuccess: (id) => router.replace(`/goal/${id}`) },
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('ipon.newGoal') }} />
      <TextField label={t('ipon.name')} value={name} onChangeText={setName} maxLength={80} />
      <TextField
        label={t('ipon.target')}
        value={target}
        onChangeText={setTarget}
        keyboardType="decimal-pad"
        error={touched ? targetError : undefined}
      />
      <TextField
        label={t('ipon.deadline')}
        value={deadline}
        onChangeText={setDeadline}
        placeholder="2027-06-30"
        error={touched ? deadlineError : undefined}
      />
      <Choice
        label={t('ipon.payFrequency')}
        options={FREQUENCIES.map((f) => ({ value: f, label: t(`ipon.freq.${f}`) }))}
        value={frequency}
        onChange={setFrequency}
      />
      {create.error ? <ErrorNote message={create.error.message} /> : null}
      <Button label={t('ipon.createGoal')} loading={create.isPending} onPress={submit} />
    </Screen>
  );
}

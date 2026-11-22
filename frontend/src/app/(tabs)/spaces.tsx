import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { Button, Card, Choice, ErrorNote, Muted, Screen, TextField, Title } from '@/components/ui';
import { useCreateSpace, useJoinSpace, useMySpaces } from '@/features/spaces/api';
import type { SpaceType } from '@/types/models';

type SharedType = Exclude<SpaceType, 'personal'>;

export default function Spaces() {
  const { t } = useTranslation();
  const { data: spaces = [], error, refetch } = useMySpaces();
  const create = useCreateSpace();
  const join = useJoinSpace();
  const [name, setName] = useState('');
  const [type, setType] = useState<SharedType>('partner');
  const [code, setCode] = useState('');

  const types: SharedType[] = ['partner', 'family', 'group'];

  return (
    <Screen>
      {error ? <ErrorNote message={t('common.error')} onRetry={refetch} retryLabel={t('common.retry')} /> : null}
      {spaces.map((s) => (
        <Card key={s.id} label={s.name} onPress={() => router.push(`/space/${s.id}`)}>
          <Text className="text-base font-semibold text-fg">{s.name}</Text>
          <Muted>{`${t(`spaces.types.${s.type}`)} · ${t(`spaces.roles.${s.role}`)}`}</Muted>
        </Card>
      ))}

      <Title>{t('spaces.create')}</Title>
      <TextField label={t('spaces.name')} value={name} onChangeText={setName} maxLength={80} />
      <Choice
        label={t('spaces.type')}
        options={types.map((v) => ({ value: v, label: t(`spaces.types.${v}`) }))}
        value={type}
        onChange={setType}
      />
      {create.error ? <ErrorNote message={create.error.message} /> : null}
      <Button
        label={t('spaces.create')}
        disabled={!name.trim()}
        loading={create.isPending}
        onPress={() => create.mutate({ name: name.trim(), type }, { onSuccess: () => setName('') })}
      />

      <Title>{t('spaces.join')}</Title>
      <TextField label={t('spaces.inviteCode')} value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={32} />
      {join.error ? <ErrorNote message={join.error.message} /> : null}
      {join.isSuccess ? <Muted>{t('spaces.joined')}</Muted> : null}
      <Button
        label={t('spaces.join')}
        variant="secondary"
        disabled={code.trim().length < 4}
        loading={join.isPending}
        onPress={() => join.mutate(code, { onSuccess: () => setCode('') })}
      />
    </Screen>
  );
}

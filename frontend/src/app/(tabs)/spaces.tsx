import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Button,
  Card,
  CategoryTile,
  Choice,
  ErrorNote,
  GradientHeader,
  HeaderTitle,
  ListRow,
  Muted,
  Screen,
  TextField,
  Title,
} from '@/components/ui';
import { useCreateSpace, useJoinSpace, useMySpaces } from '@/features/spaces/api';
import { SPACE_ICON } from '@/features/spaces/SpaceSwitcher';
import { usePalette } from '@/lib/theme';
import type { SpaceType } from '@/types/models';

type SharedType = Exclude<SpaceType, 'personal'>;

export default function Spaces() {
  const { t } = useTranslation();
  const c = usePalette();
  const { data: spaces = [], error, refetch } = useMySpaces();
  const create = useCreateSpace();
  const join = useJoinSpace();
  const [name, setName] = useState('');
  const [type, setType] = useState<SharedType>('partner');
  const [code, setCode] = useState('');

  const types: SharedType[] = ['partner', 'family', 'group'];

  const header = (
    <GradientHeader>
      <HeaderTitle>{t('tabs.spaces')}</HeaderTitle>
    </GradientHeader>
  );

  return (
    <Screen header={header}>
      {error ? <ErrorNote message={t('common.error')} onRetry={refetch} retryLabel={t('common.retry')} /> : null}
      {spaces.length ? (
        <Card>
          {spaces.map((s, i) => (
            <View key={s.id} className={i ? 'border-t border-line-soft' : ''}>
              <ListRow
                tile={<CategoryTile name={s.name} icon={SPACE_ICON[s.type]} color={c.brand} size={44} variant="tint" />}
                title={s.name}
                note={`${t(`spaces.types.${s.type}`)}, ${t(`spaces.roles.${s.role}`).toLowerCase()}`}
                onPress={() => router.push(`/space/${s.id}`)}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Title>{t('spaces.create')}</Title>
      <Card>
        <View className="gap-4">
          <TextField label={t('spaces.name')} value={name} onChangeText={setName} maxLength={80} />
          <Choice
            label={t('spaces.type')}
            options={types.map((v) => ({ value: v, label: t(`spaces.types.${v}`) }))}
            value={type}
            onChange={setType}
          />
          {create.error ? <ErrorNote message={create.error.message} /> : null}
          <Button
            icon="add"
            label={t('spaces.create')}
            disabled={!name.trim()}
            loading={create.isPending}
            onPress={() => create.mutate({ name: name.trim(), type }, { onSuccess: () => setName('') })}
          />
        </View>
      </Card>

      <Title>{t('spaces.join')}</Title>
      <Card>
        <View className="gap-4">
          <TextField label={t('spaces.inviteCode')} value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={32} />
          {join.error ? <ErrorNote message={join.error.message} /> : null}
          {join.isSuccess ? <Muted>{t('spaces.joined')}</Muted> : null}
          <Button
            icon="enter-outline"
            label={t('spaces.join')}
            variant="secondary"
            disabled={code.trim().length < 4}
            loading={join.isPending}
            onPress={() => join.mutate(code, { onSuccess: () => setCode('') })}
          />
        </View>
      </Card>
    </Screen>
  );
}

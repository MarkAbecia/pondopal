import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, Text, View } from 'react-native';

import { Button, Card, Choice, ErrorNote, Muted, Screen, Title } from '@/components/ui';
import { canManage, useCreateInvite, useMembers, useMySpaces, useRemoveMember } from '@/features/spaces/api';
import { useSession } from '@/stores/session';

type InviteRole = 'admin' | 'member' | 'viewer';

export default function Members() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const space = useMySpaces().data?.find((s) => s.id === id);
  const me = useSession((s) => s.session?.user.id);
  const { data: members = [], error, refetch } = useMembers(id);
  const invite = useCreateInvite(id);
  const remove = useRemoveMember(id);
  const [role, setRole] = useState<InviteRole>('member');
  const manager = canManage(space?.role);

  const share = (code: string) =>
    Share.share({ message: t('spaces.shareInvite', { name: space?.name ?? '', code }) });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('spaces.members') }} />
      {error ? <ErrorNote message={t('common.error')} onRetry={refetch} retryLabel={t('common.retry')} /> : null}
      {members.map((m) => (
        <Card key={m.id}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text className="text-base text-fg">{m.name ?? '—'}</Text>
              <Muted>{t(`spaces.roles.${m.role}`)}</Muted>
            </View>
            {manager && m.role !== 'owner' && m.userId !== me ? (
              <Button label={t('spaces.remove')} variant="secondary" onPress={() => remove.mutate(m.id)} />
            ) : null}
          </View>
        </Card>
      ))}

      {manager ? (
        <>
          <Title>{t('spaces.invite')}</Title>
          <Choice
            label={t('spaces.inviteRole')}
            options={(['admin', 'member', 'viewer'] as const).map((v) => ({ value: v, label: t(`spaces.roles.${v}`) }))}
            value={role}
            onChange={setRole}
          />
          {invite.error ? <ErrorNote message={invite.error.message} /> : null}
          {invite.data ? (
            <Card>
              <Text selectable accessibilityLabel={`${t('spaces.inviteCode')} ${invite.data.code.split('').join(' ')}`} className="text-center text-2xl font-bold tracking-widest">
                {invite.data.code}
              </Text>
            </Card>
          ) : null}
          <Button
            label={t('spaces.invite')}
            loading={invite.isPending}
            onPress={() => invite.mutate(role, { onSuccess: ({ code }) => void share(code) })}
          />
        </>
      ) : null}
    </Screen>
  );
}

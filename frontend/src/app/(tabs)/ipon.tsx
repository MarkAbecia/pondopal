import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { Button, Card, ErrorNote, Money, Muted, Screen, Title } from '@/components/ui';
import { useIpon, useTemplates } from '@/features/ipon/api';
import { canManage, useActiveSpace } from '@/features/spaces/api';

export default function Ipon() {
  const { t } = useTranslation();
  const space = useActiveSpace();
  const ipon = useIpon(space?.id);
  const templates = useTemplates();
  const manager = canManage(space?.role);
  const templateName = (key: string) => templates.data?.find((x) => x.key === key)?.name ?? key;

  return (
    <Screen>
      {ipon.error ? <ErrorNote message={t('common.error')} onRetry={() => ipon.refetch()} retryLabel={t('common.retry')} /> : null}

      <Title>{t('ipon.challenges')}</Title>
      {ipon.data?.challenges.length === 0 ? <Muted>{t('ipon.emptyChallenges')}</Muted> : null}
      {ipon.data?.challenges.map((c) => (
        <Card key={c.id} label={c.name} onPress={() => router.push(`/challenge/${c.id}`)}>
          <Text className="text-base font-semibold text-fg">{c.name}</Text>
          <Muted>{templateName(c.template_key)}</Muted>
        </Card>
      ))}
      {manager ? <Button label={t('ipon.newChallenge')} variant="secondary" onPress={() => router.push('/challenge/new')} /> : null}

      <Title>{t('ipon.goals')}</Title>
      {ipon.data?.goals.length === 0 ? <Muted>{t('ipon.emptyGoals')}</Muted> : null}
      {ipon.data?.goals.map((g) => (
        <Card key={g.id} label={g.name} onPress={() => router.push(`/goal/${g.id}`)}>
          <Text className="text-base font-semibold text-fg">{g.name}</Text>
          <Money centavos={g.target_centavos} />
          <Muted>{g.deadline}</Muted>
        </Card>
      ))}
      {manager ? <Button label={t('ipon.newGoal')} variant="secondary" onPress={() => router.push('/goal/new')} /> : null}
    </Screen>
  );
}

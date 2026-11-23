import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  BigMoney,
  Button,
  Card,
  CategoryTile,
  Empty,
  ErrorNote,
  GradientHeader,
  HeaderNote,
  type IconName,
  ListRow,
  Money,
  Screen,
  Title,
} from '@/components/ui';
import { useIpon, useIponTotal, useTemplates } from '@/features/ipon/api';
import { usePaluwagans } from '@/features/paluwagan/api';
import { canManage, useActiveSpace } from '@/features/spaces/api';
import { SpaceSwitcher } from '@/features/spaces/SpaceSwitcher';
import { formatPHP } from '@/lib/money';

/** A titled group of rows in one card, with an empty state and the add action under it. */
function Section({
  title,
  empty,
  icon,
  rows,
  add,
}: {
  title: string;
  empty: string;
  icon: IconName;
  rows: ReactNode[];
  add?: ReactNode;
}) {
  return (
    <>
      <Title>{title}</Title>
      {rows.length ? (
        <Card>
          {rows.map((row, i) => (
            <View key={i} className={i ? 'border-t border-line-soft' : ''}>
              {row}
            </View>
          ))}
        </Card>
      ) : (
        <Empty icon={icon} message={empty} />
      )}
      {add}
    </>
  );
}

export default function Ipon() {
  const { t } = useTranslation();
  const space = useActiveSpace();
  const ipon = useIpon(space?.id);
  const saved = useIponTotal(space?.id).data ?? 0;
  const templates = useTemplates();
  const shared = !!space && space.type !== 'personal';
  const paluwagans = usePaluwagans(shared ? space.id : undefined);
  const manager = canManage(space?.role);
  const templateName = (key: string) => templates.data?.find((x) => x.key === key)?.name ?? key;

  const header = (
    <GradientHeader>
      <SpaceSwitcher />
      <View className="mt-6 gap-1">
        <HeaderNote>{t('ipon.totalSaved')}</HeaderNote>
        <BigMoney centavos={saved} />
      </View>
    </GradientHeader>
  );

  return (
    <Screen header={header}>
      {ipon.error ? <ErrorNote message={t('common.error')} onRetry={() => ipon.refetch()} retryLabel={t('common.retry')} /> : null}

      <Section
        title={t('ipon.challenges')}
        empty={t('ipon.emptyChallenges')}
        icon="trophy-outline"
        rows={(ipon.data?.challenges ?? []).map((ch) => (
          <ListRow
            key={ch.id}
            tile={<CategoryTile name={ch.template_key} icon="trophy" size={44} variant="tint" />}
            title={ch.name}
            note={templateName(ch.template_key)}
            onPress={() => router.push(`/challenge/${ch.id}`)}
          />
        ))}
        add={manager ? <Button icon="add" label={t('ipon.newChallenge')} variant="secondary" onPress={() => router.push('/challenge/new')} /> : null}
      />

      <Section
        title={t('ipon.goals')}
        empty={t('ipon.emptyGoals')}
        icon="flag-outline"
        rows={(ipon.data?.goals ?? []).map((g) => (
          <ListRow
            key={g.id}
            tile={<CategoryTile name={g.name} icon="flag" size={44} variant="tint" />}
            title={g.name}
            note={g.deadline ?? undefined}
            right={<Money centavos={g.target_centavos} />}
            label={`${g.name}, ${formatPHP(g.target_centavos)}`}
            onPress={() => router.push(`/goal/${g.id}`)}
          />
        ))}
        add={manager ? <Button icon="add" label={t('ipon.newGoal')} variant="secondary" onPress={() => router.push('/goal/new')} /> : null}
      />

      {shared ? (
        <Section
          title={t('paluwagan.title')}
          empty={t('paluwagan.empty')}
          icon="repeat-outline"
          rows={(paluwagans.data ?? []).map((p) => (
            <ListRow
              key={p.id}
              tile={<CategoryTile name={p.name} icon={p.status === 'completed' ? 'checkmark-done' : 'repeat'} size={44} variant="tint" />}
              title={p.name}
              note={
                p.status === 'completed'
                  ? t('paluwagan.done')
                  : t('paluwagan.each', { amount: formatPHP(p.contribution_centavos), every: t(`ipon.freq.${p.frequency}`) })
              }
              onPress={() => router.push(`/paluwagan/${p.id}`)}
            />
          ))}
          add={manager ? <Button icon="add" label={t('paluwagan.new')} variant="secondary" onPress={() => router.push('/paluwagan/new')} /> : null}
        />
      ) : null}
    </Screen>
  );
}

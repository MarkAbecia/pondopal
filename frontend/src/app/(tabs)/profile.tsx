import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

import { Button, Card, Choice, ErrorNote, GradientHeader, HeaderNote, Muted, Screen, Title } from '@/components/ui';
import { deleteMyAccount, exportMyData } from '@/features/account/api';
import { unregisterPush } from '@/features/notifications/push';
import { deviceLanguage } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';
import { useSession } from '@/stores/session';
import { useSettings } from '@/stores/settings';

type Pick = 'system' | 'en' | 'fil';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export default function Profile() {
  const { t } = useTranslation();
  const c = usePalette();
  const user = useSession((s) => s.session?.user);
  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const language = useSettings((s) => s.language);
  const setLanguage = useSettings((s) => s.setLanguage);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickLanguage = (value: Pick) => {
    setLanguage(value);
    // saved on the profile too, for server-side messages; best effort
    if (user) {
      const locale = value === 'system' ? deviceLanguage() : value;
      void supabase.from('profiles').update({ locale }).eq('user_id', user.id);
    }
  };

  const run = async (kind: 'export' | 'delete', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.deleteConfirm'), style: 'destructive', onPress: () => void run('delete', deleteMyAccount) },
    ]);

  const header = (
    <GradientHeader>
      <View className="flex-row items-center gap-4">
        <View accessible={false} style={{ backgroundColor: c.glass }} className="h-16 w-16 items-center justify-center rounded-full">
          <Text className="text-2xl font-bold text-white">{name ? initials(name) : '?'}</Text>
        </View>
        <View className="flex-1 gap-0.5">
          <Text accessibilityRole="header" numberOfLines={1} className="text-2xl font-bold text-white">
            {name ?? '—'}
          </Text>
          <HeaderNote>{user?.email ?? user?.phone ?? ''}</HeaderNote>
        </View>
      </View>
    </GradientHeader>
  );

  return (
    <Screen header={header}>
      <Card>
        <Choice<Pick>
          label={t('profile.language')}
          options={(['system', 'en', 'fil'] as const).map((value) => ({ value, label: t(`profile.languages.${value}`) }))}
          value={language}
          onChange={pickLanguage}
        />
      </Card>

      <Title>{t('profile.privacy')}</Title>
      <Card>
        <View className="gap-4">
          <Muted>{t('profile.privacyHint')}</Muted>
          {error ? <ErrorNote message={error} /> : null}
          <Button
            icon="download-outline"
            label={t('profile.export')}
            variant="secondary"
            loading={busy === 'export'}
            disabled={busy !== null}
            onPress={() => void run('export', exportMyData)}
          />
          <Button
            icon="trash-outline"
            label={t('profile.delete')}
            variant="danger"
            loading={busy === 'delete'}
            disabled={busy !== null}
            onPress={confirmDelete}
          />
        </View>
      </Card>

      <Button
        icon="log-out-outline"
        label={t('auth.signOut')}
        variant="secondary"
        onPress={async () => {
          if (user) await unregisterPush(user.id).catch(() => undefined);
          await supabase.auth.signOut();
        }}
      />
    </Screen>
  );
}

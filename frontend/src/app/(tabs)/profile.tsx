import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { Button, Card, Muted, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/stores/session';

export default function Profile() {
  const { t } = useTranslation();
  const user = useSession((s) => s.session?.user);
  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;

  return (
    <Screen>
      <Card>
        <Text className="text-base font-semibold text-gray-900">{name ?? '—'}</Text>
        <Muted>{user?.email ?? user?.phone ?? ''}</Muted>
      </Card>
      <Button label={t('auth.signOut')} variant="danger" onPress={() => void supabase.auth.signOut()} />
    </Screen>
  );
}

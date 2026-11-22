import { useTranslation } from 'react-i18next';

import { Muted, Screen } from '@/components/ui';

// Phase 5: challenge grid, goals and streaks.
export default function Ipon() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Muted>{t('ipon.comingSoon')}</Muted>
    </Screen>
  );
}

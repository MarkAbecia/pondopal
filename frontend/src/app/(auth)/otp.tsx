import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthHeader, Button, ErrorNote, Screen, TextField } from '@/components/ui';
import { toE164PH } from '@/features/auth/phone';
import { supabase } from '@/lib/supabase';

export default function Otp() {
  const { t } = useTranslation();
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<string | null>(null); // set once the code is sent
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ error: { message: string } | null }>) => {
    setBusy(true);
    setError(null);
    const { error: e } = await fn();
    setBusy(false);
    return e ? (setError(e.message), false) : true;
  };

  const sendCode = async () => {
    const normalized = toE164PH(phoneInput);
    if (!normalized) return setError(t('auth.invalidPhone'));
    if (await run(() => supabase.auth.signInWithOtp({ phone: normalized }))) setPhone(normalized);
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) return setError(t('auth.invalidCode'));
    await run(() => supabase.auth.verifyOtp({ phone: phone!, token: code, type: 'sms' }));
  };

  return (
    <Screen header={<AuthHeader subtitle={t('auth.withPhone')} />}>
      {error ? <ErrorNote message={error} /> : null}
      {phone === null ? (
        <>
          <TextField
            label={t('auth.phone')}
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="0917 123 4567"
          />
          <Button label={t('auth.sendCode')} onPress={sendCode} loading={busy} />
        </>
      ) : (
        <>
          <TextField
            label={t('auth.code')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
          />
          <Button label={t('auth.verify')} onPress={verify} loading={busy} />
        </>
      )}
    </Screen>
  );
}

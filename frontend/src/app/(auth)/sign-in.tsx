import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Platform, Text } from 'react-native';
import { z } from 'zod';

import { Button, ErrorNote, Screen, TextField, Title } from '@/components/ui';
import { signInWithProvider } from '@/features/auth/oauth';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const schema = z.object({
    email: z.email(t('auth.invalidEmail')),
    password: z.string().min(1, t('auth.passwordTooShort')),
  });
  const { control, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword(values);
    if (e) setError(e.message);
    // on success the session store flips and the auth gate shows the app
  });

  const oauth = (provider: 'google' | 'apple') => () =>
    signInWithProvider(provider).catch((e: Error) => setError(e.message));

  return (
    <Screen>
      <Title>PondoPal</Title>
      {error ? <ErrorNote message={error} /> : null}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.email')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />
        )}
      />
      <Button label={t('auth.signIn')} onPress={submit} loading={formState.isSubmitting} />
      <Button label={t('auth.withGoogle')} variant="secondary" onPress={oauth('google')} />
      {Platform.OS === 'ios' ? (
        <Button label={t('auth.withApple')} variant="secondary" onPress={oauth('apple')} />
      ) : null}
      <Link href="/otp" asChild>
        <Text accessibilityRole="link" className="min-h-11 py-3 text-center text-brand">
          {t('auth.withPhone')}
        </Text>
      </Link>
      <Link href="/sign-up" asChild>
        <Text accessibilityRole="link" className="min-h-11 py-3 text-center text-brand">
          {t('auth.noAccount')}
        </Text>
      </Link>
    </Screen>
  );
}

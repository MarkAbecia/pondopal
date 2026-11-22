import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { z } from 'zod';

import { Button, ErrorNote, Muted, Screen, TextField, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const schema = z.object({
    name: z.string().trim().min(1).max(80),
    email: z.email(t('auth.invalidEmail')),
    password: z.string().min(8, t('auth.passwordTooShort')),
  });
  const { control, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const submit = handleSubmit(async ({ name, email, password }) => {
    setError(null);
    const { data, error: e } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: Linking.createURL('auth/callback') },
    });
    if (e) setError(e.message);
    else if (!data.session) setCheckEmail(true); // email confirmation is on
  });

  const fields = [
    { name: 'name' as const, label: t('auth.name'), props: { autoComplete: 'name' as const } },
    {
      name: 'email' as const,
      label: t('auth.email'),
      props: { autoCapitalize: 'none' as const, keyboardType: 'email-address' as const, autoComplete: 'email' as const },
    },
    {
      name: 'password' as const,
      label: t('auth.password'),
      props: { secureTextEntry: true, autoComplete: 'new-password' as const },
    },
  ];

  return (
    <Screen>
      <Title>{t('auth.signUp')}</Title>
      {error ? <ErrorNote message={error} /> : null}
      {checkEmail ? <Muted>{t('auth.checkEmail')}</Muted> : null}
      {fields.map((f) => (
        <Controller
          key={f.name}
          control={control}
          name={f.name}
          render={({ field, fieldState }) => (
            <TextField
              label={f.label}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              {...f.props}
            />
          )}
        />
      ))}
      <Button label={t('auth.signUp')} onPress={submit} loading={formState.isSubmitting} />
      <Link href="/sign-in" asChild>
        <Text accessibilityRole="link" className="min-h-11 py-3 text-center text-brand">
          {t('auth.haveAccount')}
        </Text>
      </Link>
    </Screen>
  );
}

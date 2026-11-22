import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google / Apple sign-in through Supabase's hosted OAuth (PKCE) in an auth session browser.
 * shortcut: web flow for both; switch Apple to expo-apple-authentication (native sheet) before
 * App Store review if Apple asks for it.
 */
export async function signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // user cancelled

  const params = new URL(result.url).searchParams;
  const code = params.get('code');
  if (!code) throw new Error(params.get('error_description') ?? 'Sign-in failed');
  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) throw exchange.error;
}

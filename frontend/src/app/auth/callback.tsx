import { Redirect } from 'expo-router';

// OAuth deep links (pondopal://auth/callback) land here if the OS opens the app directly;
// the code exchange itself happens in signInWithProvider.
export default function AuthCallback() {
  return <Redirect href="/" />;
}

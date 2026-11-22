import { Redirect } from 'expo-router';

// The signed-out guard lands on the group itself; on web that is the URL "/(auth)", which needs a page.
export default function AuthIndex() {
  return <Redirect href="/sign-in" />;
}

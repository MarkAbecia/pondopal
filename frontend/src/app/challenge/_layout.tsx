import { Stack } from 'expo-router';

import { StackHeader } from '@/components/ui';

export default function ChallengeLayout() {
  return <Stack screenOptions={{ header: (props) => <StackHeader {...props} /> }} />;
}

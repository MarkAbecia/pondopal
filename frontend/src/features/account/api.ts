import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { api } from '@/lib/api';
import { manilaDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

/** RA 10173 data portability: save everything you've entered as JSON and open the share sheet. */
export async function exportMyData(): Promise<void> {
  const data = await api<Record<string, unknown[]>>('/v1/me/export');
  const file = new File(Paths.cache, `pondopal-export-${manilaDate()}.json`);
  await file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'PondoPal data' });
}

/** RA 10173 erasure. The server deletes the account; then this device forgets it too. */
export async function deleteMyAccount(): Promise<void> {
  await api('/v1/me', { method: 'DELETE' });
  // SIGNED_OUT clears the cached data (stores/session.ts); the server session is already gone
  await supabase.auth.signOut({ scope: 'local' });
}

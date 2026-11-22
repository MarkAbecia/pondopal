import { z } from 'zod';

// EXPO_PUBLIC_* values are inlined at build time, so they must be read as literal property accesses.
export const env = z
  .object({
    supabaseUrl: z.url(),
    supabaseAnonKey: z.string().min(1),
    apiUrl: z.url(),
  })
  .parse({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  });

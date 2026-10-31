import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client. Uses the service-role key when available (required once
 * Row Level Security is enabled), and falls back to the anon key so the app keeps working
 * during the migration window.
 */
export function db(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables are missing.');
  if (!serviceKey) {
    console.warn('[db] SUPABASE_SERVICE_ROLE_KEY is not set - falling back to the anon key. Enable RLS only after setting it.');
  }
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

/** Throws on Supabase errors so route wrapper turns them into a 500. */
export function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

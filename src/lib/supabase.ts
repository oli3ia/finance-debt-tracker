import { createClient } from '@supabase/supabase-js';

/**
 * The Supabase client, configured from environment variables. The anon key is a
 * public, publishable key — safe to ship in the browser bundle. Real protection
 * comes from Row-Level Security on the database, not from hiding this key.
 *
 * Values live in `.env.local` for local dev (see `.env.local.example`) and in the
 * hosting provider's environment settings for production.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once both env vars are set, so the app can run offline-only until then. */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key. Bypasses RLS, so it
// must NEVER be imported into a Client Component. Used by webhooks and other
// trusted server routes that act without a user session.
// Returns null if the service role key isn't configured.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

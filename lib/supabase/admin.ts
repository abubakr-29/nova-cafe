import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. This client uses the service role key and bypasses
// Row Level Security entirely — never import this from a Client
// Component, and never expose SUPABASE_SERVICE_ROLE_KEY with a
// NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

import { createClient } from "@supabase/supabase-js";

/**
 * A cookie-less, session-less Supabase client for public pages.
 *
 * It always acts as the anonymous role (exactly what a customer is), even if
 * a staff member happens to be logged in on the same browser, so a public
 * page looks the same to everyone.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

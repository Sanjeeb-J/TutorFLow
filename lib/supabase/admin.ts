import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client with service-role access.
 * ONLY use this in server-side code (API routes, server actions).
 * NEVER import this in client components.
 * NEVER expose the service-role key to the browser.
 */
export function createAdminClient() {
  return createClient(
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

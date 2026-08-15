// lib/supabase/admin.js
// Service-role Supabase client for privileged server-side operations (e.g.
// deleting an auth user). NEVER import this into client code — the service role
// key bypasses RLS. Built lazily so a missing key only errors at call time,
// never at build time.
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error(
            "Supabase admin client not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        );
    }
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

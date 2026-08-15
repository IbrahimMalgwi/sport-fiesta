// lib/supabase/server.js
// Server Supabase client for Server Components, Server Actions and Route
// Handlers. Reads/writes the auth cookies via Next's async cookies() store.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { URL_OR_PLACEHOLDER, ANON_OR_PLACEHOLDER } from "./config";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(URL_OR_PLACEHOLDER, ANON_OR_PLACEHOLDER, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // Called from a Server Component — safe to ignore when the
                    // middleware is responsible for refreshing the session.
                }
            },
        },
    });
}

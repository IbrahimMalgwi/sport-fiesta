// lib/supabase/config.js
// Central place to read Supabase env vars. Until the user fills in real
// credentials (see SUPABASE_SETUP.md), these are empty and the app runs in a
// "not configured" mode: clients still construct (with harmless placeholders
// so nothing throws at build time), but middleware/auth short-circuit instead
// of making failing network calls.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// True only when both public env vars are present.
export function isSupabaseConfigured() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Placeholders keep createBrowserClient/createServerClient from throwing on
// invalid URLs before the real project exists. They never reach the network
// because callers gate on isSupabaseConfigured().
export const URL_OR_PLACEHOLDER = SUPABASE_URL || "https://placeholder.supabase.co";
export const ANON_OR_PLACEHOLDER = SUPABASE_ANON_KEY || "placeholder-anon-key";

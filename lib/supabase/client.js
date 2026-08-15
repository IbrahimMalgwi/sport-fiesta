// lib/supabase/client.js
// Browser Supabase client for use inside Client Components.
import { createBrowserClient } from "@supabase/ssr";
import { URL_OR_PLACEHOLDER, ANON_OR_PLACEHOLDER } from "./config";

export function createClient() {
    return createBrowserClient(URL_OR_PLACEHOLDER, ANON_OR_PLACEHOLDER);
}

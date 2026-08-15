// lib/supabase/middleware.js
// Session-refresh + auth-gate helper used by the root middleware. It keeps the
// Supabase auth cookie fresh and redirects unauthenticated users away from
// protected routes. Role-based authorization is handled separately by the
// client <RoleGuard> in route-group layouts (and enforced for real by RLS).
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
    URL_OR_PLACEHOLDER,
    ANON_OR_PLACEHOLDER,
    isSupabaseConfigured,
} from "./config";

// Paths reachable without a session.
const PUBLIC_PATHS = ["/", "/login", "/signup"];

// Paths that only make sense when signed OUT (welcome/login/signup). A signed-in
// user hitting any of these — via initial load, a direct URL, or a soft nav —
// is bounced to the dashboard instead.
const SIGNED_OUT_ONLY_PATHS = ["/", "/login", "/signup"];

function isPublicPath(pathname) {
    return PUBLIC_PATHS.includes(pathname);
}

export async function updateSession(request) {
    // Before real credentials exist, do nothing so every route (including
    // public ones) still renders. Auth gating turns on once env vars are set.
    if (!isSupabaseConfigured()) {
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(URL_OR_PLACEHOLDER, ANON_OR_PLACEHOLDER, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                supabaseResponse = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    // IMPORTANT: do not run code between createServerClient and getUser().
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch {
        // Network/credential issue — fail open to /login rather than crashing.
    }

    if (!user && !isPublicPath(request.nextUrl.pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", request.nextUrl.pathname);
        return NextResponse.redirect(url);
    }

    // Signed-in users have no business on the welcome/login/signup pages —
    // send them straight to the dashboard instead (initial load, direct nav,
    // or client-side <Link> all pass through this middleware).
    if (user && SIGNED_OUT_ONLY_PATHS.includes(request.nextUrl.pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

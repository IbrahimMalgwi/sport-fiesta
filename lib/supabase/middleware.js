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

function hasSupabaseAuthCookie(request) {
    return request.cookies.getAll().some(({ name }) =>
        name.startsWith("sb-") && name.includes("-auth-token")
    );
}

// Routing Middleware must never wait indefinitely for an external service.
// Vercel terminates the whole request if middleware does not return in time.
async function fetchWithTimeout(input, init = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    if (init.signal) {
        init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

export async function updateSession(request) {
    // Before real credentials exist, do nothing so every route (including
    // public ones) still renders. Auth gating turns on once env vars are set.
    if (!isSupabaseConfigured()) {
        return NextResponse.next({ request });
    }

    const pathname = request.nextUrl.pathname;
    const hasAuthCookie = hasSupabaseAuthCookie(request);

    // Most requests need no auth network call at all. This also keeps public
    // pages available if Supabase Auth is temporarily slow or unavailable.
    if (!hasAuthCookie && isPublicPath(pathname)) {
        return NextResponse.next({ request });
    }
    if (!hasAuthCookie) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(URL_OR_PLACEHOLDER, ANON_OR_PLACEHOLDER, {
        global: { fetch: fetchWithTimeout },
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

    // getClaims normally verifies the JWT locally (or against cached JWKS),
    // unlike getUser(), which makes an Auth API request on every invocation.
    let isAuthenticated = false;
    let verificationFailed = false;
    try {
        const { data, error } = await supabase.auth.getClaims();
        verificationFailed = Boolean(error);
        isAuthenticated = Boolean(data?.claims?.sub);
    } catch {
        verificationFailed = true;
    }

    // A transient Auth/JWKS outage must not take down every route. RLS remains
    // the authorization boundary for data, and client guards still verify the
    // session. Prevent caching any response that may refresh auth cookies.
    if (verificationFailed) {
        supabaseResponse.headers.set("Cache-Control", "private, no-store");
        return supabaseResponse;
    }

    if (!isAuthenticated && !isPublicPath(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
    }

    // Signed-in users have no business on the welcome/login/signup pages —
    // send them straight to the dashboard instead (initial load, direct nav,
    // or client-side <Link> all pass through this middleware).
    if (isAuthenticated && SIGNED_OUT_ONLY_PATHS.includes(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
    }

    supabaseResponse.headers.set("Cache-Control", "private, no-store");
    return supabaseResponse;
}

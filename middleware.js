// middleware.js
// Runs on every request (except static assets) to refresh the Supabase session
// and gate protected routes. See lib/supabase/middleware.js for the logic.
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        // Skip Next internals and static files; run on everything else.
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

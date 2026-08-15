// app/api/delete-account/route.js
// Replaces the Firebase `deleteUserAccount` Cloud Function. The caller is
// identified from their Supabase session cookie (server client); deletion runs
// with the service-role admin client. Called by the Profile page.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
    // 1. Identify the caller from their session (RLS-scoped server client).
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "You must be signed in to delete your account." },
            { status: 401 }
        );
    }

    const userId = user.id;

    try {
        const admin = createAdminClient();

        // 2. Delete the user's registrations.
        await admin.from("registrations").delete().eq("createdBy", userId);

        // 3. Delete their profile row (also cascades when the auth user goes,
        //    but delete explicitly so it's gone even if cascade is disabled).
        await admin.from("profiles").delete().eq("id", userId);

        // 4. Remove their profile pictures from Storage.
        const { data: files } = await admin.storage
            .from("profile-pictures")
            .list(userId);
        if (files && files.length) {
            await admin.storage
                .from("profile-pictures")
                .remove(files.map((f) => `${userId}/${f.name}`));
        }

        // 5. Delete the auth user last.
        const { error: delErr } = await admin.auth.admin.deleteUser(userId);
        if (delErr) throw delErr;

        return NextResponse.json({
            success: true,
            message: "Account deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting user account:", error);
        return NextResponse.json(
            { error: "Error deleting account" },
            { status: 500 }
        );
    }
}

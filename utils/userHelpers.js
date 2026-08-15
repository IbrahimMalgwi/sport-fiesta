// utils/userHelpers.js
// Profile helpers, ported from Firestore `users` to the Supabase `profiles`
// table. The app uses camelCase field names, while Postgres columns are
// snake_case, so we translate the known columns here to keep callers unchanged.
import { createClient } from "@/lib/supabase/client";

// camelCase (app) -> snake_case (DB) for the columns we persist.
const TO_DB = {
    displayName: "display_name",
    phone: "phone",
    email: "email",
    profilePicture: "profile_picture",
};

function toDbRow(userData) {
    const row = {};
    Object.entries(userData).forEach(([key, value]) => {
        if (TO_DB[key]) row[TO_DB[key]] = value;
    });
    return row;
}

// snake_case (DB) -> camelCase (app) for reads.
function fromDbRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        role: row.role,
        displayName: row.display_name || "",
        phone: row.phone || "",
        profilePicture: row.profile_picture || "",
    };
}

// Create or update a user profile.
export const updateUserProfile = async (userId, userData) => {
    const supabase = createClient();
    const { error } = await supabase
        .from("profiles")
        .update({ ...toDbRow(userData), updated_at: new Date().toISOString() })
        .eq("id", userId);
    if (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
    return true;
};

// Get a user profile (the row is normally created by the handle_new_user
// trigger; this just reads it).
export const getUserProfile = async (userId) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    if (error) {
        console.error("Error getting user profile:", error);
        throw error;
    }
    return fromDbRow(data);
};

// Delete a user profile row.
export const deleteUserProfile = async (userId) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
        console.error("Error deleting user profile:", error);
        throw error;
    }
    return true;
};

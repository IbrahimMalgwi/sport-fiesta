// utils/storageHelpers.js
// Profile-picture storage, ported from Firebase Storage to a Supabase Storage
// bucket named `profile-pictures` (create it per SUPABASE_SETUP.md). Files are
// stored under `${userId}/${fileName}`.
import { createClient } from "@/lib/supabase/client";

const BUCKET = "profile-pictures";

// Upload a profile picture and return its public URL.
export const uploadProfilePicture = async (userId, file) => {
    const supabase = createClient();
    const path = `${userId}/${file.name}`;
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });
    if (error) {
        console.error("Error uploading profile picture:", error);
        throw error;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
};

// Delete a profile picture.
export const deleteProfilePicture = async (userId, fileName) => {
    const supabase = createClient();
    const { error } = await supabase.storage
        .from(BUCKET)
        .remove([`${userId}/${fileName}`]);
    if (error) {
        console.error("Error deleting profile picture:", error);
        throw error;
    }
    return true;
};

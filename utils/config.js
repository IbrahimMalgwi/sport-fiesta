// utils/config.js
// Central app configuration, stored as a single JSONB row in the `app_config`
// table (id = 1, column `settings`). Everything here is admin-tunable; the app
// reads it everywhere with a fallback to these defaults so it keeps working
// before the row exists. Supabase port of the original Firestore config/app.
import { createClient } from "@/lib/supabase/client";
import { houses as DEFAULT_HOUSES } from "./houseMapping";

export const CONFIG_ROW_ID = 1;

export const APP_ROLES = Object.freeze({
    USER: "user",
    STAFF: "staff",
    MARSHAL: "marshal",
    COUNSELLOR: "counsellor",
    ADMIN: "admin",
});
export const AUTHENTICATED_ROLES = Object.freeze(Object.values(APP_ROLES));
// canManageEvents also flags "unrestricted, cross-house" access on the
// representatives page (see app/(staff)/representatives/page.jsx's isAdmin),
// which is backed by an admin-only RLS check (public.is_admin() in
// 0013_house_scoped_representatives.sql) — so it stays admin-only rather than
// admitting Staff. The sports catalog itself is just a read-only reference
// view (0010_fixed_sports_catalog.sql) with no admin-only write path behind
// it, so Staff get their own, separate view permission below.
export const canManageEvents = (role) => role === APP_ROLES.ADMIN;
export const canViewSports = (role) => role === APP_ROLES.STAFF || canManageEvents(role);
// Staff get the full operational toolkit — every Marshal and Counsellor
// ability — without needing to be assigned one of those specific roles; see
// supabase/migrations/0017_staff_full_operational_access.sql for the matching
// RLS change (is_marshal_or_admin()/is_counsellor_or_admin() also admit
// 'staff').
export const canMarshalEvents = (role) =>
    role === APP_ROLES.MARSHAL || role === APP_ROLES.STAFF || role === APP_ROLES.ADMIN;
export const canRecordDecisions = (role) =>
    role === APP_ROLES.COUNSELLOR || role === APP_ROLES.STAFF || role === APP_ROLES.ADMIN;
// Representative selection and the participation lookup are shared by
// Marshals, Counsellors, and Staff — see
// supabase/migrations/0013_house_scoped_representatives.sql.
export const canSelectRepresentatives = (role) =>
    role === APP_ROLES.MARSHAL || role === APP_ROLES.COUNSELLOR || role === APP_ROLES.STAFF || role === APP_ROLES.ADMIN;

// Sensible defaults used until an admin saves the config row.
export const DEFAULT_CONFIG = {
    currentEdition: "5.0",
    previousEditions: ["1.0", "2.0", "3.0", "4.0"],
    registrantRoles: ["Participant", "Marshal", "Counselor"],
    // Admin-managed options for the Participant registration form's Church
    // dropdown (see /admin/settings). Seeded with the known churches below;
    // an admin can edit the list at any time, and "Other" is always offered.
    churches: [
        "National headquarters",
        "Fountain of the living word church",
        "FGC Akoka",
        "FGC Iwaya 1",
        "Shepherd courts",
        "Christ Treasured Church",
        "FGC Yabatech",
        "FGC Makoko headquarters",
        "FGC Ajayi",
        "The Father's place",
        "FGC Ebutemeta",
        "FGC Tejuosho",
        "Oak house",
    ],
    houseAssignmentCutoff: null,
    medalPoints: { gold: 5, silver: 3, bronze: 1 },
    houseOverrides: null,
};

// Merge a stored settings object over the defaults so missing keys are safe.
export function mergeConfig(data) {
    return {
        ...DEFAULT_CONFIG,
        ...(data || {}),
        medalPoints: { ...DEFAULT_CONFIG.medalPoints, ...(data?.medalPoints || {}) },
    };
}

// Resolve the effective house list, applying any admin overrides.
export function resolveHouses(config) {
    const overrides = config?.houseOverrides;
    if (!overrides) return DEFAULT_HOUSES;
    return DEFAULT_HOUSES.map((h) => ({
        ...h,
        name: overrides[h.key]?.name || h.name,
        color: overrides[h.key]?.color || h.color,
        shortName: overrides[h.key]?.shortName || h.shortName,
    }));
}

// True when house assignment should stop because the cutoff has passed.
export function isPastCutoff(config, now = new Date()) {
    const cutoff = config?.houseAssignmentCutoff;
    if (!cutoff) return false;
    const cutoffDate = cutoff instanceof Date ? cutoff : new Date(cutoff);
    if (Number.isNaN(cutoffDate.getTime())) return false;
    return now > cutoffDate;
}

// One-shot read (merged with defaults).
export async function getConfig() {
    const supabase = createClient();
    const { data } = await supabase
        .from("app_config")
        .select("settings")
        .eq("id", CONFIG_ROW_ID)
        .single();
    return mergeConfig(data?.settings ?? null);
}

// Live subscription via Supabase Realtime. Returns an unsubscribe function.
export function subscribeConfig(callback) {
    const supabase = createClient();

    // Emit the current value immediately, then on every change.
    getConfig().then(callback).catch(() => callback(mergeConfig(null)));

    const channel = supabase
        .channel("app_config_changes")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "app_config" },
            (payload) => callback(mergeConfig(payload.new?.settings ?? null))
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Admin-only write (merges into the existing settings object).
export async function saveConfig(partial) {
    const supabase = createClient();
    const current = await getConfig();
    const settings = {
        ...current,
        ...partial,
        medalPoints: { ...current.medalPoints, ...(partial.medalPoints || {}) },
        updatedAt: new Date().toISOString(),
    };
    const { error } = await supabase
        .from("app_config")
        .upsert({ id: CONFIG_ROW_ID, settings });
    if (error) throw error;
}

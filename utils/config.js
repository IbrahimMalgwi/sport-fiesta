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
export const STAFF_DESIGNATIONS = Object.freeze([
    "Marshal", "Counsellor", "Medic", "Media", "Sound",
    "Welfare", "Data", "Security", "Other",
]);
export const LEGACY_STAFF_DESIGNATION = "Counselor/Marshal";
export const STAFF_DESIGNATION_FILTERS = Object.freeze([
    LEGACY_STAFF_DESIGNATION,
    ...STAFF_DESIGNATIONS.filter((designation) => designation !== "Other"),
    "Other",
]);
export const canManageEvents = (role) => role === APP_ROLES.ADMIN;
export const canMarshalEvents = (role) => role === APP_ROLES.MARSHAL || role === APP_ROLES.ADMIN;
export const canRecordDecisions = (role) => role === APP_ROLES.COUNSELLOR || role === APP_ROLES.ADMIN;

// Sensible defaults used until an admin saves the config row.
export const DEFAULT_CONFIG = {
    currentEdition: "5.0",
    previousEditions: ["1.0", "2.0", "3.0", "4.0"],
    registrantRoles: ["Participant", "Marshal", "Counselor"],
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

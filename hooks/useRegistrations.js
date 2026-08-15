"use client";
// hooks/useRegistrations.js
// Live subscription to all registrations, sorted by display name. Shared by
// the Fiesta modules (results/injuries/decisions) and the central dashboard.
// Supabase port of the original Firestore onSnapshot version.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Registrations store the name under `name` (newer) or `fullName` (legacy).
export function registrantName(reg) {
    return reg?.name || reg?.fullName || "Unknown";
}

export default function useRegistrations() {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        let active = true;

        async function load() {
            const { data, error } = await supabase.from("registrations").select("*");
            if (!active) return;
            if (error) {
                console.error("Error loading registrations:", error);
                setLoading(false);
                return;
            }
            const rows = (data || []).slice();
            rows.sort((a, b) => registrantName(a).localeCompare(registrantName(b)));
            setRegistrations(rows);
            setLoading(false);
        }

        load();

        // Realtime: reload on any change to the registrations table.
        const channel = supabase
            .channel("registrations_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "registrations" },
                load
            )
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(channel);
        };
    }, []);

    return { registrations, loading };
}

"use client";
// hooks/useStaffRegistrations.js
// Live subscription to all staff_registrations (marshals/counselors/support
// staff — never house-assigned). Mirrors useRegistrations.js for the
// participants table.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function useStaffRegistrations() {
    const [staffRegistrations, setStaffRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        let active = true;

        async function load() {
            const { data, error } = await supabase.from("staff_registrations").select("*");
            if (!active) return;
            if (error) {
                console.error("Error loading staff registrations:", error);
                setLoading(false);
                return;
            }
            const rows = (data || []).slice();
            rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            setStaffRegistrations(rows);
            setLoading(false);
        }

        load();

        const channel = supabase
            .channel("staff_registrations_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "staff_registrations" },
                load
            )
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(channel);
        };
    }, []);

    return { staffRegistrations, loading };
}

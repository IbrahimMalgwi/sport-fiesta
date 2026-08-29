"use client";
// app/(staff)/admin/sports/page.jsx — ported from src/pages/SportsManager.jsx
//
// Sporting activities are now a FIXED catalog (Sports Fiesta 5.0's 33 event
// categories, seeded by supabase/migrations/0010_fixed_sports_catalog.sql)
// instead of something created ad hoc at runtime — there is no "Add
// activity" form here anymore. This page is a read-only reference view of
// the catalog, still admin-gated like before; any future correction to an
// event's details is a migration/DB edit, not a runtime action.
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canManageEvents } from "@/utils/config";

export default function SportsManager() {
    const { userRole } = useAuth();
    const supabase = createClient();
    const [sports, setSports] = useState([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const { data } = await supabase.from("sports").select("*");
            if (!active) return;
            const rows = (data || []).slice().sort((a, b) => {
                const orderDiff = (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity);
                return orderDiff !== 0 ? orderDiff : (a.name || "").localeCompare(b.name || "");
            });
            setSports(rows);
        };
        load();
        const channel = supabase
            .channel("sports_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "sports" }, load)
            .subscribe();
        return () => { active = false; supabase.removeChannel(channel); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!canManageEvents(userRole)) return <p className="p-8 text-center">Only administrators can view sporting activities.</p>;

    const groups = [];
    for (const sport of sports) {
        const groupName = sport.eventGroup || "Other";
        let group = groups.find((g) => g.name === groupName);
        if (!group) { group = { name: groupName, items: [] }; groups.push(group); }
        group.items.push(sport);
    }

    return (
        <div className="max-w-3xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Sporting Activities</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                This is the fixed Sports Fiesta 5.0 event catalog ({sports.length} activities). It isn&apos;t editable here — activities are no longer created at runtime.
            </p>

            {groups.length === 0 ? (
                <p className="text-center py-10 text-gray-500 dark:text-gray-400">No activities found. Has the sports catalog migration been applied?</p>
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <div key={group.name} className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">{group.name}</h2>
                            </div>
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {group.items.map((s) => (
                                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{s.category}</span>
                                                {(s.minAge != null || s.maxAge != null) && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                        Ages {s.minAge ?? "0"}–{s.maxAge ?? "∞"}
                                                    </span>
                                                )}
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{s.ageCategory || "Open"}</span>
                                                {s.medalEligible === false && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">No medal</span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

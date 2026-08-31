"use client";
// app/(staff)/participation/page.jsx
//
// Lets a Marshal/Counsellor (or Admin) search for a Teen by name and see
// every sporting activity they've ever been selected to represent (past or
// current editions), cross-referenced with any result recorded for it. Not
// house-scoped — unlike representative selection, the task only asked for
// scoping there, so lookup covers every Teen regardless of house.
//
// Results are recorded house-only (see app/(staff)/results/page.jsx) — a
// result row no longer names a participant, so "did this Teen's activity
// place?" is answered by matching sportId + edition + the Teen's own
// houseKey from their representative-selection row, not by personId.
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useRegistrations from "@/hooks/useRegistrations";
import RegistrantPicker from "@/components/RegistrantPicker";
import { canSelectRepresentatives } from "@/utils/config";

const MEDAL_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" };

export default function ParticipationLookupPage() {
    const supabase = createClient();
    const { userRole } = useAuth();
    const { registrations } = useRegistrations();
    const [personText, setPersonText] = useState("");
    const [person, setPerson] = useState(null);
    const [sports, setSports] = useState([]);
    const [reps, setReps] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        supabase.from("sports").select("*").then(({ data }) => setSports(data || []));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!person) { setReps([]); setResults([]); return; }
        let active = true;
        setLoading(true);
        supabase.from("event_representatives").select("*").eq("personId", person.id).then(async ({ data: r }) => {
            if (!active) return;
            const reps = r || [];
            setReps(reps);
            if (reps.length === 0) { setResults([]); setLoading(false); return; }
            // Results are house-only now (no personId to match on) — fetch by
            // this Teen's own edition/house combinations from their
            // representative rows, then match per-activity in activityRows.
            const editions = [...new Set(reps.map((x) => x.edition))];
            const houseKeys = [...new Set(reps.map((x) => x.houseKey))];
            const { data: res } = await supabase.from("results").select("*").in("edition", editions).in("houseKey", houseKeys);
            if (!active) return;
            setResults((res || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            setLoading(false);
        });
        return () => { active = false; };
    }, [person]); // eslint-disable-line react-hooks/exhaustive-deps

    const sportById = useMemo(() => Object.fromEntries(sports.map((s) => [s.id, s])), [sports]);

    // One row per activity the Teen was ever selected to represent, joined
    // with a matching result for their OWN house in that activity/edition
    // (if one has been recorded) — this shows "did my house place," not
    // individual credit, since results no longer name a participant.
    const activityRows = useMemo(() => reps.map((r) => {
        const sport = sportById[r.sportId];
        const result = results.find((res) => res.sportId === r.sportId && res.edition === r.edition && res.houseKey === r.houseKey) || null;
        return {
            key: r.id,
            sportName: sport?.name || result?.sportName || "Unknown activity",
            category: sport?.category || result?.category || "",
            edition: r.edition,
            result,
        };
    }), [reps, sportById, results]);

    if (!canSelectRepresentatives(userRole)) return <p className="p-8 text-center">Only Marshals, Counsellors, Staff, and Admins can look up participation.</p>;

    return (
        <div className="max-w-3xl mx-auto py-6 sm:py-8 px-3 sm:px-4 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Participation Lookup</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Search for a Teen to see every activity they&apos;ve been selected for — past or current — and any results recorded.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                <RegistrantPicker registrations={registrations} value={personText}
                    onSelect={(p, text) => { setPerson(p); setPersonText(text); }}
                    label="Search by name" placeholder="Type a Teen's name..." />
            </div>

            {person && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-gray-900 dark:text-white">{person.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{person.house || "No house assigned"}{person.age != null ? ` · Age ${person.age}` : ""}</p>
                    </div>

                    {loading ? (
                        <p className="text-center py-10 text-gray-500 dark:text-gray-400">Loading…</p>
                    ) : activityRows.length === 0 ? (
                        <p className="text-center py-10 text-gray-500 dark:text-gray-400">No activity participation found for this Teen.</p>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {activityRows.map((row) => (
                                <li key={row.key} className="px-4 sm:px-6 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className="font-medium text-gray-900 dark:text-white">{row.sportName}</span>
                                        <span className="text-gray-500 dark:text-gray-400"> ({row.category}) — Edition {row.edition}</span>
                                    </div>
                                    <div className="text-gray-700 dark:text-gray-200">
                                        {row.result
                                            ? (row.result.medal
                                                ? `${MEDAL_EMOJI[row.result.medal] || ""} ${row.result.medal} for ${row.result.house} (+${row.result.points || 0} pts)`
                                                : `No medal — ${row.result.house} competed`)
                                            : "Selected — no result recorded yet"}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

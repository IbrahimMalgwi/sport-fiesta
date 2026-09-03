"use client";
// app/(staff)/participation/page.jsx
//
// Two views, one page:
//  - "Look up a Teen": search for one Teen by name and see every sporting
//    activity they've ever been selected to represent (past or current
//    editions), cross-referenced with any result recorded for it.
//  - "All participants": the full event-participation history — every Teen
//    who has ever been selected for anything, across every edition, browsable
//    and searchable at any time (not scoped to one person at a time).
//
// Not house-scoped — unlike representative selection, the task only asked for
// scoping there, so lookup covers every Teen regardless of house.
//
// Results are recorded house-only (see app/(staff)/results/page.jsx) — a
// result row no longer names a participant, so "did this Teen's activity
// place?" is answered by matching sportId + edition + the Teen's own
// houseKey from their representative-selection row, not by personId.
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useRegistrations, { registrantName } from "@/hooks/useRegistrations";
import RegistrantPicker from "@/components/RegistrantPicker";
import { canSelectRepresentatives } from "@/utils/config";

const MEDAL_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" };

// Shared by both views: one row per activity a Teen was selected to
// represent, joined with a matching result for their OWN house in that
// activity/edition (if one has been recorded) — this shows "did my house
// place," not individual credit, since results no longer name a participant.
function buildActivityRows(reps, results, sportById) {
    return reps.map((r) => {
        const sport = sportById[r.sportId];
        const result = results.find((res) => res.sportId === r.sportId && res.edition === r.edition && res.houseKey === r.houseKey) || null;
        return {
            key: r.id,
            sportName: sport?.name || result?.sportName || "Unknown activity",
            category: sport?.category || result?.category || "",
            edition: r.edition,
            result,
        };
    });
}

function ActivityList({ rows, loading }) {
    if (loading) return <p className="text-center py-10 text-gray-500 dark:text-gray-400">Loading…</p>;
    if (rows.length === 0) return <p className="text-center py-10 text-gray-500 dark:text-gray-400">No activity participation found.</p>;
    return (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row) => (
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
    );
}

export default function ParticipationLookupPage() {
    const supabase = createClient();
    const { userRole } = useAuth();
    const { registrations } = useRegistrations();
    const [tab, setTab] = useState("lookup"); // "lookup" | "history"
    const [sports, setSports] = useState([]);

    // ---- "Look up a Teen" ----
    const [personText, setPersonText] = useState("");
    const [person, setPerson] = useState(null);
    const [reps, setReps] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // ---- "All participants" (event participation history) ----
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [allReps, setAllReps] = useState([]);
    const [allResults, setAllResults] = useState([]);
    const [historySearch, setHistorySearch] = useState("");
    const [editionFilter, setEditionFilter] = useState("all");
    const [expanded, setExpanded] = useState(() => new Set());

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
            const editions = [...new Set(reps.map((x) => x.edition))];
            const houseKeys = [...new Set(reps.map((x) => x.houseKey))];
            const { data: res } = await supabase.from("results").select("*").in("edition", editions).in("houseKey", houseKeys);
            if (!active) return;
            setResults((res || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            setLoading(false);
        });
        return () => { active = false; };
    }, [person]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load the full history once, the first time that tab is opened.
    useEffect(() => {
        if (tab !== "history" || historyLoaded) return;
        let active = true;
        setHistoryLoading(true);
        Promise.all([
            supabase.from("event_representatives").select("*"),
            supabase.from("results").select("*"),
        ]).then(([{ data: r }, { data: res }]) => {
            if (!active) return;
            setAllReps(r || []);
            setAllResults(res || []);
            setHistoryLoaded(true);
            setHistoryLoading(false);
        });
        return () => { active = false; };
    }, [tab, historyLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    const sportById = useMemo(() => Object.fromEntries(sports.map((s) => [s.id, s])), [sports]);
    const activityRows = useMemo(() => buildActivityRows(reps, results, sportById), [reps, sportById, results]);

    const editions = useMemo(
        () => [...new Set(allReps.map((r) => r.edition))].sort().reverse(),
        [allReps]
    );

    // One entry per Teen who has ever been selected for anything, newest
    // activity first within each person, sorted by name.
    const historyEntries = useMemo(() => {
        const byPerson = new Map();
        for (const r of allReps) {
            if (editionFilter !== "all" && r.edition !== editionFilter) continue;
            if (!byPerson.has(r.personId)) byPerson.set(r.personId, []);
            byPerson.get(r.personId).push(r);
        }
        const q = historySearch.trim().toLowerCase();
        const entries = [];
        for (const [personId, personReps] of byPerson) {
            const p = registrations.find((reg) => reg.id === personId);
            const name = p ? registrantName(p) : "Unknown participant";
            if (q && !name.toLowerCase().includes(q)) continue;
            entries.push({
                personId,
                name,
                house: p?.house || "No house assigned",
                rows: buildActivityRows(personReps, allResults, sportById)
                    .sort((a, b) => (b.edition || "").localeCompare(a.edition || "")),
            });
        }
        entries.sort((a, b) => a.name.localeCompare(b.name));
        return entries;
    }, [allReps, allResults, registrations, sportById, historySearch, editionFilter]);

    const toggleExpanded = (personId) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(personId)) next.delete(personId); else next.add(personId);
            return next;
        });
    };

    if (!canSelectRepresentatives(userRole)) return <p className="p-8 text-center">Only Marshals, Counsellors, Staff, and Admins can look up participation.</p>;

    return (
        <div className="max-w-3xl mx-auto py-6 sm:py-8 px-3 sm:px-4 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Participation Lookup</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Look up one Teen, or browse the full event-participation history.</p>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-full sm:w-fit">
                <button onClick={() => setTab("lookup")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "lookup" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}>
                    Look up a Teen
                </button>
                <button onClick={() => setTab("history")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "history" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}>
                    All participants
                </button>
            </div>

            {tab === "lookup" ? (
                <>
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
                            <ActivityList rows={activityRows} loading={loading} />
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                            {historyLoading ? "Loading history…" : `${historyEntries.length} participant${historyEntries.length === 1 ? "" : "s"}`}
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                                placeholder="Search by name…"
                                className="w-full sm:w-56 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                            <select value={editionFilter} onChange={(e) => setEditionFilter(e.target.value)}
                                className="px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                <option value="all">All editions</option>
                                {editions.map((ed) => <option key={ed} value={ed}>Edition {ed}</option>)}
                            </select>
                        </div>
                    </div>

                    {historyLoading ? (
                        <p className="text-center py-10 text-gray-500 dark:text-gray-400">Loading…</p>
                    ) : historyEntries.length === 0 ? (
                        <p className="text-center py-10 text-gray-500 dark:text-gray-400">
                            {historySearch || editionFilter !== "all" ? "No participants match that search." : "No one has been selected for anything yet."}
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {historyEntries.map((entry) => {
                                const isOpen = expanded.has(entry.personId);
                                return (
                                    <li key={entry.personId}>
                                        <button onClick={() => toggleExpanded(entry.personId)}
                                            className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <span className="min-w-0">
                                                <span className="font-medium text-gray-900 dark:text-white break-words">{entry.name}</span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400"> · {entry.house}</span>
                                            </span>
                                            <span className="shrink-0 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                {entry.rows.length} activit{entry.rows.length === 1 ? "y" : "ies"}
                                                <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                                                <ActivityList rows={entry.rows} loading={false} />
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

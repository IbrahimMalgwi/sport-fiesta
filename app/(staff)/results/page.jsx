"use client";
// app/(staff)/results/page.jsx — ported from src/pages/ResultsForm.jsx
//
// Results are house-only: a Marshal/Admin records which house placed 1st
// (and, for medal-eligible activities, 2nd/3rd) — no individual participant
// is tagged. This is separate from representative selection
// (public.event_representatives, see app/(staff)/representatives/page.jsx),
// which still tracks who competes; this form just records who won.
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useConfig from "@/hooks/useConfig";
import { resolveHouses } from "@/utils/config";
import Button from "@/components/ui/Button";
import { canMarshalEvents } from "@/utils/config";

const PLACES = [
    { medal: "gold", field: "goldHouseKey", label: "🥇 1st place house" },
    { medal: "silver", field: "silverHouseKey", label: "🥈 2nd place house" },
    { medal: "bronze", field: "bronzeHouseKey", label: "🥉 3rd place house" },
];

const emptyForm = { sportId: "", goldHouseKey: "", silverHouseKey: "", bronzeHouseKey: "", winningHouseKey: "" };

export default function ResultsForm() {
    const { currentUser, userRole } = useAuth();
    const { config } = useConfig();
    const houses = resolveHouses(config);
    const supabase = createClient();

    const [sports, setSports] = useState([]);
    const [results, setResults] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

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
        const channel = supabase.channel("sports_for_results")
            .on("postgres_changes", { event: "*", schema: "public", table: "sports" }, load)
            .subscribe();
        return () => { active = false; supabase.removeChannel(channel); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let active = true;
        const load = async () => {
            const { data } = await supabase.from("results").select("*").order("created_at", { ascending: false });
            if (!active) return;
            setResults(data || []);
        };
        load();
        const channel = supabase.channel("results_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "results" }, load)
            .subscribe();
        return () => { active = false; supabase.removeChannel(channel); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedSport = useMemo(
        () => sports.find((s) => s.id === form.sportId) || null,
        [sports, form.sportId]
    );
    const medalEligible = selectedSport?.medalEligible !== false;

    const sportGroups = useMemo(() => {
        const groups = [];
        for (const sport of sports) {
            const groupName = sport.eventGroup || "Other";
            let group = groups.find((g) => g.name === groupName);
            if (!group) { group = { name: groupName, items: [] }; groups.push(group); }
            group.items.push(sport);
        }
        return groups;
    }, [sports]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.sportId) {
            setError("Choose an activity.");
            return;
        }

        let placements;
        if (medalEligible) {
            if (!form.goldHouseKey) {
                setError("Choose the 1st place house.");
                return;
            }
            placements = PLACES
                .filter((p) => form[p.field])
                .map((p) => ({ medal: p.medal, houseKey: form[p.field] }));
            const houseKeys = placements.map((p) => p.houseKey);
            if (new Set(houseKeys).size !== houseKeys.length) {
                setError("The same house can't be picked for more than one place.");
                return;
            }
        } else {
            if (!form.winningHouseKey) {
                setError("Choose the winning house.");
                return;
            }
            placements = [{ medal: null, houseKey: form.winningHouseKey }];
        }

        setSaving(true);
        try {
            const rows = placements.map(({ medal, houseKey }) => {
                const house = houses.find((h) => h.key === houseKey);
                return {
                    sportId: selectedSport.id,
                    sportName: selectedSport.name,
                    category: selectedSport.category,
                    houseKey: house.key,
                    house: house.name,
                    medal,
                    points: medal ? (config.medalPoints[medal] ?? 0) : 0,
                    edition: config.currentEdition,
                    recordedBy: currentUser.uid,
                };
            });
            const { error: insErr } = await supabase.from("results").insert(rows);
            if (insErr) throw insErr;
            setForm(emptyForm);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);
        } catch (err) {
            console.error("Error recording result:", err);
            setError(err.message || "Could not record the result.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this result?")) return;
        try {
            const { error: delErr } = await supabase.from("results").delete().eq("id", id);
            if (delErr) throw delErr;
        } catch (err) {
            alert("Could not delete: " + err.message);
        }
    };

    const medalEmoji = { gold: "🥇", silver: "🥈", bronze: "🥉" };

    if (!canMarshalEvents(userRole)) return <p className="p-8 text-center">Only Marshals, Staff, and Admins can record event results.</p>;
    return (
        <div className="max-w-3xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Record Result</h1>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 mb-8 space-y-4">
                {success && (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm">Result recorded.</div>
                )}
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity *</label>
                    <select value={form.sportId} onChange={(e) => setForm({ ...emptyForm, sportId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" required>
                        <option value="">Select an activity</option>
                        {sportGroups.map((group) => (
                            <optgroup key={group.name} label={group.name}>
                                {group.items.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.category}){(s.minAge != null || s.maxAge != null) ? ` — Ages ${s.minAge ?? "0"}–${s.maxAge ?? "∞"}` : ""}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {sports.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No activities found. Check that the sports catalog migration has been applied.</p>
                    )}
                </div>

                {form.sportId && (medalEligible ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {PLACES.map((p) => (
                            <div key={p.field}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {p.label}{p.medal === "gold" ? " *" : " (optional)"}
                                </label>
                                <select value={form[p.field]} onChange={(e) => setForm({ ...form, [p.field]: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white">
                                    <option value="">{p.medal === "gold" ? "Select house" : "No house / not applicable"}</option>
                                    {houses.map((h) => (<option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>))}
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">+{config.medalPoints[p.medal] ?? 0} pts</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Winning house *</label>
                        <select value={form.winningHouseKey} onChange={(e) => setForm({ ...form, winningHouseKey: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" required>
                            <option value="">Select house</option>
                            {houses.map((h) => (<option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This activity is a Mind &amp; Social Game — no medal or points are recorded.</p>
                    </div>
                ))}

                <Button type="submit" disabled={saving || !form.sportId}>
                    {saving ? "Recording..." : "Record result"}
                </Button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Recent results ({results.length})</h2>
                </div>
                {results.length === 0 ? (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">No results recorded yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {results.slice(0, 25).map((r) => (
                            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 text-sm">
                                <div className="text-gray-900 dark:text-white min-w-0">
                                    <span className="mr-2">{medalEmoji[r.medal] || "🎯"}</span>
                                    <span className="font-medium">{r.sportName}</span>
                                    <span className="text-gray-500 dark:text-gray-400"> ({r.category}) — {r.house}</span>
                                </div>
                                <button onClick={() => handleDelete(r.id)} className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-800">Delete</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

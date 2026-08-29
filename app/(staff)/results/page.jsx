"use client";
// app/(staff)/results/page.jsx — ported from src/pages/ResultsForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useConfig from "@/hooks/useConfig";
import useRegistrations from "@/hooks/useRegistrations";
import { resolveHouses } from "@/utils/config";
import { getHouseKeyByName } from "@/utils/houseMapping";
import RegistrantPicker from "@/components/RegistrantPicker";
import Button from "@/components/ui/Button";
import { canMarshalEvents } from "@/utils/config";

const MEDALS = [
    { value: "gold", label: "🥇 Gold" },
    { value: "silver", label: "🥈 Silver" },
    { value: "bronze", label: "🥉 Bronze" },
];

const emptyForm = { sportId: "", medal: "gold", houseKey: "", person: null, personText: "" };

export default function ResultsForm() {
    const { currentUser, userRole } = useAuth();
    const { config } = useConfig();
    const { registrations } = useRegistrations();
    const houses = resolveHouses(config);
    const supabase = createClient();

    const [sports, setSports] = useState([]);
    const [results, setResults] = useState([]);
    const [representatives, setRepresentatives] = useState([]);
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
        const load = async () => {
            const { data } = await supabase.from("event_representatives").select("*").eq("edition", config.currentEdition);
            setRepresentatives(data || []);
        };
        load();
    }, [config.currentEdition]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const eligiblePersons = useMemo(() => {
        const pool = representatives.filter((r) => r.sportId === form.sportId);
        return registrations.filter((r) => {
            if (!pool.some((entry) => entry.personId === r.id)) return false;
            if (form.houseKey) {
                const rHouseKey = r.houseKey || getHouseKeyByName(r.house);
                if (rHouseKey !== form.houseKey) return false;
            }
            if (selectedSport?.minAge != null && (r.age == null || r.age < selectedSport.minAge)) return false;
            if (selectedSport?.maxAge != null && (r.age == null || r.age > selectedSport.maxAge)) return false;
            return true;
        });
    }, [registrations, representatives, form.houseKey, form.sportId, selectedSport]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.sportId || !form.houseKey || !form.person) {
            setError("Choose an activity, house, and a pre-selected representative.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const house = houses.find((h) => h.key === form.houseKey);
            const medal = medalEligible ? form.medal : null;
            const points = medalEligible ? (config.medalPoints[form.medal] ?? 0) : 0;
            const representative = representatives.find((r) => r.sportId === form.sportId && r.personId === form.person.id);
            if (!representative) throw new Error("This participant was not selected as a representative for this event.");
            const { error: insErr } = await supabase.from("results").insert({
                sportId: selectedSport.id,
                sportName: selectedSport.name,
                category: selectedSport.category,
                houseKey: house.key,
                house: house.name,
                medal,
                points,
                personId: form.person ? form.person.id : null,
                personName: form.person ? (form.person.name || form.person.fullName) : (form.personText || null),
                edition: config.currentEdition,
                recordedBy: currentUser.uid,
                representativeId: representative.id,
            });
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

    if (!canMarshalEvents(userRole)) return <p className="p-8 text-center">Only Marshals can record event results.</p>;
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
                    <select value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value })}
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

                <div className={`grid grid-cols-1 gap-4 ${medalEligible ? "sm:grid-cols-2" : ""}`}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Winning house *</label>
                        <select value={form.houseKey} onChange={(e) => setForm({ ...form, houseKey: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" required>
                            <option value="">Select house</option>
                            {houses.map((h) => (<option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>))}
                        </select>
                    </div>
                    {medalEligible ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medal *</label>
                            <select value={form.medal} onChange={(e) => setForm({ ...form, medal: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white">
                                {MEDALS.map((m) => (<option key={m.value} value={m.value}>{m.label} (+{config.medalPoints[m.value] ?? 0} pts)</option>))}
                            </select>
                        </div>
                    ) : (
                        form.sportId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 self-end pb-2">This activity is a Mind &amp; Social Game — no medal or points are recorded.</p>
                        )
                    )}
                </div>

                <RegistrantPicker items={eligiblePersons} value={form.personText}
                    onSelect={(person, text) => setForm({ ...form, person, personText: text })}
                    label="Placed representative *"
                    placeholder={form.houseKey ? "Select from the pre-event representative pool" : "Choose a winning house first"} />
                {form.sportId && eligiblePersons.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 -mt-2">No representatives have been selected for this event and house.</p>}
                {selectedSport && (selectedSport.minAge != null || selectedSport.maxAge != null) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                        This activity is restricted to ages {selectedSport.minAge ?? "0"}–{selectedSport.maxAge ?? "∞"}; the list above is filtered accordingly.
                    </p>
                )}

                <Button type="submit" disabled={saving}>
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
                                    <span className="text-gray-500 dark:text-gray-400"> ({r.category}) — {r.house}{r.personName ? ` — ${r.personName}` : ""}</span>
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

"use client";
// app/(staff)/admin/sports/page.jsx — ported from src/pages/SportsManager.jsx
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

const CATEGORIES = ["Male", "Female", "Mixed"];

export default function SportsManager() {
    const { currentUser } = useAuth();
    const supabase = createClient();
    const [sports, setSports] = useState([]);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("Mixed");
    const [minAge, setMinAge] = useState("");
    const [maxAge, setMaxAge] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        const load = async () => {
            const { data } = await supabase.from("sports").select("*");
            if (!active) return;
            const rows = (data || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            setSports(rows);
        };
        load();
        const channel = supabase
            .channel("sports_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "sports" }, load)
            .subscribe();
        return () => { active = false; supabase.removeChannel(channel); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (minAge !== "" && maxAge !== "" && Number(minAge) > Number(maxAge)) {
            setError("Min age can't be greater than max age.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const { error: insErr } = await supabase.from("sports").insert({
                name: name.trim(),
                category,
                minAge: minAge !== "" ? Number(minAge) : null,
                maxAge: maxAge !== "" ? Number(maxAge) : null,
                createdBy: currentUser.uid,
            });
            if (insErr) throw insErr;
            setName("");
            setCategory("Mixed");
            setMinAge("");
            setMaxAge("");
        } catch (err) {
            console.error("Error adding sport:", err);
            setError(err.message || "Could not add the activity.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, sportName) => {
        if (!window.confirm(`Delete the activity "${sportName}"?`)) return;
        try {
            const { error: delErr } = await supabase.from("sports").delete().eq("id", id);
            if (delErr) throw delErr;
        } catch (err) {
            console.error("Error deleting sport:", err);
            alert("Could not delete: " + err.message);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Sporting Activities</h1>

            <form onSubmit={handleAdd} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 mb-8 space-y-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Add an activity</h2>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event name *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 100m, Long Jump"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white">
                            {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min age (optional)</label>
                        <input type="number" min="0" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="Open to all ages"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max age (optional)</label>
                        <input type="number" min="0" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="Open to all ages"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                    Leave both blank if this activity is open to all ages. When set, only participants within this range will be offered as medal winners when recording results.
                </p>
                <Button type="submit" disabled={saving}>
                    {saving ? "Adding..." : "Add activity"}
                </Button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Activities ({sports.length})</h2>
                </div>
                {sports.length === 0 ? (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">No activities yet. Add one above.</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sports.map((s) => (
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
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(s.id, s.name)} className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 text-sm font-medium">Delete</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

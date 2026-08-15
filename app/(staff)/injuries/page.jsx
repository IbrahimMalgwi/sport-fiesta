"use client";
// app/(staff)/injuries/page.jsx — ported from src/pages/InjuriesManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useConfig from "@/hooks/useConfig";
import useRegistrations, { registrantName } from "@/hooks/useRegistrations";
import { resolveHouses } from "@/utils/config";
import { getHouseKeyByName } from "@/utils/houseMapping";
import RegistrantPicker from "@/components/RegistrantPicker";
import Button from "@/components/ui/Button";

const emptyForm = {
    person: null, personText: "", personName: "", houseKey: "",
    nature: "", medication: "", treatment: "",
    incidentAt: new Date().toISOString().slice(0, 16), notes: "",
};

export default function InjuriesManager() {
    const { currentUser } = useAuth();
    const { config } = useConfig();
    const { registrations } = useRegistrations();
    const houses = resolveHouses(config);
    const supabase = createClient();

    const [injuries, setInjuries] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [houseFilter, setHouseFilter] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        let active = true;
        const load = async () => {
            const { data } = await supabase.from("injuries").select("*").order("incidentAt", { ascending: false });
            if (!active) return;
            setInjuries(data || []);
        };
        load();
        const channel = supabase.channel("injuries_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "injuries" }, load)
            .subscribe();
        return () => { active = false; supabase.removeChannel(channel); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePerson = (person, text) => {
        if (person) {
            setForm((f) => ({
                ...f, person, personText: text, personName: registrantName(person),
                houseKey: person.houseKey || getHouseKeyByName(person.house) || f.houseKey,
            }));
        } else {
            setForm((f) => ({ ...f, person: null, personText: text, personName: text }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.personName.trim() || !form.nature.trim()) {
            setError("Person's name and nature of injury are required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const house = houses.find((h) => h.key === form.houseKey);
            const { error: insErr } = await supabase.from("injuries").insert({
                personId: form.person ? form.person.id : null,
                personName: form.personName.trim(),
                houseKey: form.houseKey || null,
                house: house ? house.name : null,
                nature: form.nature.trim(),
                medication: form.medication.trim(),
                treatment: form.treatment.trim(),
                incidentAt: form.incidentAt ? new Date(form.incidentAt).toISOString() : new Date().toISOString(),
                notes: form.notes.trim(),
                recordedBy: currentUser.uid,
            });
            if (insErr) throw insErr;
            setForm(emptyForm);
        } catch (err) {
            console.error("Error saving injury:", err);
            setError(err.message || "Could not save the injury record.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this injury record?")) return;
        try {
            const { error: delErr } = await supabase.from("injuries").delete().eq("id", id);
            if (delErr) throw delErr;
        } catch (err) {
            alert("Could not delete: " + err.message);
        }
    };

    const filtered = useMemo(() => {
        return injuries.filter((i) => {
            if (houseFilter !== "all" && i.houseKey !== houseFilter) return false;
            if (search) {
                const hay = `${i.personName} ${i.nature} ${i.treatment}`.toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            return true;
        });
    }, [injuries, houseFilter, search]);

    return (
        <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Injury Register</h1>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 mb-8 space-y-4">
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <RegistrantPicker registrations={registrations} value={form.personText} onSelect={handlePerson}
                    label="Injured person" required placeholder="Link to a registrant, or type a name" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">House</label>
                        <select value={form.houseKey} onChange={(e) => setForm({ ...form, houseKey: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white">
                            <option value="">Unknown / N/A</option>
                            {houses.map((h) => (<option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & time of incident</label>
                        <input type="datetime-local" value={form.incidentAt} onChange={(e) => setForm({ ...form, incidentAt: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nature of injury *</label>
                    <input type="text" value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value })} placeholder="e.g. Sprained ankle"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medication administered</label>
                        <input type="text" value={form.medication} onChange={(e) => setForm({ ...form, medication: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Treatment given</label>
                        <input type="text" value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" />
                </div>
                <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Log injury"}
                </Button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Records ({filtered.length})</h2>
                    <div className="flex gap-2">
                        <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                            <option value="all">All houses</option>
                            {houses.map((h) => (<option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>))}
                        </select>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">No injury records.</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filtered.map((i) => (
                            <li key={i.id} className="px-4 sm:px-6 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {i.personName}
                                            {i.house && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({i.house})</span>}
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{i.nature}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {i.medication && `Meds: ${i.medication}. `}
                                            {i.treatment && `Treatment: ${i.treatment}. `}
                                            {i.incidentAt && new Date(i.incidentAt).toLocaleString()}
                                        </p>
                                        {i.notes && <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">{i.notes}</p>}
                                    </div>
                                    <button onClick={() => handleDelete(i.id)} className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 text-sm">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

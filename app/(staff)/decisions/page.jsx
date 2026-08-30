"use client";
// app/(staff)/decisions/page.jsx — ported from src/pages/DecisionsManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useConfig from "@/hooks/useConfig";
import useRegistrations, { registrantName } from "@/hooks/useRegistrations";
import useStaffRegistrations from "@/hooks/useStaffRegistrations";
import { resolveHouses } from "@/utils/config";
import { getHouseKeyByName } from "@/utils/houseMapping";
import RegistrantPicker from "@/components/RegistrantPicker";
import Button from "@/components/ui/Button";
import { canRecordDecisions } from "@/utils/config";

// Counselors are staff (registered via /staff-registration, never house-
// assigned) — not participants, so they're picked from staff_registrations
// filtered to the "Counselor/Marshal" designation, not from `registrations`.
const counselorLabel = (s) => `${s.name} — ${s.organization || "Staff"}`;

const emptyForm = {
    person: null, personText: "", counselor: null, counselorText: "",
    decisionDate: new Date().toISOString().slice(0, 10), notes: "",
};

export default function DecisionsManager() {
    const { currentUser, userRole } = useAuth();
    const { config } = useConfig();
    const { registrations } = useRegistrations();
    const { staffRegistrations } = useStaffRegistrations();
    const counselors = useMemo(
        () => staffRegistrations.filter((s) => ["Counsellor", "Counselor", "Counselor/Marshal"].includes(s.finalDesignation || s.designation)),
        [staffRegistrations]
    );
    const houses = resolveHouses(config);
    const supabase = createClient();

    const [decisions, setDecisions] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [houseFilter, setHouseFilter] = useState("all");

    useEffect(() => {
        let active = true;
        const load = async () => {
            const { data } = await supabase.from("decisions").select("*").order("decisionDate", { ascending: false });
            if (!active) return;
            setDecisions(data || []);
        };
        load();
        const channel = supabase.channel("decisions_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "decisions" }, load)
            .subscribe();
        return () => { active = false; supabase.removeChannel(channel); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.person) {
            setError("Please select an existing participant from the list.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const houseKey = form.person.houseKey || getHouseKeyByName(form.person.house) || null;
            const house = houses.find((h) => h.key === houseKey);
            const payload = {
                personId: form.person.id,
                personName: registrantName(form.person),
                houseKey,
                house: house ? house.name : form.person.house || null,
                decisionDate: form.decisionDate,
                notes: form.notes.trim(),
                counselorId: form.counselor ? form.counselor.id : null,
                counselorName: form.counselor ? form.counselor.name : (form.counselorText || null),
            };
            if (editingId) {
                const { error: updErr } = await supabase.from("decisions").update(payload).eq("id", editingId);
                if (updErr) throw updErr;
            } else {
                const { error: insErr } = await supabase.from("decisions").insert({ ...payload, recordedBy: currentUser.uid });
                if (insErr) throw insErr;
            }
            setForm(emptyForm);
            setEditingId(null);
        } catch (err) {
            console.error("Error saving decision:", err);
            setError(err.message || "Could not save the decision.");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (d) => {
        const person = registrations.find((r) => r.id === d.personId) || (d.personId ? { id: d.personId, name: d.personName, houseKey: d.houseKey, house: d.house } : null);
        const counselor = staffRegistrations.find((s) => s.id === d.counselorId) || null;
        setForm({
            person,
            personText: d.personName || "",
            counselor,
            counselorText: d.counselorName || "",
            decisionDate: d.decisionDate || new Date().toISOString().slice(0, 10),
            notes: d.notes || "",
        });
        setEditingId(d.id);
        setError("");
    };

    const handleCancelEdit = () => {
        setForm(emptyForm);
        setEditingId(null);
        setError("");
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this decision record?")) return;
        try {
            const { error: delErr } = await supabase.from("decisions").delete().eq("id", id);
            if (delErr) throw delErr;
            if (editingId === id) handleCancelEdit();
        } catch (err) {
            alert("Could not delete: " + err.message);
        }
    };

    const filtered = useMemo(() => {
        if (houseFilter === "all") return decisions;
        return decisions.filter((d) => d.houseKey === houseFilter);
    }, [decisions, houseFilter]);

    if (!canRecordDecisions(userRole)) return <p className="p-8 text-center">Only Counsellors can record decisions for Christ.</p>;
    return (
        <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Decisions for Christ</h1>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 mb-8 space-y-4">
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <RegistrantPicker registrations={registrations} value={form.personText}
                    onSelect={(person, text) => setForm({ ...form, person, personText: text })}
                    label="Participant" required placeholder="Select an existing participant" />
                {form.person && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                        {registrantName(form.person)} · {form.person.house || "No house"} · {form.person.sex || "—"} · age {form.person.age || "—"}
                    </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Decision date *</label>
                        <input type="date" value={form.decisionDate} onChange={(e) => setForm({ ...form, decisionDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" required />
                    </div>
                    <RegistrantPicker items={counselors} getLabel={counselorLabel} value={form.counselorText}
                        onSelect={(counselor, text) => setForm({ ...form, counselor, counselorText: text })}
                        label="Counselor (optional)" placeholder="Link a counselor, or type a name" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white"
                        placeholder="Any context about the decision" />
                </div>
                <div className="flex gap-3">
                    <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : editingId ? "Update decision" : "Record decision"}
                    </Button>
                    {editingId && (
                        <button type="button" onClick={handleCancelEdit}
                            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Decisions ({filtered.length})</h2>
                    <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        <option value="all">All houses</option>
                        {houses.map((h) => (<option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>))}
                    </select>
                </div>
                {filtered.length === 0 ? (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">No decisions recorded yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filtered.map((d) => (
                            <li key={d.id} className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {d.personName}
                                        {d.house && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({d.house})</span>}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {d.decisionDate}{d.counselorName && ` · Counselor: ${d.counselorName}`}
                                    </p>
                                    {d.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{d.notes}</p>}
                                </div>
                                <div className="shrink-0 flex gap-3">
                                    <button onClick={() => handleEdit(d)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-sm">Edit</button>
                                    <button onClick={() => handleDelete(d.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

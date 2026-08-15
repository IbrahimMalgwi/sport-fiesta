"use client";
// app/(admin)/admin/settings/page.jsx — ported from src/pages/admin/SettingsManager.jsx.
// Uses the Supabase-backed getConfig/saveConfig (utils/config); no other changes.
import React, { useEffect, useState } from "react";
import { getConfig, saveConfig, DEFAULT_CONFIG } from "@/utils/config";
import { houses as DEFAULT_HOUSES } from "@/utils/houseMapping";
import { LoadingScreen } from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";

function isoToLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const parseList = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function SettingsManager() {
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        getConfig().then((cfg) => {
            setForm({
                cutoff: isoToLocalInput(cfg.houseAssignmentCutoff),
                roles: cfg.registrantRoles.join(", "),
                currentEdition: cfg.currentEdition,
                previousEditions: cfg.previousEditions.join(", "),
                medalPoints: { ...cfg.medalPoints },
                houseOverrides: DEFAULT_HOUSES.reduce((acc, h) => {
                    const o = cfg.houseOverrides?.[h.key] || {};
                    acc[h.key] = { name: o.name || h.name, color: o.color || h.color };
                    return acc;
                }, {}),
            });
        });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const overrides = {};
            DEFAULT_HOUSES.forEach((h) => {
                const o = form.houseOverrides[h.key];
                if (o.name !== h.name || o.color !== h.color) {
                    overrides[h.key] = { name: o.name, color: o.color };
                }
            });
            await saveConfig({
                houseAssignmentCutoff: form.cutoff ? new Date(form.cutoff).toISOString() : null,
                registrantRoles: parseList(form.roles),
                currentEdition: form.currentEdition.trim() || DEFAULT_CONFIG.currentEdition,
                previousEditions: parseList(form.previousEditions),
                medalPoints: {
                    gold: Number(form.medalPoints.gold) || 0,
                    silver: Number(form.medalPoints.silver) || 0,
                    bronze: Number(form.medalPoints.bronze) || 0,
                },
                houseOverrides: Object.keys(overrides).length ? overrides : null,
            });
            setMessage("Settings saved.");
        } catch (err) {
            console.error("Error saving settings:", err);
            setMessage("Error: " + (err.message || "could not save"));
        } finally {
            setSaving(false);
        }
    };

    if (!form) {
        return <LoadingScreen label="Loading settings..." />;
    }

    const input = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white text-sm sm:text-base";
    const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <div className="max-w-3xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Fiesta Settings</h1>

            <form onSubmit={handleSave} className="space-y-6">
                {message && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg text-sm">{message}</div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">House assignment cutoff</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Registration stays open indefinitely. After this moment, new registrants
                        are still recorded but are NOT assigned a house. Leave blank to always assign.
                    </p>
                    <input type="datetime-local" value={form.cutoff} onChange={(e) => setForm({ ...form, cutoff: e.target.value })} className={input + " md:w-1/2"} />
                    {form.cutoff && (
                        <button type="button" onClick={() => setForm({ ...form, cutoff: "" })} className="ml-3 text-sm text-red-600 dark:text-red-400">Clear</button>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 space-y-4">
                    <div>
                        <label className={labelCls}>Participant roles (comma-separated)</label>
                        <input type="text" value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} className={input} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Current edition</label>
                            <input type="text" value={form.currentEdition} onChange={(e) => setForm({ ...form, currentEdition: e.target.value })} className={input} />
                        </div>
                        <div>
                            <label className={labelCls}>Previous editions (comma-separated)</label>
                            <input type="text" value={form.previousEditions} onChange={(e) => setForm({ ...form, previousEditions: e.target.value })} className={input} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Medal points</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {["gold", "silver", "bronze"].map((m) => (
                            <div key={m}>
                                <label className={labelCls}>{m.charAt(0).toUpperCase() + m.slice(1)}</label>
                                <input type="number" min="0" value={form.medalPoints[m]}
                                    onChange={(e) => setForm({ ...form, medalPoints: { ...form.medalPoints, [m]: e.target.value } })} className={input} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Houses</h2>
                    <div className="space-y-3">
                        {DEFAULT_HOUSES.map((h) => (
                            <div key={h.key} className="flex items-center gap-3">
                                <input type="color" value={form.houseOverrides[h.key].color}
                                    onChange={(e) => setForm({ ...form, houseOverrides: { ...form.houseOverrides, [h.key]: { ...form.houseOverrides[h.key], color: e.target.value } } })}
                                    className="w-10 h-10 shrink-0 rounded border border-gray-300 dark:border-gray-600 bg-transparent" aria-label={`${h.key} color`} />
                                <input type="text" value={form.houseOverrides[h.key].name}
                                    onChange={(e) => setForm({ ...form, houseOverrides: { ...form.houseOverrides, [h.key]: { ...form.houseOverrides[h.key], name: e.target.value } } })}
                                    className={input} />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        Note: house KEYS stay fixed so existing records keep matching; only display names/colors change.
                    </p>
                </div>

                <Button type="submit" disabled={saving} size="lg">
                    {saving ? "Saving..." : "Save settings"}
                </Button>
            </form>
        </div>
    );
}

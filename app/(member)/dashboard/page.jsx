"use client";
// app/(member)/dashboard/page.jsx — ported from src/pages/CentralDashboard.jsx.
// Firestore onSnapshot -> Supabase fetch + realtime channels; aggregations,
// charts and CSV export unchanged.
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CSVLink } from "react-csv";
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import useConfig from "@/hooks/useConfig";
import useRegistrations, { registrantName } from "@/hooks/useRegistrations";
import { resolveHouses } from "@/utils/config";
import { getHouseKeyByName } from "@/utils/houseMapping";
import { LoadingScreen } from "@/components/ui/Spinner";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function regHouseKey(reg) {
    return reg.houseKey || getHouseKeyByName(reg.house) || null;
}

const TONE_CLASSES = {
    indigo: "bg-indigo-100 dark:bg-indigo-900/30",
    green: "bg-green-100 dark:bg-green-900/30",
    blue: "bg-blue-100 dark:bg-blue-900/30",
    purple: "bg-purple-100 dark:bg-purple-900/30",
    red: "bg-red-100 dark:bg-red-900/30",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30",
};

function StatCard({ label, value, emoji, tone = "indigo" }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-3 sm:p-5 flex items-center">
            <div className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg ${TONE_CLASSES[tone] || TONE_CLASSES.indigo} flex items-center justify-center mr-2 sm:mr-3 text-lg sm:text-xl`}>{emoji}</div>
            <div className="min-w-0">
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{label}</div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            </div>
        </div>
    );
}

export default function CentralDashboard() {
    const { config } = useConfig();
    const { registrations, loading } = useRegistrations();
    const houses = resolveHouses(config);
    const supabase = createClient();

    const [results, setResults] = useState([]);
    const [injuries, setInjuries] = useState([]);
    const [decisions, setDecisions] = useState([]);
    const [filters, setFilters] = useState({ house: "all", role: "all", gender: "all", category: "all" });

    useEffect(() => {
        let active = true;
        const setters = { results: setResults, injuries: setInjuries, decisions: setDecisions };
        const loadTable = async (table) => {
            const { data } = await supabase.from(table).select("*");
            if (active) setters[table](data || []);
        };
        Object.keys(setters).forEach(loadTable);
        const channels = Object.keys(setters).map((t) =>
            supabase.channel(`${t}_dash`)
                .on("postgres_changes", { event: "*", schema: "public", table: t }, () => loadTable(t))
                .subscribe()
        );
        return () => { active = false; channels.forEach((c) => supabase.removeChannel(c)); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const roles = config.registrantRoles;
    const previousEditions = config.previousEditions;
    const houseName = (key) => houses.find((h) => h.key === key)?.shortName || houses.find((h) => h.key === key)?.name || key;

    const filteredRegs = useMemo(() => registrations.filter((r) => {
        if (filters.house !== "all" && regHouseKey(r) !== filters.house) return false;
        if (filters.role !== "all" && (r.role || "Participant") !== filters.role) return false;
        if (filters.gender !== "all" && r.sex !== filters.gender) return false;
        return true;
    }), [registrations, filters]);

    const filteredResults = useMemo(() => results.filter((r) => {
        if (filters.house !== "all" && r.houseKey !== filters.house) return false;
        if (filters.category !== "all" && r.category !== filters.category) return false;
        return true;
    }), [results, filters]);

    const total = filteredRegs.length;

    const perHouse = useMemo(() => {
        const counts = {};
        houses.forEach((h) => { counts[h.key] = 0; });
        filteredRegs.forEach((r) => {
            const k = regHouseKey(r);
            if (k && counts[k] !== undefined) counts[k] += 1;
        });
        return counts;
    }, [filteredRegs, houses]);

    const roleBreakdown = useMemo(() => {
        const counts = {};
        filteredRegs.forEach((r) => {
            const role = r.role || "Participant";
            counts[role] = (counts[role] || 0) + 1;
        });
        return counts;
    }, [filteredRegs]);

    const houseScores = useMemo(() => {
        const rows = houses.map((h) => ({ key: h.key, name: h.name, color: h.color, points: 0, gold: 0, silver: 0, bronze: 0 }));
        const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
        filteredResults.forEach((res) => {
            const row = byKey[res.houseKey];
            if (!row) return;
            row.points += res.points || 0;
            if (res.medal === "gold") row.gold += 1;
            else if (res.medal === "silver") row.silver += 1;
            else if (res.medal === "bronze") row.bronze += 1;
        });
        return rows.sort((a, b) => b.points - a.points);
    }, [filteredResults, houses]);

    const leaderboard = useMemo(() => {
        const byPerson = {};
        filteredResults.forEach((res) => {
            const key = res.personId || res.personName;
            if (!key) return;
            if (!byPerson[key]) byPerson[key] = { name: res.personName || "Unknown", gold: 0, silver: 0, bronze: 0, total: 0 };
            const p = byPerson[key];
            if (res.medal === "gold") p.gold += 1;
            else if (res.medal === "silver") p.silver += 1;
            else if (res.medal === "bronze") p.bronze += 1;
            p.total += 1;
        });
        return Object.values(byPerson).sort((a, b) => b.gold - a.gold || b.total - a.total).slice(0, 15);
    }, [filteredResults]);

    const prevCount = (reg) => (reg.fiestaAttendance || []).filter((e) => previousEditions.includes(e)).length;

    const attendanceBuckets = useMemo(() => {
        const buckets = {};
        previousEditions.forEach((_, i) => { buckets[i] = 0; });
        buckets[previousEditions.length] = 0;
        filteredRegs.forEach((r) => { buckets[prevCount(r)] += 1; });
        return buckets;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredRegs, previousEditions]);

    const returningVsNew = useMemo(() => {
        let returning = 0; let fresh = 0;
        filteredRegs.forEach((r) => { prevCount(r) > 0 ? returning++ : fresh++; });
        return { returning, new: fresh };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredRegs, previousEditions]);

    const perEdition = useMemo(() => {
        const counts = {};
        previousEditions.forEach((e) => { counts[e] = 0; });
        filteredRegs.forEach((r) => {
            (r.fiestaAttendance || []).forEach((e) => { if (counts[e] !== undefined) counts[e] += 1; });
        });
        return counts;
    }, [filteredRegs, previousEditions]);

    const regCsv = useMemo(() => ({
        headers: [
            { label: "Reg No", key: "regNo" }, { label: "Name", key: "name" }, { label: "Age", key: "age" }, { label: "Gender", key: "sex" },
            { label: "Role", key: "role" }, { label: "House", key: "house" },
            { label: "Prev fiestas attended", key: "prev" }, { label: "Editions", key: "editions" },
        ],
        data: filteredRegs.map((r) => ({
            regNo: r.reg_no || "", name: registrantName(r), age: r.age || "", sex: r.sex || "", role: r.role || "Participant",
            house: r.house || "Unassigned",
            prev: prevCount(r), editions: (r.fiestaAttendance || []).join(", "),
        })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [filteredRegs, previousEditions]);

    const standingsCsv = useMemo(() => ({
        headers: [
            { label: "House", key: "name" }, { label: "Points", key: "points" },
            { label: "Gold", key: "gold" }, { label: "Silver", key: "silver" }, { label: "Bronze", key: "bronze" },
        ],
        data: houseScores,
    }), [houseScores]);

    const chartText = "#9ca3af";
    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, ticks: { color: chartText }, grid: { color: "#e5e7eb33" } },
            x: { ticks: { color: chartText }, grid: { display: false } },
        },
    };

    const houseBarData = {
        labels: houses.map((h) => h.shortName),
        datasets: [{ data: houses.map((h) => perHouse[h.key] || 0), backgroundColor: houses.map((h) => h.color), borderRadius: 6 }],
    };
    const attendanceBarData = {
        labels: Object.keys(attendanceBuckets).map((n) => `${n} prev`),
        datasets: [{ data: Object.values(attendanceBuckets), backgroundColor: "#6366f1", borderRadius: 6 }],
    };
    const scoreDoughnut = {
        labels: houseScores.map((h) => houseName(h.key)),
        datasets: [{ data: houseScores.map((h) => h.points), backgroundColor: houseScores.map((h) => h.color), borderWidth: 2, borderColor: "#ffffff" }],
    };

    if (loading) {
        return <LoadingScreen label="Loading dashboard..." />;
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <header className="text-center mb-6 py-5 sm:py-6 px-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-lg">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Central Dashboard</h1>
                <p className="text-sm sm:text-base opacity-90">Live overview — Sports Fiesta {config.currentEdition}</p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-full sm:w-auto">Filters:</span>
                <select value={filters.house} onChange={(e) => setFilters({ ...filters, house: e.target.value })}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="all">All houses</option>
                    {houses.map((h) => <option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>)}
                </select>
                <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="all">All roles</option>
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    <option value="all">All genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Others">Others</option>
                </select>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" title="Sport category (applies to medal standings)">
                    <option value="all">All categories</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Mixed">Mixed</option>
                </select>
                <div className="w-full sm:w-auto sm:ml-auto flex gap-2">
                    <CSVLink data={regCsv.data} headers={regCsv.headers} filename="registrations.csv"
                        className="flex-1 sm:flex-none text-center bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">Export registrations</CSVLink>
                    <CSVLink data={standingsCsv.data} headers={standingsCsv.headers} filename="house-standings.csv"
                        className="flex-1 sm:flex-none text-center bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-700">Export standings</CSVLink>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                <StatCard label="Registrations" value={total} emoji="📋" tone="indigo" />
                <StatCard label="Returning" value={returningVsNew.returning} emoji="🔁" tone="blue" />
                <StatCard label="New" value={returningVsNew.new} emoji="✨" tone="purple" />
                <StatCard label="Injuries" value={injuries.length} emoji="🩹" tone="red" />
                <StatCard label="Decisions" value={decisions.length} emoji="✝️" tone="yellow" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">House distribution</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                        {houses.map((h) => (
                            <div key={h.key} className="p-3 rounded-lg text-center text-white" style={{ background: h.color }}>
                                <div className="text-xs truncate">{h.shortName}</div>
                                <div className="text-xl font-bold">{perHouse[h.key] || 0}</div>
                            </div>
                        ))}
                    </div>
                    <div className="h-48 sm:h-56"><Bar data={houseBarData} options={barOptions} /></div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">Role breakdown</h2>
                    <div className="space-y-2">
                        {roles.map((role) => (
                            <div key={role} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <span className="font-medium text-gray-800 dark:text-gray-200">{role}</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{roleBreakdown[role] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">House medal standings</h2>
                    <div className="overflow-x-auto mb-4">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 dark:text-gray-400">
                                    <th className="py-2">House</th><th>Pts</th><th>🥇</th><th>🥈</th><th>🥉</th>
                                </tr>
                            </thead>
                            <tbody>
                                {houseScores.map((h) => (
                                    <tr key={h.key} className="border-t border-gray-100 dark:border-gray-700">
                                        <td className="py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ background: h.color }} />
                                            {houseName(h.key)}
                                        </td>
                                        <td className="font-bold text-indigo-600 dark:text-indigo-400">{h.points}</td>
                                        <td>{h.gold}</td><td>{h.silver}</td><td>{h.bronze}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="h-48 sm:h-56"><Doughnut data={scoreDoughnut} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: chartText } } } }} /></div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">Personal medal leaderboard</h2>
                    {leaderboard.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No individual medals recorded yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 dark:text-gray-400">
                                        <th className="py-2">#</th><th>Name</th><th>🥇</th><th>🥈</th><th>🥉</th><th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((p, i) => (
                                        <tr key={p.name + i} className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="py-2 text-gray-500">{i + 1}</td>
                                            <td className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.name}</td>
                                            <td>{p.gold}</td><td>{p.silver}</td><td>{p.bronze}</td>
                                            <td className="font-bold">{p.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">Sports Fiesta attendance history</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    This year&rsquo;s registrants by how many of the previous {previousEditions.length} editions they attended.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">By number of previous editions attended</h3>
                        <div className="h-48 sm:h-56"><Bar data={attendanceBarData} options={barOptions} /></div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Attendance per previous edition</h3>
                        <div className="space-y-2">
                            {previousEditions.map((e) => (
                                <div key={e} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-800 dark:text-gray-200">Sports Fiesta {e}</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{perEdition[e]}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                                <span className="font-medium text-gray-800 dark:text-gray-200">Returning vs new</span>
                                <span className="text-sm">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{returningVsNew.returning}</span>
                                    {" returning · "}
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{returningVsNew.new}</span>
                                    {" new"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

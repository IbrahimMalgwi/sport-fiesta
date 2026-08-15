"use client";
// app/(member)/analysis/page.jsx — ported from src/pages/AnalysisDashboard.jsx.
// getDocs -> supabase select; Firestore Timestamp -> created_at ISO string.
import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    houses, getShortHouseName, getHouseColor, getHouseKeyByName,
} from "@/utils/houseMapping";
import { CSVLink } from "react-csv";
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title,
} from "chart.js";
import { Doughnut, Pie, Bar } from "react-chartjs-2";
import { LoadingScreen } from "@/components/ui/Spinner";
import { HouseBadge } from "@/components/ui/Badge";
import { MobileCardRow, MobileCardField } from "@/components/ui/MobileCardList";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function RegistrationTable({ registrations }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" });

    const filteredRegistrations = useMemo(() => registrations.filter((reg) =>
        reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.phone?.includes(searchTerm) ||
        reg.house?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.sex?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.religion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.fiestaAttendance?.join(", ").toLowerCase().includes(searchTerm.toLowerCase())
    ), [registrations, searchTerm]);

    const sortedRegistrations = useMemo(() => {
        const sortableItems = [...filteredRegistrations];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "ascending" ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "ascending" ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredRegistrations, sortConfig]);

    const currentItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        return sortedRegistrations.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
    }, [sortedRegistrations, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedRegistrations.length / itemsPerPage);

    const handleSort = (key) => {
        let direction = "ascending";
        if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending";
        setSortConfig({ key, direction });
    };

    const csvData = useMemo(() => {
        const headers = [
            { label: "Name", key: "name" }, { label: "Age", key: "age" }, { label: "Gender", key: "sex" },
            { label: "Religion", key: "religion" }, { label: "Phone", key: "phone" }, { label: "Email", key: "email" },
            { label: "House", key: "house" }, { label: "Sports Fiesta Attendance", key: "fiestaAttendance" },
            { label: "Registration Date", key: "createdAt" },
        ];
        const data = sortedRegistrations.map((reg) => ({
            name: reg.name || "", age: reg.age || "", sex: reg.sex || "", religion: reg.religion || "",
            phone: reg.phone || "", email: reg.email || "", house: reg.house || "",
            fiestaAttendance: reg.fiestaAttendance ? reg.fiestaAttendance.join(", ") : "",
            createdAt: reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "",
        }));
        return { data, headers };
    }, [sortedRegistrations]);

    const formatDate = (ts) => (ts ? new Date(ts).toLocaleDateString() : "N/A");

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Registration Records</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <input type="text" placeholder="Search registrations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white text-sm" />
                    <CSVLink data={csvData.data} headers={csvData.headers} filename={"participant-registrations.csv"}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-center text-sm">Export CSV</CSVLink>
                </div>
            </div>

            {/* Desktop/tablet: full table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/60">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("name")}>
                                Name {sortConfig.key === "name" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("age")}>
                                Age {sortConfig.key === "age" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("sex")}>
                                Gender {sortConfig.key === "sex" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("religion")}>
                                Religion {sortConfig.key === "religion" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("house")}>
                                House {sortConfig.key === "house" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SF Attendance</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("created_at")}>
                                Date {sortConfig.key === "created_at" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentItems.length > 0 ? currentItems.map((registration, index) => (
                            <tr key={registration.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{registration.name}</div></td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 dark:text-gray-200">{registration.age}</div></td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{registration.sex}</span></td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{registration.religion}</td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 dark:text-gray-200">{registration.phone}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{registration.email}</div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <HouseBadge name={getShortHouseName(registration.house)} color={getHouseColor(getHouseKeyByName(registration.house))} />
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{registration.fiestaAttendance?.join(", ") || "None"}</td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{formatDate(registration.created_at)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No registrations found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile: stacked cards — this table has 8 columns, unreadable
                even scrolled horizontally at phone widths, so it gets a real
                card layout instead of just overflow-x-auto. */}
            <div className="sm:hidden space-y-3">
                {currentItems.length > 0 ? currentItems.map((registration, index) => (
                    <MobileCardRow key={registration.id || index}>
                        <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{registration.name}</span>
                            <HouseBadge name={getShortHouseName(registration.house)} color={getHouseColor(getHouseKeyByName(registration.house))} />
                        </div>
                        <MobileCardField label="Age / Gender">{registration.age} · {registration.sex}</MobileCardField>
                        <MobileCardField label="Religion">{registration.religion}</MobileCardField>
                        <MobileCardField label="Phone">{registration.phone}</MobileCardField>
                        <MobileCardField label="Email">{registration.email}</MobileCardField>
                        <MobileCardField label="SF Attendance">{registration.fiestaAttendance?.join(", ") || "None"}</MobileCardField>
                        <MobileCardField label="Date">{formatDate(registration.created_at)}</MobileCardField>
                    </MobileCardRow>
                )) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No registrations found</p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{sortedRegistrations.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedRegistrations.length)}</span> of{" "}
                    <span className="font-medium">{sortedRegistrations.length}</span> results
                </p>
                <div className="flex items-center gap-3">
                    <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
                        <option value="5">5 per page</option>
                        <option value="10">10 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                    </select>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px overflow-x-auto" aria-label="Pagination">
                        <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">Prev</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;
                            return (
                                <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                                    className={`relative inline-flex items-center px-3 sm:px-4 py-1.5 border text-sm font-medium ${currentPage === pageNum ? "z-10 bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-600 dark:text-indigo-300" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">Next</button>
                    </nav>
                </div>
            </div>
        </div>
    );
}

export default function AnalysisDashboard() {
    const supabase = createClient();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            const { data } = await supabase.from("registrations").select("*");
            const docs = data || [];
            const normalized = docs.map((r) => {
                const houseValue = r.house?.toLowerCase() || "";
                let normalizedHouse = null;
                if (r.houseKey) {
                    const house = houses.find((h) => h.key === r.houseKey);
                    if (house) normalizedHouse = house.name;
                }
                if (!normalizedHouse) {
                    for (const house of houses) {
                        if (houseValue.includes(house.name.toLowerCase()) || houseValue.includes(house.shortName.toLowerCase()) || houseValue.includes(house.key.toLowerCase())) {
                            normalizedHouse = house.name;
                            break;
                        }
                    }
                }
                const sexValue = r.sex?.toLowerCase() || "";
                let normalizedSex = "Unknown";
                if (sexValue === "male") normalizedSex = "Male";
                else if (sexValue === "female") normalizedSex = "Female";
                else if (sexValue === "others") normalizedSex = "Others";
                else if (sexValue.includes("male")) normalizedSex = "Male";
                else if (sexValue.includes("female")) normalizedSex = "Female";
                else if (sexValue.includes("other") || sexValue.includes("prefer") || sexValue.includes("not")) normalizedSex = "Others";
                const fiestaAttendance = Array.isArray(r.fiestaAttendance) ? r.fiestaAttendance : [];
                return { ...r, house: normalizedHouse || "Unknown", sex: normalizedSex, fiestaAttendance };
            });
            setRegistrations(normalized);
            setLoading(false);
        }
        fetchData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const total = registrations.length;

    const aggregateData = (key) => {
        const counts = {};
        registrations.forEach((r) => {
            const value = r[key];
            if (value && value !== "Unknown") counts[value] = (counts[value] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0.0" }));
    };

    const getAgeGroups = () => {
        const groups = { "0 - 12": 0, "13-17": 0, "18-25": 0, "26+": 0 };
        registrations.forEach((r) => {
            if (r.age) {
                const age = parseInt(r.age);
                if (age <= 12) groups["0 - 12"]++;
                else if (age <= 17) groups["13-17"]++;
                else if (age <= 25) groups["18-25"]++;
                else groups["26+"]++;
            }
        });
        return Object.entries(groups).map(([name, value]) => ({ name, value, percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0.0" }));
    };

    const getFiestaAttendanceStats = () => {
        const attendanceCounts = { "1.0": 0, "2.0": 0, "3.0": 0, "4.0": 0 };
        const editionParticipation = { "First-timers (only 4.0)": 0, "Attended 2 editions": 0, "Attended 3 editions": 0, "Attended all 4 editions": 0 };
        registrations.forEach((reg) => {
            reg.fiestaAttendance?.forEach((edition) => { if (attendanceCounts.hasOwnProperty(edition)) attendanceCounts[edition]++; });
            const editionCount = reg.fiestaAttendance?.length || 0;
            const hasAllEditions = reg.fiestaAttendance?.includes("1.0") && reg.fiestaAttendance?.includes("2.0") && reg.fiestaAttendance?.includes("3.0") && reg.fiestaAttendance?.includes("4.0");
            if (hasAllEditions) editionParticipation["Attended all 4 editions"]++;
            else if (editionCount === 1 && reg.fiestaAttendance?.includes("4.0")) editionParticipation["First-timers (only 4.0)"]++;
            else if (editionCount === 2) editionParticipation["Attended 2 editions"]++;
            else if (editionCount === 3) editionParticipation["Attended 3 editions"]++;
        });
        return {
            byEdition: Object.entries(attendanceCounts).map(([edition, count]) => ({ edition, count, percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0.0" })),
            byParticipation: Object.entries(editionParticipation).map(([category, count]) => ({ category, count, percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0.0" })),
        };
    };

    const fiestaStats = getFiestaAttendanceStats();
    const houseData = aggregateData("house");
    const sexData = aggregateData("sex");
    const religionData = aggregateData("religion");
    const ageData = getAgeGroups();

    const allGenders = [
        { name: "Male", value: 0, percentage: "0.0" },
        { name: "Female", value: 0, percentage: "0.0" },
        { name: "Others", value: 0, percentage: "0.0" },
    ];
    sexData.forEach((gender) => {
        const index = allGenders.findIndex((g) => g.name === gender.name);
        if (index !== -1) allGenders[index] = gender;
    });

    const chartText = "#9ca3af";

    const houseChartData = {
        labels: houseData.map((h) => getShortHouseName(h.name)),
        datasets: [{ data: houseData.map((h) => h.value), backgroundColor: houseData.map((h) => getHouseColor(getHouseKeyByName(h.name))), borderWidth: 2, borderColor: "#ffffff" }],
    };
    const houseChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: chartText, font: { size: 12 }, padding: 20 } } }, cutout: "70%" };

    const genderChartData = { labels: allGenders.map((g) => g.name), datasets: [{ data: allGenders.map((g) => g.value), backgroundColor: ["#FF0000", "#800080", "#FFD700"], borderWidth: 2, borderColor: "#ffffff" }] };
    const genderChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: chartText, font: { size: 12 }, padding: 20 } } } };

    const religionChartData = { labels: religionData.map((r) => r.name), datasets: [{ label: "Participants", data: religionData.map((r) => r.value), backgroundColor: ["#0000FF", "#FFD700", "#800080"], borderWidth: 0, borderRadius: 6, barPercentage: 0.6 }] };
    const religionChartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { drawBorder: false, color: "#e5e7eb33" }, ticks: { color: chartText } }, x: { grid: { display: false }, ticks: { color: chartText } } }, plugins: { legend: { display: false } } };

    const ageChartData = { labels: ageData.map((a) => a.name), datasets: [{ label: "Participants", data: ageData.map((a) => a.value), backgroundColor: ["#FFD700", "#FF0000", "#0000FF", "#800080"], borderWidth: 0, borderRadius: 6, barPercentage: 0.6 }] };
    const ageChartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { drawBorder: false, color: "#e5e7eb33" }, ticks: { color: chartText } }, x: { grid: { display: false }, ticks: { color: chartText } } }, plugins: { legend: { display: false } } };

    const fiestaEditionChartData = { labels: fiestaStats.byEdition.map((item) => `Sports Fiesta ${item.edition}`), datasets: [{ label: "Participants", data: fiestaStats.byEdition.map((item) => item.count), backgroundColor: ["#FF0000", "#0000FF", "#FFD700", "#800080"], borderWidth: 0, borderRadius: 6, barPercentage: 0.6 }] };
    const fiestaEditionChartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { drawBorder: false, color: "#e5e7eb33" }, ticks: { color: chartText } }, x: { grid: { display: false }, ticks: { color: chartText } } }, plugins: { legend: { display: false } } };

    const fiestaParticipationChartData = { labels: fiestaStats.byParticipation.map((item) => item.category), datasets: [{ data: fiestaStats.byParticipation.map((item) => item.count), backgroundColor: ["#FF0000", "#0000FF", "#FFD700", "#800080"], borderWidth: 2, borderColor: "#ffffff" }] };
    const fiestaParticipationChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: chartText, font: { size: 12 }, padding: 20 } } } };

    if (loading) {
        return <LoadingScreen label="Loading dashboard data..." />;
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            <header className="text-center mb-6 sm:mb-8 py-5 sm:py-6 px-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-lg">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Participant Analytics Dashboard</h1>
                <p className="text-base sm:text-xl opacity-90">Comprehensive overview of registrations and distributions</p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg mb-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-3 sm:mr-4 text-indigo-600 dark:text-indigo-300 text-xl">📊</div>
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">Total Registrations</h2>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">All participants in the teen program</p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-2xl sm:text-4xl font-bold text-indigo-600 dark:text-indigo-400">{total}</div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Participants</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex items-center mb-4 sm:mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mr-3 text-purple-600 dark:text-purple-300">🏠</div>
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">House Distribution</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                        {houseData.map((h) => {
                            const color = getHouseColor(getHouseKeyByName(h.name));
                            return (
                                <div key={h.name} className="p-3 sm:p-4 rounded-xl text-center text-white shadow-md" style={{ background: `linear-gradient(135deg, ${color}, ${color}AA)` }}>
                                    <div className="text-xs sm:text-sm font-semibold uppercase tracking-wide truncate">{getShortHouseName(h.name)}</div>
                                    <div className="text-xl sm:text-2xl font-bold my-1 sm:my-2">{h.value}</div>
                                    <div className="text-xs sm:text-sm opacity-90">({h.percentage}%)</div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-64 sm:h-80"><Doughnut data={houseChartData} options={houseChartOptions} /></div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex items-center mb-4 sm:mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mr-3 text-blue-600 dark:text-blue-300">👥</div>
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Gender Distribution</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mb-6">
                        {allGenders.map((g) => {
                            let colorClass = "text-gray-800 dark:text-gray-200";
                            if (g.name.toLowerCase().includes("male") && !g.name.toLowerCase().includes("female")) colorClass = "text-red-600 dark:text-red-400";
                            else if (g.name.toLowerCase().includes("female")) colorClass = "text-purple-600 dark:text-purple-400";
                            else if (g.name.toLowerCase().includes("other")) colorClass = "text-yellow-600 dark:text-yellow-400";
                            return (
                                <div key={g.name} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{g.name}</span>
                                    <div className="text-right"><span className={`font-bold text-lg sm:text-xl ${colorClass}`}>{g.value}</span><span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({g.percentage}%)</span></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-56 sm:h-64"><Pie data={genderChartData} options={genderChartOptions} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex items-center mb-4 sm:mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center mr-3 text-red-600 dark:text-red-300">🙏</div>
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Religion Distribution</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mb-6">
                        {religionData.map((r) => {
                            let colorClass = "text-gray-800 dark:text-gray-200";
                            if (r.name.toLowerCase().includes("christian")) colorClass = "text-blue-600 dark:text-blue-400";
                            else if (r.name.toLowerCase().includes("islam")) colorClass = "text-yellow-600 dark:text-yellow-400";
                            else if (r.name.toLowerCase().includes("other")) colorClass = "text-purple-600 dark:text-purple-400";
                            return (
                                <div key={r.name} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{r.name}</span>
                                    <div className="text-right"><span className={`font-bold text-lg sm:text-xl ${colorClass}`}>{r.value}</span><span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({r.percentage}%)</span></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-56 sm:h-64"><Bar data={religionChartData} options={religionChartOptions} /></div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex items-center mb-4 sm:mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center mr-3 text-yellow-600 dark:text-yellow-300">🎂</div>
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Age Distribution</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mb-6">
                        {ageData.map((a) => {
                            let colorClass = "text-gray-800 dark:text-gray-200";
                            if (a.name === "0 - 12") colorClass = "text-yellow-600 dark:text-yellow-400";
                            else if (a.name === "13-17") colorClass = "text-red-600 dark:text-red-400";
                            else if (a.name === "18-25") colorClass = "text-blue-600 dark:text-blue-400";
                            else if (a.name === "26+") colorClass = "text-purple-600 dark:text-purple-400";
                            return (
                                <div key={a.name} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{a.name} {a.name !== "26+" && "years"}</span>
                                    <div className="text-right"><span className={`font-bold text-lg sm:text-xl ${colorClass}`}>{a.value}</span><span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({a.percentage}%)</span></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-56 sm:h-64"><Bar data={ageChartData} options={ageChartOptions} /></div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg mb-6">
                <div className="flex items-center mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center mr-3 sm:mr-4 text-green-600 dark:text-green-300 text-xl">🏆</div>
                    <div>
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Sports Fiesta Attendance</h2>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Participation across different editions</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">Attendance by Edition</h3>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                            {fiestaStats.byEdition.map((item) => (
                                <div key={item.edition} className="bg-gray-50 dark:bg-gray-700/50 p-3 sm:p-4 rounded-lg text-center">
                                    <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">SF {item.edition}</div>
                                    <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 my-1">{item.count}</div>
                                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">({item.percentage}%)</div>
                                </div>
                            ))}
                        </div>
                        <div className="h-56 sm:h-64"><Bar data={fiestaEditionChartData} options={fiestaEditionChartOptions} /></div>
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">Participation Categories</h3>
                        <div className="grid grid-cols-1 gap-3 mb-6">
                            {fiestaStats.byParticipation.map((item) => (
                                <div key={item.category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.category}</span>
                                    <div className="text-right"><span className="font-bold text-lg sm:text-xl text-indigo-600 dark:text-indigo-400">{item.count}</span><span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({item.percentage}%)</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="h-56 sm:h-64"><Doughnut data={fiestaParticipationChartData} options={fiestaParticipationChartOptions} /></div>
                    </div>
                </div>
            </div>

            <RegistrationTable registrations={registrations} />
        </div>
    );
}

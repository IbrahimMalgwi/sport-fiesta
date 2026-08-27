"use client";
// app/(member)/staff-dashboard/page.jsx — ported from src/pages/StaffDashboard.jsx
import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { STAFF_DESIGNATION_FILTERS } from "@/utils/config";
import { CSVLink } from "react-csv";
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, DoughnutController,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { LoadingScreen } from "@/components/ui/Spinner";
import { MobileCardRow, MobileCardField } from "@/components/ui/MobileCardList";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, DoughnutController);

const DESIGNATIONS = STAFF_DESIGNATION_FILTERS;

const DESIGNATION_COLORS = {
    "Counselor/Marshal": "#FF0000", "Marshal": "#ef4444", "Counsellor": "#f97316", "Medic": "#0000FF", "Media": "#800080", "Sound": "#FFD700",
    "Welfare": "#4f46e5", "Data": "#6366f1", "Security": "#10b981", "Other": "#6b7280",
};

const ORGANIZATION_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFBE0B", "#FB5607", "#8338EC", "#3A86FF", "#FF006E",
    "#04E762", "#F9C80E", "#F86624", "#662E9B", "#43BCCD", "#F72585", "#7209B7", "#3A0CA3",
    "#4361EE", "#4CC9F0", "#F72585", "#560BAD",
];

const chartText = "#9ca3af";

export default function StaffDashboard() {
    const supabase = createClient();
    const [staffData, setStaffData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [stats, setStats] = useState({ totalStaff: 0, byDesignation: {}, byOrganization: {}, recentRegistrations: 0 });

    useEffect(() => {
        const fetchStaffData = async () => {
            try {
                const { data } = await supabase.from("staff_registrations").select("*");
                const staffMembers = data || [];
                const designationCount = {};
                const organizationCount = {};
                let recentCount = 0;
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                DESIGNATIONS.forEach((d) => { designationCount[d] = 0; });

                staffMembers.forEach((row) => {
                    let designation = row.finalDesignation || row.designation || "Unknown";
                    if (!DESIGNATIONS.includes(designation)) designation = "Other";
                    designationCount[designation] = (designationCount[designation] || 0) + 1;
                    const org = row.organization || "Unknown";
                    organizationCount[org] = (organizationCount[org] || 0) + 1;
                    if (row.created_at && new Date(row.created_at) > oneWeekAgo) recentCount++;
                });

                setStaffData(staffMembers);
                setStats({
                    totalStaff: staffMembers.length,
                    byDesignation: designationCount,
                    byOrganization: organizationCount,
                    recentRegistrations: recentCount,
                });
            } catch (error) {
                console.error("Error fetching staff data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStaffData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredStaff = staffData.filter((staff) =>
        staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone?.includes(searchTerm) ||
        staff.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (staff.finalDesignation || staff.designation)?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const currentItems = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const csvData = {
        data: filteredStaff.map((staff) => ({
            Name: staff.name, Email: staff.email, Phone: staff.phone, Organization: staff.organization,
            Designation: staff.finalDesignation || staff.designation,
            RegistrationDate: staff.created_at ? new Date(staff.created_at).toLocaleDateString() : "Unknown",
        })),
        headers: [
            { label: "Name", key: "Name" }, { label: "Email", key: "Email" }, { label: "Phone", key: "Phone" },
            { label: "Organization", key: "Organization" }, { label: "Designation", key: "Designation" },
            { label: "Registration Date", key: "RegistrationDate" },
        ],
    };

    const orderedDesignationData = DESIGNATIONS.map((designation) => ({ designation, count: stats.byDesignation[designation] || 0 }));

    const designationChartData = {
        labels: orderedDesignationData.map((i) => i.designation),
        datasets: [{ data: orderedDesignationData.map((i) => i.count), backgroundColor: orderedDesignationData.map((i) => DESIGNATION_COLORS[i.designation]), borderWidth: 2, borderColor: "#ffffff" }],
    };
    const designationChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: chartText, font: { size: 11 }, padding: 15 } } } };

    const topOrganizations = Object.entries(stats.byOrganization).sort(([, a], [, b]) => b - a).slice(0, 8);
    const organizationChartData = {
        labels: topOrganizations.map(([org]) => (org.length > 20 ? org.substring(0, 20) + "..." : org)),
        datasets: [{ label: "Staff Count", data: topOrganizations.map(([, count]) => count), backgroundColor: topOrganizations.map((_, index) => ORGANIZATION_COLORS[index % ORGANIZATION_COLORS.length]), borderWidth: 0, borderRadius: 6, barPercentage: 0.7 }],
    };
    const organizationChartOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, grid: { drawBorder: false, color: "#e5e7eb33" }, ticks: { stepSize: 1, color: chartText } }, x: { grid: { display: false }, ticks: { color: chartText } } },
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw}`, title: (context) => topOrganizations[context[0].dataIndex][0] } },
        },
    };

    if (loading) {
        return <LoadingScreen label="Loading staff analytics..." />;
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8 py-5 sm:py-6 px-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-lg">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Staff Analytics Dashboard</h1>
                <p className="text-base sm:text-xl opacity-90">Comprehensive overview of staff registrations</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-2 sm:mb-3 text-indigo-600 dark:text-indigo-300">👥</div>
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Total Staff</h3>
                    <p className="text-xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalStaff}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-2 sm:mb-3 text-green-600 dark:text-green-300">📈</div>
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">This Week</h3>
                    <p className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.recentRegistrations}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-2 sm:mb-3 text-blue-600 dark:text-blue-300">🏢</div>
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Organizations</h3>
                    <p className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{Object.keys(stats.byOrganization).length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-2 sm:mb-3 text-purple-600 dark:text-purple-300">🎯</div>
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Roles</h3>
                    <p className="text-xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{Object.keys(stats.byDesignation).length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
                    <div className="flex items-center mb-4 sm:mb-6">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mr-3 text-purple-600 dark:text-purple-300">🎯</div>
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Designation Distribution</h2>
                    </div>
                    <div className="h-64 sm:h-80"><Doughnut data={designationChartData} options={designationChartOptions} /></div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
                    <div className="flex items-center mb-4 sm:mb-6">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mr-3 text-blue-600 dark:text-blue-300">🏢</div>
                        <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Top Organizations</h2>
                    </div>
                    <div className="h-64 sm:h-80"><Bar data={organizationChartData} options={organizationChartOptions} /></div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="flex items-center mb-4 sm:mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-3 text-indigo-600 dark:text-indigo-300">📊</div>
                    <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Designation Breakdown</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {orderedDesignationData.map(({ designation, count }) => (
                        <div key={designation} className="bg-gray-50 dark:bg-gray-700/50 p-3 sm:p-4 rounded-lg border-l-4" style={{ borderLeftColor: DESIGNATION_COLORS[designation] }}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">{designation}</span>
                                <span className="text-lg font-bold" style={{ color: DESIGNATION_COLORS[designation] }}>{count}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div className="h-2 rounded-full" style={{ width: `${stats.totalStaff > 0 ? (count / stats.totalStaff) * 100 : 0}%`, backgroundColor: DESIGNATION_COLORS[designation] }}></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.totalStaff > 0 ? ((count / stats.totalStaff) * 100).toFixed(1) : 0}% of total</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
                    <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">Staff Members ({filteredStaff.length})</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white text-sm" />
                        <CSVLink data={csvData.data} headers={csvData.headers} filename={"staff-registrations.csv"}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-center text-sm">Export CSV</CSVLink>
                    </div>
                </div>

                {/* Desktop/tablet: table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/60">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Organization</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Designation</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registered</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {currentItems.length > 0 ? currentItems.map((staff) => {
                                const designation = staff.finalDesignation || staff.designation;
                                const isCommonDesignation = DESIGNATIONS.includes(designation);
                                const displayDesignation = isCommonDesignation ? designation : "Other";
                                return (
                                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{staff.name}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-gray-200">{staff.phone}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{staff.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{staff.organization}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full"
                                                style={{ backgroundColor: `${DESIGNATION_COLORS[displayDesignation]}20`, color: DESIGNATION_COLORS[displayDesignation], border: `1px solid ${DESIGNATION_COLORS[displayDesignation]}` }}>
                                                {displayDesignation}{!isCommonDesignation && designation !== "Other" && ` (${designation})`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : "Unknown"}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No staff members found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile: stacked cards */}
                <div className="sm:hidden space-y-3">
                    {currentItems.length > 0 ? currentItems.map((staff) => {
                        const designation = staff.finalDesignation || staff.designation;
                        const isCommonDesignation = DESIGNATIONS.includes(designation);
                        const displayDesignation = isCommonDesignation ? designation : "Other";
                        return (
                            <MobileCardRow key={staff.id}>
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-gray-900 dark:text-white">{staff.name}</span>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
                                        style={{ backgroundColor: `${DESIGNATION_COLORS[displayDesignation]}20`, color: DESIGNATION_COLORS[displayDesignation], border: `1px solid ${DESIGNATION_COLORS[displayDesignation]}` }}>
                                        {displayDesignation}
                                    </span>
                                </div>
                                <MobileCardField label="Phone">{staff.phone}</MobileCardField>
                                <MobileCardField label="Email">{staff.email}</MobileCardField>
                                <MobileCardField label="Organization">{staff.organization}</MobileCardField>
                                <MobileCardField label="Registered">{staff.created_at ? new Date(staff.created_at).toLocaleDateString() : "Unknown"}</MobileCardField>
                            </MobileCardRow>
                        );
                    }) : (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No staff members found</p>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredStaff.length)}</span> of{" "}
                            <span className="font-medium">{filteredStaff.length}</span> results
                        </p>
                        <div className="flex gap-2">
                            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
                                <option value="5">5 per page</option>
                                <option value="10">10 per page</option>
                                <option value="25">25 per page</option>
                                <option value="50">50 per page</option>
                            </select>
                            <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-md disabled:opacity-50">Previous</button>
                            <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-md disabled:opacity-50">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

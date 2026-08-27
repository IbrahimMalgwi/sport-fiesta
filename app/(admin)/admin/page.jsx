"use client";
// app/(admin)/admin/page.jsx — ported from src/pages/AdminPanel.jsx.
// Firestore users/registrations -> Supabase profiles/registrations.
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AdminRoute from "@/components/AdminRoute";
import { LoadingScreen } from "@/components/ui/Spinner";
import { MobileCardRow, MobileCardField, MobileCardActions } from "@/components/ui/MobileCardList";

export default function AdminPanel() {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [users, setUsers] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, totalRegistrations: 0, totalStaff: 0, pendingDeletions: 0 });

    useEffect(() => {
        fetchData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: usersRaw } = await supabase.from("profiles").select("*");
            // Alias snake_case columns to the camelCase the JSX expects.
            const usersData = (usersRaw || []).map((u) => ({
                ...u,
                displayName: u.display_name,
                deletionRequested: u.deletion_requested,
            }));
            setUsers(usersData);

            const { data: regData } = await supabase
                .from("registrations")
                .select("*")
                .order("created_at", { ascending: false });
            setRegistrations(regData || []);

            const { data: staffData } = await supabase
                .from("staff_registrations")
                .select("*")
                .order("created_at", { ascending: false });
            setStaff(staffData || []);

            setStats({
                totalUsers: usersData.length,
                totalRegistrations: (regData || []).length,
                totalStaff: (staffData || []).length,
                pendingDeletions: usersData.filter((u) => u.deletionRequested).length,
            });
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq("id", userId);
            if (error) throw error;
            setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            const { error } = await supabase.from("profiles").delete().eq("id", userId);
            if (error) throw error;
            setUsers(users.filter((user) => user.id !== userId));
            setStats((prev) => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    const handleDeleteRegistration = async (regId, regName) => {
        if (!window.confirm(`Are you sure you want to delete the registration for ${regName}? This action cannot be undone.`)) return;
        try {
            const { error } = await supabase.from("registrations").delete().eq("id", regId);
            if (error) throw error;
            setRegistrations(registrations.filter((reg) => reg.id !== regId));
            setStats((prev) => ({ ...prev, totalRegistrations: prev.totalRegistrations - 1 }));
        } catch (error) {
            console.error("Error deleting registration:", error);
            alert("Failed to delete registration: " + error.message);
        }
    };

    const handleDeleteStaff = async (staffId, staffName) => {
        if (!window.confirm(`Are you sure you want to delete the staff registration for ${staffName}? This action cannot be undone.`)) return;
        try {
            const { error } = await supabase.from("staff_registrations").delete().eq("id", staffId);
            if (error) throw error;
            setStaff(staff.filter((s) => s.id !== staffId));
            setStats((prev) => ({ ...prev, totalStaff: prev.totalStaff - 1 }));
        } catch (error) {
            console.error("Error deleting staff:", error);
            alert("Failed to delete staff registration: " + error.message);
        }
    };

    if (loading) {
        return (
            <AdminRoute>
                <LoadingScreen label="Loading admin panel..." />
            </AdminRoute>
        );
    }

    return (
        <AdminRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Panel</h1>

                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                        <nav className="-mb-px flex space-x-6 sm:space-x-8 whitespace-nowrap">
                            {["dashboard", "users", "registrations", "staff", "settings"].map((tab) => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`py-3 sm:py-4 px-1 text-sm font-medium shrink-0 ${activeTab === tab ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 border-b-2" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {activeTab === "dashboard" && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                                <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Total Users</h3>
                                <p className="text-xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalUsers}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                                <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Total Participants</h3>
                                <p className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalRegistrations}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                                <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Total Staff</h3>
                                <p className="text-xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalStaff}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                                <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">Pending Deletions</h3>
                                <p className="text-xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{stats.pendingDeletions}</p>
                            </div>
                            <div className="col-span-2 lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                                <div className="flex flex-wrap gap-3">
                                    <Link href="/admin/registrations" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-indigo-700 transition-colors">Manage Participants</Link>
                                    <Link href="/admin/registrations?tab=staff" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-indigo-700 transition-colors">Manage Staff</Link>
                                    <Link href="/admin/settings" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-purple-700 transition-colors">Fiesta Settings</Link>
                                    <Link href="/dashboard" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-green-700 transition-colors">Central Dashboard</Link>
                                    <button onClick={fetchData} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base hover:bg-gray-700 transition-colors">Refresh Data</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "users" && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">User Management</h3>
                            </div>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/60">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                                                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName || "No Name"}</div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select value={user.role || "user"} onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                                                        <option value="user">User</option>
                                                        <option value="staff">Staff</option>
                                                        <option value="marshal">Marshal</option>
                                                        <option value="counsellor">Counsellor</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.deletionRequested ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"}`}>
                                                        {user.deletionRequested ? "Deletion Requested" : "Active"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 mr-3">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="sm:hidden p-3 space-y-3">
                                {users.map((user) => (
                                    <MobileCardRow key={user.id}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                                <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">{user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.displayName || "No Name"}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                                            </div>
                                        </div>
                                        <MobileCardField label="Status">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.deletionRequested ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"}`}>
                                                {user.deletionRequested ? "Deletion Requested" : "Active"}
                                            </span>
                                        </MobileCardField>
                                        <div className="flex items-center justify-between gap-3 pt-1">
                                            <select value={user.role || "user"} onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-2 py-1">
                                                <option value="user">User</option>
                                                <option value="staff">Staff</option>
                                                <option value="marshal">Marshal</option>
                                                <option value="counsellor">Counsellor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 dark:text-red-400 text-sm font-medium">Delete</button>
                                        </div>
                                    </MobileCardRow>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "registrations" && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Registration Management</h3>
                                <Link href="/admin/registrations" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">Advanced Management</Link>
                            </div>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/60">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Participant</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Age / Sex</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">House</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {registrations.map((registration) => (
                                            <tr key={registration.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{registration.name || registration.fullName}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{registration.email}{registration.phone && ` • 📞 ${registration.phone}`}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">{registration.age}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{registration.sex}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full text-white" style={{ backgroundColor: registration.color || registration.houseColor || "#6b7280" }}>
                                                        {registration.house || registration.houseName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {registration.created_at ? new Date(registration.created_at).toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <Link href={`/admin/registrations?edit=${registration.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3">Edit</Link>
                                                    <button onClick={() => handleDeleteRegistration(registration.id, registration.name || registration.fullName)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="sm:hidden p-3 space-y-3">
                                {registrations.map((registration) => (
                                    <MobileCardRow key={registration.id}>
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-gray-900 dark:text-white">{registration.name || registration.fullName}</span>
                                            <span className="px-2 py-1 text-xs font-medium rounded-full text-white whitespace-nowrap" style={{ backgroundColor: registration.color || registration.houseColor || "#6b7280" }}>
                                                {registration.house || registration.houseName}
                                            </span>
                                        </div>
                                        <MobileCardField label="Age / Sex">{registration.age} · {registration.sex}</MobileCardField>
                                        <MobileCardField label="Contact">{registration.phone || registration.email}</MobileCardField>
                                        <MobileCardField label="Date">{registration.created_at ? new Date(registration.created_at).toLocaleDateString() : "N/A"}</MobileCardField>
                                        <MobileCardActions>
                                            <Link href={`/admin/registrations?edit=${registration.id}`} className="text-indigo-600 dark:text-indigo-400">Edit</Link>
                                            <button onClick={() => handleDeleteRegistration(registration.id, registration.name || registration.fullName)} className="text-red-600 dark:text-red-400">Delete</button>
                                        </MobileCardActions>
                                    </MobileCardRow>
                                ))}
                            </div>
                            {registrations.length === 0 && (
                                <div className="text-center py-12"><p className="text-gray-500 dark:text-gray-400">No registrations found.</p></div>
                            )}
                        </div>
                    )}

                    {activeTab === "staff" && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Staff Management</h3>
                                <Link href="/admin/registrations?tab=staff" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">Advanced Management</Link>
                            </div>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/60">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staff Member</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Organization</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Designation</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {staff.map((member) => (
                                            <tr key={member.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}{member.phone && ` • 📞 ${member.phone}`}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{member.organization}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full">{member.finalDesignation || member.designation}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <Link href={`/admin/registrations?tab=staff&editStaff=${member.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3">Edit</Link>
                                                    <button onClick={() => handleDeleteStaff(member.id, member.name)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="sm:hidden p-3 space-y-3">
                                {staff.map((member) => (
                                    <MobileCardRow key={member.id}>
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-gray-900 dark:text-white">{member.name}</span>
                                            <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full whitespace-nowrap">{member.finalDesignation || member.designation}</span>
                                        </div>
                                        <MobileCardField label="Organization">{member.organization}</MobileCardField>
                                        <MobileCardField label="Contact">{member.phone || member.email}</MobileCardField>
                                        <MobileCardField label="Date">{member.created_at ? new Date(member.created_at).toLocaleDateString() : "N/A"}</MobileCardField>
                                        <MobileCardActions>
                                            <Link href={`/admin/registrations?tab=staff&editStaff=${member.id}`} className="text-indigo-600 dark:text-indigo-400">Edit</Link>
                                            <button onClick={() => handleDeleteStaff(member.id, member.name)} className="text-red-600 dark:text-red-400">Delete</button>
                                        </MobileCardActions>
                                    </MobileCardRow>
                                ))}
                            </div>
                            {staff.length === 0 && (
                                <div className="text-center py-12"><p className="text-gray-500 dark:text-gray-400">No staff registrations found.</p></div>
                            )}
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">Admin Settings</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Fiesta configuration (cutoff, roles, editions, medal points, houses) lives on the
                                <Link href="/admin/settings" className="text-indigo-600 dark:text-indigo-400 hover:underline"> Fiesta Settings</Link> page.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminRoute>
    );
}

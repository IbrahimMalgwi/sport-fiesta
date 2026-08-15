"use client";
// app/(admin)/admin/registrations/page.jsx — ported from admin/RegistrationsManager.jsx.
// Consolidates the former standalone /admin/staff page (StaffManager) into a
// second tab here, so admins have one place to manage both Participants
// (registrations) and Staff (staff_registrations) with the same
// list/filter/edit/delete functionality. Tab state is reflected in the URL
// via ?tab=staff (read from window.location.search rather than
// useSearchParams() to avoid a Suspense boundary requirement, matching the
// pattern already used in app/login/page.jsx).
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import EditForm from "@/components/EditRegistrationForm";
import EditStaffForm from "@/components/EditStaffForm";
import { createClient } from "@/lib/supabase/client";
import AdminRoute from "@/components/AdminRoute";
import useConfig from "@/hooks/useConfig";
import { resolveHouses } from "@/utils/config";
import { getHouseKeyByName } from "@/utils/houseMapping";
import { LoadingScreen } from "@/components/ui/Spinner";
import { HouseBadge, Badge } from "@/components/ui/Badge";
import { MobileCardRow, MobileCardField, MobileCardActions } from "@/components/ui/MobileCardList";

const DESIGNATION_OPTIONS = ["Counselor/Marshal", "Medic", "Media", "Sound", "Welfare", "Data", "Security", "Other"];

export default function RegistrationsManager() {
    const supabase = createClient();
    const router = useRouter();
    const { config } = useConfig();
    const houses = resolveHouses(config);

    const [activeTab, setActiveTab] = useState("participants");
    // ?edit=<id> / ?editStaff=<id> — deep links from the /admin overview
    // panel's per-row "Edit" shortcuts, opened once the matching list loads.
    const [pendingEditId, setPendingEditId] = useState(null);
    const [pendingEditStaffId, setPendingEditStaffId] = useState(null);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("tab") === "staff") setActiveTab("staff");
        if (params.get("edit")) setPendingEditId(params.get("edit"));
        if (params.get("editStaff")) { setActiveTab("staff"); setPendingEditStaffId(params.get("editStaff")); }
    }, []);
    const switchTab = (tab) => {
        setActiveTab(tab);
        router.replace(tab === "staff" ? "/admin/registrations?tab=staff" : "/admin/registrations");
    };

    // ---- Participants (registrations) ----
    const [registrations, setRegistrations] = useState([]);
    const [loadingRegistrations, setLoadingRegistrations] = useState(true);
    const [editingRegistration, setEditingRegistration] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [search, setSearch] = useState("");
    const [houseFilter, setHouseFilter] = useState("all");

    const filteredRegistrations = useMemo(() => {
        return registrations.filter((reg) => {
            if (houseFilter !== "all") {
                const regHouseKey = reg.houseKey || getHouseKeyByName(reg.house);
                if (regHouseKey !== houseFilter) return false;
            }
            if (search) {
                const hay = `${reg.name || ""} ${reg.email || ""} ${reg.phone || ""} ${reg.reg_no || ""}`.toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            return true;
        });
    }, [registrations, houseFilter, search]);

    // ---- Staff (staff_registrations) ----
    const [staff, setStaff] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(true);
    const [editingStaff, setEditingStaff] = useState(null);
    const [showEditStaffModal, setShowEditStaffModal] = useState(false);
    const [staffSearch, setStaffSearch] = useState("");
    const [designationFilter, setDesignationFilter] = useState("all");

    const filteredStaff = useMemo(() => {
        return staff.filter((member) => {
            const designation = member.finalDesignation || member.designation;
            if (designationFilter !== "all" && designation !== designationFilter) return false;
            if (staffSearch) {
                const hay = `${member.name || ""} ${member.email || ""} ${member.phone || ""} ${member.organization || ""}`.toLowerCase();
                if (!hay.includes(staffSearch.toLowerCase())) return false;
            }
            return true;
        });
    }, [staff, designationFilter, staffSearch]);

    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                setLoadingRegistrations(true);
                const { data, error } = await supabase.from("registrations").select("*").order("created_at", { ascending: false });
                if (error) throw error;
                setRegistrations(data || []);
            } catch (err) {
                console.error("Error fetching registrations:", err);
                setErrorMsg("Failed to load registrations: " + err.message);
            } finally {
                setLoadingRegistrations(false);
            }
        };
        const fetchStaff = async () => {
            try {
                setLoadingStaff(true);
                const { data, error } = await supabase.from("staff_registrations").select("*").order("created_at", { ascending: false });
                if (error) throw error;
                setStaff(data || []);
            } catch (err) {
                console.error("Error fetching staff:", err);
                setErrorMsg("Failed to load staff registrations: " + err.message);
            } finally {
                setLoadingStaff(false);
            }
        };
        fetchRegistrations();
        fetchStaff();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!pendingEditId) return;
        const match = registrations.find((r) => r.id === pendingEditId);
        if (match) {
            setEditingRegistration(match);
            setShowEditModal(true);
            setPendingEditId(null);
        }
    }, [registrations, pendingEditId]);

    useEffect(() => {
        if (!pendingEditStaffId) return;
        const match = staff.find((s) => s.id === pendingEditStaffId);
        if (match) {
            setEditingStaff(match);
            setShowEditStaffModal(true);
            setPendingEditStaffId(null);
        }
    }, [staff, pendingEditStaffId]);

    const handleEdit = (reg) => {
        setEditingRegistration(reg);
        setShowEditModal(true);
    };

    const handleUpdate = async (updatedData) => {
        try {
            // Don't change id / house assignment / created_at here.
            const { id, house, color, createdAt, created_at, ...dataToUpdate } = updatedData;
            const { error } = await supabase.from("registrations").update(dataToUpdate).eq("id", editingRegistration.id);
            if (error) throw error;
            setRegistrations((prev) => prev.map((reg) => (reg.id === editingRegistration.id ? { ...reg, ...dataToUpdate } : reg)));
            setShowEditModal(false);
            setEditingRegistration(null);
            setErrorMsg("");
        } catch (err) {
            console.error("Error updating document:", err);
            setErrorMsg("Failed to update registration: " + err.message);
        }
    };

    const handleDelete = async (regId) => {
        if (!window.confirm("Are you sure you want to delete this registration? This action cannot be undone.")) return;
        try {
            const { error } = await supabase.from("registrations").delete().eq("id", regId);
            if (error) throw error;
            setRegistrations(registrations.filter((reg) => reg.id !== regId));
            setErrorMsg("");
        } catch (err) {
            console.error("Error deleting document:", err);
            setErrorMsg("Failed to delete registration: " + err.message);
        }
    };

    const handleEditStaff = (staffMember) => {
        setEditingStaff(staffMember);
        setShowEditStaffModal(true);
    };

    const handleUpdateStaff = async (updatedData) => {
        try {
            // eslint-disable-next-line no-unused-vars
            const { id, created_at, createdAt, submittedByUid, submittedByEmail, submittedByName, registrationType, ...dataToUpdate } = updatedData;
            if (dataToUpdate.designation === "Other") {
                dataToUpdate.finalDesignation = dataToUpdate.otherDesignation;
            } else {
                dataToUpdate.finalDesignation = dataToUpdate.designation;
                dataToUpdate.otherDesignation = "";
            }
            const { error } = await supabase.from("staff_registrations").update(dataToUpdate).eq("id", editingStaff.id);
            if (error) throw error;
            setStaff((prev) => prev.map((m) => (m.id === editingStaff.id ? { ...m, ...dataToUpdate } : m)));
            setShowEditStaffModal(false);
            setEditingStaff(null);
            setErrorMsg("");
        } catch (err) {
            console.error("Error updating staff:", err);
            setErrorMsg("Failed to update staff registration: " + err.message);
        }
    };

    const handleDeleteStaff = async (staffId, staffName) => {
        if (!window.confirm(`Are you sure you want to delete the registration for ${staffName}? This action cannot be undone.`)) return;
        try {
            const { error } = await supabase.from("staff_registrations").delete().eq("id", staffId);
            if (error) throw error;
            setStaff(staff.filter((m) => m.id !== staffId));
            setErrorMsg("");
        } catch (err) {
            console.error("Error deleting staff:", err);
            setErrorMsg("Failed to delete staff registration: " + err.message);
        }
    };

    const loading = activeTab === "staff" ? loadingStaff : loadingRegistrations;

    if (loading) {
        return (
            <AdminRoute>
                <LoadingScreen label={activeTab === "staff" ? "Loading staff registrations..." : "Loading registrations..."} />
            </AdminRoute>
        );
    }

    return (
        <AdminRoute>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-3 sm:p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Manage Registrations</h1>
                        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">View, filter, edit, and delete Participant and Staff registrations.</p>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                        <nav className="-mb-px flex space-x-6 sm:space-x-8 whitespace-nowrap">
                            <button onClick={() => switchTab("participants")}
                                className={`py-3 px-1 text-sm font-medium shrink-0 ${activeTab === "participants" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 border-b-2" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                                📋 Participants ({registrations.length})
                            </button>
                            <button onClick={() => switchTab("staff")}
                                className={`py-3 px-1 text-sm font-medium shrink-0 ${activeTab === "staff" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 border-b-2" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                                👥 Staff ({staff.length})
                            </button>
                        </nav>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
                            <p className="font-medium text-sm">Error:</p>
                            <p className="text-sm">{errorMsg}</p>
                        </div>
                    )}

                    {activeTab === "participants" ? (
                        <>
                            <div className="mb-4 flex flex-col sm:flex-row sm:justify-end gap-2">
                                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone, reg no..."
                                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white sm:w-64" />
                                <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                    <option value="all">All houses</option>
                                    {houses.map((h) => <option key={h.key} value={h.key} style={{ color: h.color, fontWeight: 600 }}>{h.name}</option>)}
                                </select>
                            </div>

                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl overflow-hidden">
                                {/* Desktop/tablet: table */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/60">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reg No</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Age / Sex</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Religion</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">House</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date Registered</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredRegistrations.map((reg) => (
                                                <tr key={reg.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-mono text-gray-500 dark:text-gray-400">{reg.reg_no || "—"}</div></td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{reg.name}</div></td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 dark:text-white">{reg.age}</div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{reg.sex}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{reg.religion}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {reg.phone && <div className="text-sm text-gray-900 dark:text-white">📞 {reg.phone}</div>}
                                                        {reg.email && <div className="text-sm text-gray-500 dark:text-gray-400">✉️ {reg.email}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><HouseBadge name={reg.house} color={reg.color} /></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "N/A"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button onClick={() => handleEdit(reg)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4">Edit</button>
                                                        <button onClick={() => handleDelete(reg.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile: stacked cards */}
                                <div className="sm:hidden p-3 space-y-3">
                                    {filteredRegistrations.map((reg) => (
                                        <MobileCardRow key={reg.id}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-gray-900 dark:text-white">{reg.name}</div>
                                                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400">{reg.reg_no || "—"}</div>
                                                </div>
                                                <HouseBadge name={reg.house} color={reg.color} />
                                            </div>
                                            <MobileCardField label="Age / Sex">{reg.age} · {reg.sex}</MobileCardField>
                                            <MobileCardField label="Religion">{reg.religion}</MobileCardField>
                                            <MobileCardField label="Contact">{reg.phone || reg.email}</MobileCardField>
                                            <MobileCardField label="Registered">{reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "N/A"}</MobileCardField>
                                            <MobileCardActions>
                                                <button onClick={() => handleEdit(reg)} className="text-indigo-600 dark:text-indigo-400">Edit</button>
                                                <button onClick={() => handleDelete(reg.id)} className="text-red-600 dark:text-red-400">Delete</button>
                                            </MobileCardActions>
                                        </MobileCardRow>
                                    ))}
                                </div>

                                {filteredRegistrations.length === 0 && (
                                    <div className="text-center py-12"><p className="text-gray-500 dark:text-gray-400">No registrations found.</p></div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-col sm:flex-row sm:justify-end gap-2">
                                <input type="text" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Search name, email, phone, org..."
                                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white sm:w-64" />
                                <select value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                    <option value="all">All designations</option>
                                    {DESIGNATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl overflow-hidden">
                                {/* Desktop/tablet: table */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/60">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staff Member</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Organization</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Designation</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date Registered</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredStaff.map((member) => (
                                                <tr key={member.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div></td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900 dark:text-white">📞 {member.phone}</div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">✉️ {member.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{member.organization}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Badge>{member.finalDesignation || member.designation}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {member.created_at ? new Date(member.created_at).toLocaleDateString() : "N/A"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button onClick={() => handleEditStaff(member)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4">Edit</button>
                                                        <button onClick={() => handleDeleteStaff(member.id, member.name)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile: stacked cards */}
                                <div className="sm:hidden p-3 space-y-3">
                                    {filteredStaff.map((member) => (
                                        <MobileCardRow key={member.id}>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-semibold text-gray-900 dark:text-white">{member.name}</span>
                                                <Badge>{member.finalDesignation || member.designation}</Badge>
                                            </div>
                                            <MobileCardField label="Organization">{member.organization}</MobileCardField>
                                            <MobileCardField label="Phone">{member.phone}</MobileCardField>
                                            <MobileCardField label="Email">{member.email}</MobileCardField>
                                            <MobileCardField label="Registered">{member.created_at ? new Date(member.created_at).toLocaleDateString() : "N/A"}</MobileCardField>
                                            <MobileCardActions>
                                                <button onClick={() => handleEditStaff(member)} className="text-indigo-600 dark:text-indigo-400">Edit</button>
                                                <button onClick={() => handleDeleteStaff(member.id, member.name)} className="text-red-600 dark:text-red-400">Delete</button>
                                            </MobileCardActions>
                                        </MobileCardRow>
                                    ))}
                                </div>

                                {filteredStaff.length === 0 && (
                                    <div className="text-center py-12"><p className="text-gray-500 dark:text-gray-400">No staff registrations found.</p></div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {showEditModal && editingRegistration && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-4 sm:p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Edit Registration</h2>
                                    <button onClick={() => { setShowEditModal(false); setEditingRegistration(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                                </div>
                                <EditForm registration={editingRegistration} onSave={handleUpdate} onCancel={() => { setShowEditModal(false); setEditingRegistration(null); }} />
                            </div>
                        </div>
                    </div>
                )}

                {showEditStaffModal && editingStaff && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-4 sm:p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Edit Staff Registration</h2>
                                    <button onClick={() => { setShowEditStaffModal(false); setEditingStaff(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                                </div>
                                <EditStaffForm staffMember={editingStaff} onSave={handleUpdateStaff} onCancel={() => { setShowEditStaffModal(false); setEditingStaff(null); }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminRoute>
    );
}

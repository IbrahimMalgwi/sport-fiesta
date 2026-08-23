"use client";
// app/(member)/staff-registration/page.jsx — ported from src/pages/StaffRegistration.jsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import useConfig from "@/hooks/useConfig";
import { resolveHouses, isPastCutoff } from "@/utils/config";
import { HOUSE_KEYS } from "@/utils/houseMapping";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const DESIGNATION_OPTIONS = ["Counselor/Marshal", "Medic", "Media", "Sound", "Welfare", "Data", "Security", "Other"];
const HOUSE_ASSIGNED_DESIGNATION = "Counselor/Marshal";

export default function StaffRegistration() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const { config } = useConfig();

    useEffect(() => {
        if (!currentUser) router.replace("/login");
    }, [currentUser, router]);

    const [formData, setFormData] = useState({ name: "", phone: "", email: "", organization: "", designation: "", otherDesignation: "" });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [houseCounts, setHouseCounts] = useState({});

    const houses = resolveHouses(config);

    // Counselors/Marshals are balanced across houses independently of
    // participants, so only tally other Counselor/Marshal registrants.
    useEffect(() => {
        let isMounted = true;
        async function fetchHouseCounts() {
            try {
                const { data, error } = await supabase
                    .from("staff_registrations")
                    .select("houseKey")
                    .eq("designation", HOUSE_ASSIGNED_DESIGNATION);
                if (error) throw error;
                if (!isMounted) return;

                const counts = {};
                HOUSE_KEYS.forEach((key) => { counts[key] = 0; });
                (data || []).forEach((row) => {
                    if (row.houseKey && counts.hasOwnProperty(row.houseKey)) counts[row.houseKey]++;
                });
                setHouseCounts(counts);
            } catch (err) {
                console.error("Error fetching staff house counts:", err);
            }
        }
        fetchHouseCounts();
        return () => { isMounted = false; };
    }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

    // Balanced min-count house assignment — same approach as participant
    // registration (utils shared indirectly since the pool differs).
    const assignHouse = () => {
        if (Object.keys(houseCounts).length === 0) {
            return houses[Math.floor(Math.random() * houses.length)];
        }
        let minCount = Infinity;
        let candidateHouses = [];
        houses.forEach((house) => {
            const count = houseCounts[house.key] || 0;
            if (count < minCount) { minCount = count; candidateHouses = [house]; }
            else if (count === minCount) candidateHouses.push(house);
        });
        return candidateHouses[Math.floor(Math.random() * candidateHouses.length)];
    };

    useEffect(() => {
        const savedDraft = localStorage.getItem("staffRegistrationDraft");
        if (savedDraft) setFormData((prev) => ({ ...prev, ...JSON.parse(savedDraft) }));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (Object.keys(formData).some((key) => formData[key] !== "" && formData[key] !== [])) {
                localStorage.setItem("staffRegistrationDraft", JSON.stringify(formData));
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [formData]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !loading) {
                e.preventDefault();
                const form = document.querySelector("form");
                if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
            }
            if (e.key === "Escape" && success) setSuccess(null);
        };
        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [success, loading]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
        else if (!/^\d{10,15}$/.test(formData.phone)) newErrors.phone = "Please enter a valid phone number (10-15 digits)";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Please enter a valid email address";
        if (!formData.organization.trim()) newErrors.organization = "Organization is required";
        if (!formData.designation) newErrors.designation = "Please select a designation";
        else if (formData.designation === "Other" && !formData.otherDesignation.trim()) newErrors.otherDesignation = "Please specify your designation";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (!currentUser) {
            setErrors({ submit: "Please log in to submit a staff registration." });
            return;
        }
        if (!validateForm()) {
            setTouched({ name: true, phone: true, email: true, organization: true, designation: true, otherDesignation: true });
            return;
        }
        setLoading(true);
        try {
            const getsHouse = formData.designation === HOUSE_ASSIGNED_DESIGNATION;
            const past = isPastCutoff(config);
            const house = getsHouse && !past ? assignHouse() : null;

            const { error } = await supabase.from("staff_registrations").insert({
                ...formData,
                finalDesignation: formData.designation === "Other" ? formData.otherDesignation : formData.designation,
                registrationType: "staff",
                submittedByUid: currentUser.uid,
                submittedByEmail: currentUser.email,
                submittedByName: currentUser.displayName || "Unknown",
                houseKey: house ? house.key : null,
                house: house ? house.name : null,
                color: house ? house.color : null,
                assigned: !!house,
            });
            if (error) throw error;
            setSuccess({
                name: formData.name,
                designation: formData.designation === "Other" ? formData.otherDesignation : formData.designation,
                house: house ? house.name : null,
                houseColor: house ? house.color : null,
                housePending: getsHouse && past,
            });
            handleReset();
            setErrors({});
        } catch (error) {
            console.error("Error submitting staff registration:", error);
            setErrors({ submit: "Failed to submit registration. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
        if (field === "designation" && value !== "Other") setFormData((prev) => ({ ...prev, otherDesignation: "" }));
    };

    const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

    const handleReset = () => {
        setFormData({ name: "", phone: "", email: "", organization: "", designation: "", otherDesignation: "" });
        setErrors({});
        setTouched({});
        localStorage.removeItem("staffRegistrationDraft");
    };

    const calculateProgress = () => {
        const requiredFields = ["name", "phone", "email", "organization", "designation"];
        const completed = requiredFields.filter((field) => {
            if (field === "designation" && formData.designation === "Other") return formData.otherDesignation.trim();
            return formData[field];
        }).length;
        return (completed / requiredFields.length) * 100;
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-6 sm:py-8 px-3 sm:px-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Staff Registration</h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Register as Counselor, Marshal, or Support Staff</p>
                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Form Progress</span>
                                    <span className="text-sm text-gray-500">{Math.round(calculateProgress())}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${calculateProgress()}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {errors.submit && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">{errors.submit}</div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Field label="Full Name" required error={touched.name && errors.name}>
                                <Input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} onBlur={() => handleBlur("name")}
                                    error={touched.name && errors.name} placeholder="Enter full name" />
                            </Field>
                            <Field label="Phone Number" required error={touched.phone && errors.phone}>
                                <Input type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")}
                                    error={touched.phone && errors.phone} placeholder="Enter phone number" />
                            </Field>
                            <Field label="Email Address" required error={touched.email && errors.email}>
                                <Input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")}
                                    error={touched.email && errors.email} placeholder="Enter email address" />
                            </Field>
                            <Field label="Organization" required error={touched.organization && errors.organization}>
                                <Input type="text" value={formData.organization} onChange={(e) => handleChange("organization", e.target.value)} onBlur={() => handleBlur("organization")}
                                    error={touched.organization && errors.organization} placeholder="Enter organization name" />
                            </Field>
                            <Field label="Designation" required error={touched.designation && errors.designation}>
                                <Select value={formData.designation} onChange={(e) => handleChange("designation", e.target.value)} onBlur={() => handleBlur("designation")}
                                    error={touched.designation && errors.designation}>
                                    <option value="">Select Designation</option>
                                    {DESIGNATION_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}
                                </Select>
                            </Field>
                            {formData.designation === "Other" && (
                                <Field label="Specify Designation" required error={touched.otherDesignation && errors.otherDesignation}>
                                    <Input type="text" value={formData.otherDesignation} onChange={(e) => handleChange("otherDesignation", e.target.value)} onBlur={() => handleBlur("otherDesignation")}
                                        error={touched.otherDesignation && errors.otherDesignation} placeholder="Enter your designation" />
                                </Field>
                            )}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={handleReset} disabled={loading} fullWidth>Clear Form</Button>
                                <Button type="submit" disabled={loading} fullWidth size="lg">
                                    {loading ? "Registering..." : "Register Now"}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center hidden sm:block">
                                Pro tip: Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to submit
                            </p>
                        </form>
                    </CardContent>
                </Card>

                {success && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center max-w-sm w-full max-h-[90vh] overflow-y-auto animate-pop-in" style={{ borderTop: "8px solid #4f46e5" }}>
                            <div className="mb-4">
                                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: "#4f46e520" }}>
                                    <svg className="w-8 h-8" style={{ color: "#4f46e5" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">Registration Successful!</h3>
                            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                <strong className="text-gray-800 dark:text-white">{success.name}</strong> has been registered as
                            </p>
                            <div className="my-4 py-2 px-4 rounded-lg inline-block" style={{ backgroundColor: "#4f46e520" }}>
                                <span className="font-bold text-lg" style={{ color: "#4f46e5" }}>{success.designation}</span>
                            </div>
                            {success.house && (
                                <div className="my-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Assigned to</p>
                                    <div className="py-2 px-4 rounded-lg inline-block" style={{ backgroundColor: `${success.houseColor}20` }}>
                                        <span className="font-bold text-lg" style={{ color: success.houseColor }}>{success.house}</span>
                                    </div>
                                </div>
                            )}
                            {success.housePending && (
                                <div className="my-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                                    House assignment is closed (registration cutoff passed), so no house was assigned.
                                </div>
                            )}
                            <Button onClick={() => setSuccess(null)} className="mt-4">Continue</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

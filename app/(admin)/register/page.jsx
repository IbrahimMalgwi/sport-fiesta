"use client";
// app/(admin)/register/page.jsx — ported from src/pages/RegistrationForm.jsx.
// Firestore -> Supabase; the balanced min-count house assignment is unchanged.
import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import useConfig from "@/hooks/useConfig";
import { resolveHouses, isPastCutoff } from "@/utils/config";
import { getHouseKeyByName, HOUSE_KEYS } from "@/utils/houseMapping";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export default function RegistrationForm() {
    const { config } = useConfig();
    const supabase = createClient();

    const houses = resolveHouses(config);
    const currentEdition = config.currentEdition;
    const previousEditions = config.previousEditions.map((v) => ({
        value: v,
        label: `Sports Fiesta ${v}`,
    }));

    // This form only ever registers Participants (teens) — Marshals/Counselors/
    // support staff register separately via /staff-registration and are never
    // assigned a house. Keeping a role picker here previously let someone be
    // recorded as "Marshal"/"Counselor" in this table and still get a house.
    const [formData, setFormData] = useState({
        name: "", age: "", sex: "", religion: "",
        phone: "", email: "", fiestaAttendance: [],
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [houseCounts, setHouseCounts] = useState({});
    const [duplicateFound, setDuplicateFound] = useState(null);
    const [existingRegistrations, setExistingRegistrations] = useState([]);

    // Load draft from localStorage on component mount
    useEffect(() => {
        const savedDraft = localStorage.getItem("registrationDraft");
        if (savedDraft) {
            setFormData((prev) => ({ ...prev, ...JSON.parse(savedDraft) }));
        }
    }, []);

    // Auto-save draft
    useEffect(() => {
        const timer = setTimeout(() => {
            if (Object.keys(formData).some((key) => formData[key] !== "" && formData[key] !== [])) {
                localStorage.setItem("registrationDraft", JSON.stringify(formData));
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [formData]);

    // Fetch current house counts from Supabase
    useEffect(() => {
        let isMounted = true;
        async function fetchHouseCounts() {
            try {
                const { data, error } = await supabase
                    .from("registrations")
                    .select("houseKey, house");
                if (error) throw error;
                if (!isMounted) return;

                const counts = {};
                HOUSE_KEYS.forEach((key) => { counts[key] = 0; });
                (data || []).forEach((row) => {
                    const houseKey = row.houseKey || getHouseKeyByName(row.house);
                    if (houseKey && counts.hasOwnProperty(houseKey)) counts[houseKey]++;
                });
                setHouseCounts(counts);
            } catch (err) {
                console.error("Error fetching house counts:", err);
            }
        }
        fetchHouseCounts();
        return () => { isMounted = false; };
    }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !loading) {
                e.preventDefault();
                const form = document.querySelector("form");
                if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
            }
            if (e.key === "Escape" && success) setSuccess(null);
            if (e.key === "Escape" && duplicateFound) handleCancelRegistration();
        };
        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [success, duplicateFound, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // Check for duplicate registrations (case-insensitive name + age + sex)
    const checkForDuplicates = async (name, age, sex) => {
        try {
            const { data, error } = await supabase
                .from("registrations")
                .select("*")
                .ilike("name", name.trim())
                .eq("age", age)
                .eq("sex", sex);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error checking for duplicates:", error);
            return [];
        }
    };

    const debouncedDuplicateCheck = debounce(async (name, age, sex) => {
        if (name && age && sex) {
            const duplicates = await checkForDuplicates(name, age, sex);
            if (duplicates.length > 0) console.log("Potential duplicates found:", duplicates.length);
        }
    }, 1000);

    // Smart house assignment — balanced min-count (unchanged)
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

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.age) newErrors.age = "Age is required";
        else if (formData.age < 1 || formData.age > 100) newErrors.age = "Please enter a valid age (1-100)";
        if (!formData.sex) newErrors.sex = "Please select a gender";
        if (!formData.religion) newErrors.religion = "Please select a religion";
        if (formData.phone && !/^\d{10,15}$/.test(formData.phone)) newErrors.phone = "Please enter a valid phone number";
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Please enter a valid email address";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFiestaAttendanceChange = (edition) => {
        setFormData((prev) => {
            if (prev.fiestaAttendance.includes(edition)) {
                return { ...prev, fiestaAttendance: prev.fiestaAttendance.filter((i) => i !== edition) };
            }
            return { ...prev, fiestaAttendance: [...prev.fiestaAttendance, edition] };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (!validateForm()) {
            setTouched({ name: true, age: true, sex: true, religion: true, phone: true, email: true });
            return;
        }
        setLoading(true);
        setSubmitError("");
        try {
            const duplicates = await checkForDuplicates(formData.name, formData.age, formData.sex);
            if (duplicates.length > 0) {
                setExistingRegistrations(duplicates);
                setDuplicateFound({ name: formData.name, age: formData.age, sex: formData.sex, count: duplicates.length });
                setLoading(false);
                return;
            }
            await completeRegistration();
        } catch (err) {
            console.error("Error during registration:", err);
            setSubmitError(err.message || "Something went wrong. Please check your Supabase configuration.");
            setLoading(false);
        }
    };

    const completeRegistration = async () => {
        try {
            // Registration stays open indefinitely, but once the admin-set
            // cutoff passes, new registrants are recorded WITHOUT a house.
            const past = isPastCutoff(config);
            const house = past ? null : assignHouse();

            const { data: inserted, error } = await supabase.from("registrations").insert({
                ...formData,
                houseKey: house ? house.key : null,
                house: house ? house.name : null,
                color: house ? house.color : null,
                assigned: !!house,
                edition: currentEdition,
                fiestaAttendance: Array.isArray(formData.fiestaAttendance)
                    ? [...formData.fiestaAttendance, currentEdition]
                    : [currentEdition],
            }).select("reg_no").single();
            if (error) throw error;

            setSuccess({
                assigned: !!house,
                name: house ? house.name : null,
                color: house ? house.color : "#6b7280",
                participant: formData.name,
                regNo: inserted?.reg_no || null,
            });
            handleReset();
            setErrors({});
        } catch (err) {
            console.error("Supabase Error: ", err);
            setSubmitError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleContinueRegistration = () => {
        setDuplicateFound(null);
        setExistingRegistrations([]);
        completeRegistration();
    };

    const handleCancelRegistration = () => {
        setDuplicateFound(null);
        setExistingRegistrations([]);
        setLoading(false);
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
        if (field === "name" || field === "age" || field === "sex") {
            debouncedDuplicateCheck(
                field === "name" ? value : formData.name,
                field === "age" ? value : formData.age,
                field === "sex" ? value : formData.sex
            );
        }
    };

    const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

    const handleReset = () => {
        setFormData({
            name: "", age: "", sex: "", religion: "",
            phone: "", email: "", fiestaAttendance: [],
        });
        setErrors({});
        setTouched({});
        localStorage.removeItem("registrationDraft");
    };

    const calculateProgress = () => {
        const requiredFields = ["name", "age", "sex", "religion"];
        const completed = requiredFields.filter((field) => formData[field]).length;
        return (completed / requiredFields.length) * 100;
    };

    return (
        <div className="flex items-center justify-center py-6 sm:py-8 px-3 sm:px-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Participant Registration</h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Join the exciting teen program!</p>

                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Form Progress</span>
                                    <span className="text-sm text-gray-500">{Math.round(calculateProgress())}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${calculateProgress()}%` }}></div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                {houses.map((house) => (
                                    <div key={house.key} className="flex items-center justify-center p-2 rounded-md"
                                        style={{ backgroundColor: `${house.color}20`, borderLeft: `3px solid ${house.color}` }}>
                                        <span className="font-medium truncate" style={{ color: house.color }}>
                                            {house.shortName}: {houseCounts.hasOwnProperty(house.key) ? houseCounts[house.key] : 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {submitError && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                                <p className="font-medium text-sm">Error:</p>
                                <p className="text-sm">{submitError}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Field label="Full Name" required error={touched.name && errors.name}>
                                <Input type="text" placeholder="Enter full name" value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)} onBlur={() => handleBlur("name")}
                                    error={touched.name && errors.name}
                                    required aria-label="Full Name" aria-required="true" aria-invalid={!!errors.name} />
                            </Field>

                            <Field label="Age" required error={touched.age && errors.age}>
                                <Input type="number" placeholder="Enter age" value={formData.age}
                                    onChange={(e) => handleChange("age", e.target.value)} onBlur={() => handleBlur("age")} min="1" max="100"
                                    error={touched.age && errors.age}
                                    required aria-label="Age" aria-required="true" aria-invalid={!!errors.age} />
                            </Field>

                            <Field label="Sex" required error={touched.sex && errors.sex}>
                                <Select value={formData.sex} onChange={(e) => handleChange("sex", e.target.value)} onBlur={() => handleBlur("sex")}
                                    error={touched.sex && errors.sex}
                                    required aria-label="Gender" aria-required="true" aria-invalid={!!errors.sex}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Others">Others</option>
                                </Select>
                            </Field>

                            <Field label="Religion" required error={touched.religion && errors.religion}>
                                <Select value={formData.religion} onChange={(e) => handleChange("religion", e.target.value)} onBlur={() => handleBlur("religion")}
                                    error={touched.religion && errors.religion}
                                    required aria-label="Religion" aria-required="true" aria-invalid={!!errors.religion}>
                                    <option value="">Select Religion</option>
                                    <option value="Christianity">Christianity</option>
                                    <option value="Islam">Islam</option>
                                    <option value="Others">Others</option>
                                </Select>
                            </Field>

                            <Field label="Phone (Optional)" error={touched.phone && errors.phone}>
                                <Input type="tel" placeholder="Enter phone number" value={formData.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")}
                                    error={touched.phone && errors.phone}
                                    aria-label="Phone Number" aria-invalid={!!errors.phone} />
                            </Field>

                            <Field label="Email (Optional)" error={touched.email && errors.email}>
                                <Input type="email" placeholder="Enter email address" value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")}
                                    error={touched.email && errors.email}
                                    aria-label="Email Address" aria-invalid={!!errors.email} />
                            </Field>

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">Sports Fiesta Attendance</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                    Which of the previous Sports Fiestas have you attended? (Select one, many, or none)
                                </p>
                                <div className="space-y-2">
                                    {previousEditions.map((edition) => (
                                        <div key={edition.value} className="flex items-center">
                                            <input type="checkbox" id={`fiesta-${edition.value}`}
                                                checked={formData.fiestaAttendance.includes(edition.value)}
                                                onChange={() => handleFiestaAttendanceChange(edition.value)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                                aria-label={`Attended ${edition.label}`} />
                                            <label htmlFor={`fiesta-${edition.value}`} className="ml-2 block text-sm text-gray-900 dark:text-white">{edition.label}</label>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Note: Your attendance for Sports Fiesta {currentEdition} will be automatically recorded.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={handleReset} disabled={loading} fullWidth>
                                    Clear Form
                                </Button>
                                <Button type="submit" disabled={loading} fullWidth size="lg">
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Registering...
                                        </span>
                                    ) : "Register Now"}
                                </Button>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center hidden sm:block">
                                Pro tip: Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to submit
                            </p>
                        </form>
                    </CardContent>
                </Card>

                {/* Success Modal */}
                {success && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center max-w-sm w-full max-h-[90vh] overflow-y-auto animate-pop-in" style={{ borderTop: `8px solid ${success.color}` }}>
                            <div className="mb-4">
                                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: `${success.color}20` }}>
                                    <svg className="w-8 h-8" style={{ color: success.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">Registration Successful!</h3>
                            {success.regNo && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Registration No: <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{success.regNo}</span>
                                </p>
                            )}
                            {success.assigned ? (
                                <>
                                    <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                        <strong className="text-gray-800 dark:text-white">{success.participant}</strong> has been assigned to
                                    </p>
                                    <div className="my-4 py-2 px-4 rounded-lg inline-block" style={{ backgroundColor: `${success.color}20` }}>
                                        <span className="font-bold text-lg" style={{ color: success.color }}>{success.name}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="my-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                                    <strong className="text-gray-800 dark:text-white">{success.participant}</strong> has been recorded.
                                    House assignment is closed (registration cutoff passed), so no house was assigned.
                                </div>
                            )}
                            <Button onClick={() => setSuccess(null)} className="mt-4">Continue</Button>
                        </div>
                    </div>
                )}

                {/* Duplicate Warning Modal */}
                {duplicateFound && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center max-w-md w-full max-h-[90vh] overflow-y-auto animate-pop-in">
                            <div className="mb-4">
                                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30">
                                    <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">Potential Duplicate Found!</h3>
                            <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                We found <strong>{duplicateFound.count}</strong> existing registration(s) for:
                            </p>
                            <div className="my-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <p className="font-medium text-gray-800 dark:text-white">
                                    {duplicateFound.name}, {duplicateFound.age} years, {duplicateFound.sex}
                                </p>
                            </div>
                            {existingRegistrations.length > 0 && (
                                <div className="my-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-left max-h-40 overflow-y-auto">
                                    <p className="font-medium text-sm mb-2 text-gray-800 dark:text-white">Existing registrations:</p>
                                    {existingRegistrations.map((reg, index) => (
                                        <div key={index} className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                            • {reg.house} House - {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "Unknown date"}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Are you sure you want to register this person again?</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button variant="secondary" onClick={handleCancelRegistration}>Cancel</Button>
                                <Button className="bg-yellow-500 hover:bg-yellow-600" onClick={handleContinueRegistration}>Register Anyway</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

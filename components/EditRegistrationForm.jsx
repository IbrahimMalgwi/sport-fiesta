"use client";
// components/EditRegistrationForm.jsx (pure form; onSave supplied by parent)
import React, { useState } from "react";
import useConfig from "@/hooks/useConfig";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function EditRegistrationForm({ registration, onSave, onCancel }) {
    const { config } = useConfig();
    const currentEdition = config.currentEdition;
    const previousEditions = config.previousEditions.map((v) => ({
        value: v,
        label: `Sports Fiesta ${v}`,
    }));

    const [formData, setFormData] = useState({
        name: registration.name || "",
        age: registration.age || "",
        sex: registration.sex || "",
        religion: registration.religion || "",
        phone: registration.phone || "",
        email: registration.email || "",
        fiestaAttendance: registration.fiestaAttendance
            ? registration.fiestaAttendance.filter((edition) => edition !== currentEdition)
            : [],
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.age) newErrors.age = "Age is required";
        if (!formData.sex) newErrors.sex = "Please select a gender";
        if (!formData.religion) newErrors.religion = "Please select a religion";
        if (formData.phone && !/^\d{10,15}$/.test(formData.phone)) {
            newErrors.phone = "Please enter a valid phone number";
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFiestaAttendanceChange = (edition) => {
        setFormData((prev) => {
            if (prev.fiestaAttendance.includes(edition)) {
                return { ...prev, fiestaAttendance: prev.fiestaAttendance.filter((item) => item !== edition) };
            }
            return { ...prev, fiestaAttendance: [...prev.fiestaAttendance, edition] };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (!validateForm()) return;
        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                fiestaAttendance: Array.isArray(formData.fiestaAttendance)
                    ? [...formData.fiestaAttendance, currentEdition]
                    : [currentEdition],
            };
            await onSave(dataToSave);
        } catch (err) {
            console.error("Error during update:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) setErrors({ ...errors, [field]: "" });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned House:</p>
                <div className="flex items-center mt-1">
                    <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: registration.color }}></div>
                    <span className="font-semibold" style={{ color: registration.color }}>{registration.house}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The house assignment cannot be changed here.</p>
            </div>

            <Field label="Full Name" required error={errors.name}>
                <Input type="text" placeholder="Enter full name" value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)} error={errors.name} required />
            </Field>

            <Field label="Age" required error={errors.age}>
                <Input type="number" placeholder="Enter age" value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)} error={errors.age} required />
            </Field>

            <Field label="Sex" required error={errors.sex}>
                <Select value={formData.sex} onChange={(e) => handleChange("sex", e.target.value)} error={errors.sex} required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Others">Others</option>
                </Select>
            </Field>

            <Field label="Religion" required error={errors.religion}>
                <Select value={formData.religion} onChange={(e) => handleChange("religion", e.target.value)} error={errors.religion} required>
                    <option value="">Select Religion</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Islam">Islam</option>
                    <option value="Others">Others</option>
                </Select>
            </Field>

            <Field label="Phone (Optional)" error={errors.phone}>
                <Input type="tel" placeholder="Enter phone number" value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)} error={errors.phone} />
            </Field>

            <Field label="Email (Optional)" error={errors.email}>
                <Input type="email" placeholder="Enter email address" value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)} error={errors.email} />
            </Field>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">Sports Fiesta Attendance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Which of the previous Sports Fiestas have you attended? (Select one, many, or none)</p>
                <div className="space-y-2">
                    {previousEditions.map((edition) => (
                        <div key={edition.value} className="flex items-center">
                            <input type="checkbox" id={`edit-fiesta-${edition.value}`}
                                checked={formData.fiestaAttendance.includes(edition.value)}
                                onChange={() => handleFiestaAttendanceChange(edition.value)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700" />
                            <label htmlFor={`edit-fiesta-${edition.value}`} className="ml-2 block text-sm text-gray-900 dark:text-white">{edition.label}</label>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Note: Attendance for Sports Fiesta {currentEdition} is already recorded.</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
            </div>
        </form>
    );
}

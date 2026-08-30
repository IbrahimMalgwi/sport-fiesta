"use client";
// components/EditStaffForm.jsx (pure form; onSave supplied by parent)
import React, { useState } from "react";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";


export default function EditStaffForm({ staffMember, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        name: staffMember.name || "",
        phone: staffMember.phone || "",
        email: staffMember.email || "",
        organization: staffMember.organization || "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
        else if (!/^\d{10,15}$/.test(formData.phone)) newErrors.phone = "Please enter a valid phone number";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Please enter a valid email address";
        if (!formData.organization.trim()) newErrors.organization = "Organization is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (!validateForm()) return;
        setLoading(true);
        try {
            await onSave(formData);
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
            <Field label="Full Name" required error={errors.name}>
                <Input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} error={errors.name} placeholder="Enter full name" />
            </Field>

            <Field label="Phone Number" required error={errors.phone}>
                <Input type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} error={errors.phone} placeholder="Enter phone number" />
            </Field>

            <Field label="Email Address" required error={errors.email}>
                <Input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} error={errors.email} placeholder="Enter email address" />
            </Field>

            <Field label="Organization" required error={errors.organization}>
                <Input type="text" value={formData.organization} onChange={(e) => handleChange("organization", e.target.value)} error={errors.organization} placeholder="Enter organization name" />
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
            </div>
        </form>
    );
}

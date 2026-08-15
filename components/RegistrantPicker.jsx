"use client";
// components/RegistrantPicker.jsx
// A searchable picker that links to an existing registration so operational
// modules (results/injuries/decisions) never re-collect a person's details.
// Calls onSelect with the full registration object (or null when cleared).
import React, { useMemo } from "react";
import { registrantName } from "@/hooks/useRegistrations";
import { Field, Input } from "@/components/ui/Field";

export default function RegistrantPicker({
    registrations,
    value,
    onSelect,
    label = "Participant",
    required = false,
    roleFilter = null,
    placeholder = "Type a name...",
    // Escape hatch for picking from a different list (e.g. staff_registrations)
    // instead of the participants list — pass `items` + `getLabel` together.
    items = null,
    getLabel = null,
}) {
    const listId = useMemo(
        () => `registrants-${Math.random().toString(36).slice(2)}`,
        []
    );

    const labelFor = getLabel || ((r) => `${registrantName(r)} — ${r.house || "No house"}`);

    const options = useMemo(() => {
        if (items) return items;
        const rows = roleFilter
            ? registrations.filter((r) => r.role === roleFilter)
            : registrations;
        return rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, registrations, roleFilter]);

    const handleChange = (e) => {
        const text = e.target.value;
        const match = options.find((r) => labelFor(r) === text);
        onSelect(match || null, text);
    };

    return (
        <Field label={label} required={required}>
            <Input
                type="text"
                list={listId}
                value={value || ""}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={label}
                required={required}
            />
            <datalist id={listId}>
                {options.map((r) => (
                    <option key={r.id} value={labelFor(r)} />
                ))}
            </datalist>
        </Field>
    );
}

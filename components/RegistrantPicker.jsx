"use client";
// components/RegistrantPicker.jsx
// A searchable picker that links to an existing registration so operational
// modules (results/injuries/decisions) never re-collect a person's details.
// Calls onSelect with the full registration object (or null when cleared).
//
// This used to be a plain <input list="..."> backed by a native <datalist>.
// That's unreliable on mobile: iOS Safari never renders datalist suggestions
// at all, and Android Chrome's version is inconsistent and easy to mis-tap.
// It's replaced here with a small custom combobox (filtered dropdown list)
// that behaves the same on every device.
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { registrantName } from "@/hooks/useRegistrations";
import { Field, Input } from "@/components/ui/Field";

const MAX_RESULTS = 8;

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
    const reactId = useId();
    const listboxId = `registrants-listbox-${reactId}`;
    const rootRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const labelFor = getLabel || ((r) => `${registrantName(r)} — ${r.house || "No house"}`);

    const options = useMemo(() => {
        if (items) return items;
        return roleFilter ? registrations.filter((r) => r.role === roleFilter) : registrations;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, registrations, roleFilter]);

    const query = (value || "").trim().toLowerCase();
    const matches = useMemo(() => {
        const pool = query ? options.filter((r) => labelFor(r).toLowerCase().includes(query)) : options;
        return pool.slice(0, MAX_RESULTS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options, query]);

    // Close on any tap/click outside the widget — more reliable than relying
    // on input blur alone, since a blur can race a touch tap on mobile.
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("touchstart", handler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("touchstart", handler);
        };
    }, [open]);

    const pick = (option) => {
        onSelect(option, labelFor(option));
        setOpen(false);
        setActiveIndex(-1);
    };

    const clear = () => {
        onSelect(null, "");
        setActiveIndex(-1);
    };

    const handleChange = (e) => {
        onSelect(null, e.target.value);
        setOpen(true);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (!open) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") setOpen(true);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            if (activeIndex >= 0 && matches[activeIndex]) {
                e.preventDefault();
                pick(matches[activeIndex]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <Field label={label} required={required}>
            <div ref={rootRef} className="relative">
                <div className="relative">
                    <Input
                        type="text"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        autoComplete="off"
                        value={value || ""}
                        onChange={handleChange}
                        onFocus={() => setOpen(true)}
                        onBlur={(e) => {
                            if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        aria-label={label}
                        required={required}
                        className={value ? "pr-9" : ""}
                    />
                    {value && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={clear}
                            aria-label="Clear"
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {open && (
                    <ul
                        id={listboxId}
                        role="listbox"
                        className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1"
                    >
                        {matches.length === 0 ? (
                            <li className="px-4 py-3 text-base text-gray-500 dark:text-gray-400">
                                {query ? "No matches" : "No options"}
                            </li>
                        ) : (
                            matches.map((option, i) => (
                                <li
                                    key={option.id}
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    // onMouseDown (not onClick), with preventDefault, fires before the
                                    // input would blur — this keeps focus in place so the pick isn't
                                    // lost to a blur/outside-click race, on mouse or touch alike.
                                    onMouseDown={(e) => { e.preventDefault(); pick(option); }}
                                    className={`px-4 py-3 text-base cursor-pointer ${
                                        i === activeIndex ? "bg-indigo-50 dark:bg-indigo-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {labelFor(option)}
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>
        </Field>
    );
}

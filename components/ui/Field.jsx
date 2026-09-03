"use client";
// components/ui/Field.jsx
// Consistent form-field primitives: every page previously hand-wrote the same
// "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2
// focus:ring-indigo-400 dark:bg-gray-700 dark:text-white" string (with small,
// meaningless drift between pages: py-2 vs py-3, focus:ring-2 vs
// focus:ring-indigo-500, etc). These centralize it. Label/error handling is
// bundled into <Field> so call sites stop repeating that markup too.
import React from "react";

// text-base (16px) at every breakpoint, not just sm: — anything smaller makes
// iOS Safari auto-zoom the page when the field is focused, which is jarring
// on mobile and was leaving every form (not just search) feeling broken.
const inputBase =
    "w-full px-4 py-2.5 border rounded-lg text-base transition-colors " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

function inputCls(hasError, className = "") {
    return `${inputBase} ${hasError ? "border-red-500" : "border-gray-300 dark:border-gray-600"} ${className}`;
}

export function Field({ label, required, error, hint, htmlFor, children }) {
    return (
        <div>
            {label && (
                <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}{required && " *"}
                </label>
            )}
            {children}
            {error ? (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
            ) : null}
        </div>
    );
}

export const Input = React.forwardRef(function Input({ error, className = "", ...props }, ref) {
    return <input ref={ref} className={inputCls(error, className)} {...props} />;
});

export const Select = React.forwardRef(function Select({ error, className = "", children, ...props }, ref) {
    return (
        <select ref={ref} className={inputCls(error, className)} {...props}>
            {children}
        </select>
    );
});

export const Textarea = React.forwardRef(function Textarea({ error, className = "", ...props }, ref) {
    return <textarea ref={ref} className={inputCls(error, className)} {...props} />;
});

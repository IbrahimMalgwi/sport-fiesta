// components/ui/Button.jsx
// Shared button styles so every page stops hand-rolling its own variant.
// Variants: primary (brand indigo), secondary (outline), danger, ghost.
// Sizes: sm, md (default), lg. Renders a <button> unless `as="a"`/`href` is
// passed via Next's <Link>, in which case the caller should use LinkButton.
import React from "react";
import Link from "next/link";

const VARIANTS = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:bg-gray-400",
    secondary: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-gray-400",
    ghost: "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30",
};

const SIZES = {
    sm: "px-3 py-1.5 text-xs sm:text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm sm:text-base",
};

const BASE = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60";

export default function Button({ variant = "primary", size = "md", className = "", fullWidth = false, ...props }) {
    const cls = `${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${fullWidth ? "w-full" : ""} ${className}`;
    return <button className={cls} {...props} />;
}

export function LinkButton({ href, variant = "primary", size = "md", className = "", fullWidth = false, ...props }) {
    const cls = `${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${fullWidth ? "w-full" : ""} ${className}`;
    return <Link href={href} className={cls} {...props} />;
}

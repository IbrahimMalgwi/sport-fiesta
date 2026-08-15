// components/ui/Badge.jsx
// Generic pill badge + a HouseBadge specialization that always renders the
// house's brand color inline (never a competing static color), so every
// place a house shows up — tables, filters, cards — looks the same.
export function Badge({ children, color, className = "" }) {
    if (color) {
        return (
            <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap ${className}`}
                style={{ backgroundColor: color }}
            >
                {children}
            </span>
        );
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 whitespace-nowrap ${className}`}>
            {children}
        </span>
    );
}

export function HouseBadge({ name, color, className = "" }) {
    if (!name) {
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap ${className}`}>
                Unassigned
            </span>
        );
    }
    return <Badge color={color || "#6b7280"} className={className}>{name}</Badge>;
}

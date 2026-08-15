// components/ui/MobileCardList.jsx
// The mobile-side of the "table on desktop, stacked cards on mobile" pattern
// used across every admin/data-table page. Pair with a `<div className="hidden
// sm:block overflow-x-auto">` wrapping the real <table>, and
// `<div className="sm:hidden space-y-3">` wrapping a .map() of MobileCardRow.
export function MobileCardRow({ children, className = "" }) {
    return (
        <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

export function MobileCardField({ label, children }) {
    if (children == null || children === "") return null;
    return (
        <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
            <span className="text-gray-900 dark:text-white text-right break-words">{children}</span>
        </div>
    );
}

export function MobileCardActions({ children }) {
    return (
        <div className="flex gap-4 pt-2 mt-1 border-t border-gray-100 dark:border-gray-700 text-sm font-medium">
            {children}
        </div>
    );
}

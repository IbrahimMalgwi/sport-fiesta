// components/ui/Card.jsx
// Shared card surface: white/gray-800 bg, consistent radius+shadow+border so
// cards read as one system instead of each page picking its own
// rounded-lg/rounded-xl/rounded-2xl + shadow-md/shadow-lg/shadow-xl mix.
export function Card({ children, className = "" }) {
    return (
        <div className={`rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export function CardContent({ children, className = "" }) {
    return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = "" }) {
    return <div className={`p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 ${className}`}>{children}</div>;
}

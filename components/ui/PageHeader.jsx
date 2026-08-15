// components/ui/PageHeader.jsx
// Consistent page-title block: h1 + optional subtitle + optional right-aligned
// actions (search/filter controls, buttons). Stacks on mobile instead of
// squeezing actions next to a wrapping title.
export default function PageHeader({ title, subtitle, actions, className = "" }) {
    return (
        <div className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
                {subtitle && <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-300">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

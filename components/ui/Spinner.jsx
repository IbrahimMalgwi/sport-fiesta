// components/ui/Spinner.jsx
// The exact same "animate-spin rounded-full border-t-2 border-b-2
// border-indigo-600" spinner was hand-copied onto ~15 pages with drifting
// sizes/colors/wrapper markup. One component now.
export default function Spinner({ size = "h-12 w-12", className = "" }) {
    return <div className={`animate-spin rounded-full ${size} border-t-2 border-b-2 border-indigo-600 ${className}`} />;
}

export function LoadingScreen({ label = "Loading..." }) {
    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center">
                <Spinner className="mx-auto" />
                {label && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{label}</p>}
            </div>
        </div>
    );
}

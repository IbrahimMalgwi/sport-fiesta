"use client";
// components/Layout.jsx
// App shell (Header + main + Footer). Ported to use Next's usePathname for the
// full-width vs contained decision.
import React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout({ children }) {
    const pathname = usePathname();

    // Pages that should span full width (no centered container).
    const fullWidthPages = [
        "/",
        "/admin",
        "/admin/registrations",
        "/analysis",
        "/staff-dashboard",
        "/dashboard",
    ];

    const shouldUseContainer = !fullWidthPages.includes(pathname);

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
            <Header />
            <main id="main-content" className="flex-grow">
                {shouldUseContainer ? (
                    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
                        {children}
                    </div>
                ) : (
                    <div className="w-full">{children}</div>
                )}
            </main>
            <Footer />
        </div>
    );
}

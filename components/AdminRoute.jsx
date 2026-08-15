"use client";
// components/AdminRoute.jsx
// Admin-only client guard (ported from the CRA version). Redirects signed-out
// users to /login and shows Access Denied for non-admins. RLS is the real
// server-side boundary.
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminRoute({ children }) {
    const { currentUser, userRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!currentUser) router.replace("/login");
    }, [currentUser, router]);

    if (!currentUser) return null;

    if (userRole !== "admin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        You don&rsquo;t have permission to access the admin panel.
                    </p>
                </div>
            </div>
        );
    }

    return children;
}

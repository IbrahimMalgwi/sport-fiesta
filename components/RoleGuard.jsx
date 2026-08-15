"use client";
// components/RoleGuard.jsx
// Client-side authorization guard used in route-group layouts. Mirrors the old
// RoleRoute.jsx: admins can see everything, otherwise the role must be in
// allowedRoles. Authentication (redirect when signed out) is primarily handled
// by middleware; this also guards on the client for direct/soft navigations.
// The real access boundary is Postgres RLS, not this component.
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleGuard({ children, allowedRoles = [] }) {
    const { currentUser, userRole, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !currentUser) {
            router.replace("/login");
        }
    }, [loading, currentUser, router]);

    if (loading || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Admin can access everything.
    if (userRole === "admin") {
        return children;
    }

    if (!allowedRoles.includes(userRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        You don&rsquo;t have permission to access this page.
                    </p>
                </div>
            </div>
        );
    }

    return children;
}

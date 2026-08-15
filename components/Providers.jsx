"use client";
// components/Providers.jsx
// Client boundary that hosts the app-wide context providers. Kept separate so
// the root layout can stay a Server Component.
import React from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }) {
    return (
        <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
    );
}

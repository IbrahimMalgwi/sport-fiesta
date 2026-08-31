"use client";
// app/login/page.jsx — ported from src/pages/Login.jsx (Supabase auth via useAuth)
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError("");
            setLoading(true);
            const { error: signInError } = await login(email, password);
            if (signInError) throw signInError;
            // Honor a ?from= redirect set by middleware (bounced from a
            // protected route while signed out), else land on the Dashboard
            // directly — don't push "/" and hope middleware bounces us to
            // /dashboard, since that bounce is skipped on a transient auth
            // verification failure (see lib/supabase/middleware.js), which
            // would strand a freshly-signed-in user on the public landing page.
            const from =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("from")
                    : null;
            router.push(from || "/dashboard");
        } catch (err) {
            setError("Failed to sign in: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center py-8 sm:py-12 px-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Login</h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Sign in to your account</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Field label="Email Address">
                                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
                            </Field>
                            <Field label="Password">
                                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
                            </Field>
                            <Button type="submit" disabled={loading} fullWidth size="lg">
                                {loading ? "Signing in..." : "Sign In"}
                            </Button>
                        </form>

                        <div className="text-center">
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                Don&rsquo;t have an account?{" "}
                                <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Sign up</Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

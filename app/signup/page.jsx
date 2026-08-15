"use client";
// app/signup/page.jsx — ported from src/pages/Signup.jsx (Supabase auth)
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== passwordConfirm) {
            return setError("Passwords do not match");
        }
        try {
            setError("");
            setLoading(true);
            const { error: signUpError } = await signup(email, password);
            if (signUpError) throw signUpError;
            router.push("/");
        } catch (err) {
            setError("Failed to create account: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center py-8 sm:py-12 px-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Sign Up</h2>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Create a new account</p>
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
                            <Field label="Password Confirmation">
                                <Input type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Confirm your password" />
                            </Field>
                            <Button type="submit" disabled={loading} fullWidth size="lg">
                                {loading ? "Creating Account..." : "Sign Up"}
                            </Button>
                        </form>

                        <div className="text-center">
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                Already have an account?{" "}
                                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Log in</Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

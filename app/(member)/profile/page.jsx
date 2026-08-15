"use client";
// app/(member)/profile/page.jsx — ported from src/pages/Profile.jsx.
// Uses Supabase-backed helpers + auth; delete-account calls the cookie-based
// Route Handler at /api/delete-account.
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { updateUserProfile, getUserProfile } from "@/utils/userHelpers";
import { uploadProfilePicture } from "@/utils/storageHelpers";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function Profile() {
    const { currentUser, updatePassword, updateEmail, sendEmailVerification } = useAuth();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [userStats, setUserStats] = useState({ registrations: 0 });
    const [editMode, setEditMode] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        displayName: "", phone: "", email: currentUser?.email || "", newPassword: "", confirmPassword: "",
    });

    useEffect(() => {
        const fetchUserData = async () => {
            if (!currentUser) return;
            try {
                const profile = await getUserProfile(currentUser.uid);
                if (profile) {
                    setUserProfile(profile);
                    setFormData((prev) => ({ ...prev, displayName: profile.displayName || "", phone: profile.phone || "", email: currentUser.email }));
                }
                const { data } = await supabase
                    .from("registrations")
                    .select("created_at")
                    .eq("createdBy", currentUser.uid)
                    .order("created_at", { ascending: false });
                setUserStats({ registrations: (data || []).length, lastRegistration: data?.[0]?.created_at || null });
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        fetchUserData();
    }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: "error", text: "File size must be less than 5MB" });
            return;
        }
        setUploading(true);
        try {
            const profilePictureURL = await uploadProfilePicture(currentUser.uid, file);
            await updateUserProfile(currentUser.uid, { profilePicture: profilePictureURL, profilePictureName: file.name });
            setUserProfile((prev) => ({ ...prev, profilePicture: profilePictureURL }));
            setMessage({ type: "success", text: "Profile picture updated successfully!" });
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            setMessage({ type: "error", text: "Failed to upload profile picture" });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });
        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match" });
            setLoading(false);
            return;
        }
        if (formData.newPassword && !validatePasswordStrength(formData.newPassword)) {
            setMessage({ type: "error", text: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character" });
            setLoading(false);
            return;
        }
        try {
            if (formData.email !== currentUser.email) {
                const { error } = await updateEmail(formData.email);
                if (error) throw error;
                setMessage({ type: "success", text: "Verification email sent. Please verify your new email address." });
            }
            if (formData.newPassword) {
                const { error } = await updatePassword(formData.newPassword);
                if (error) throw error;
                setMessage({ type: "success", text: "Password updated successfully!" });
            }
            await updateUserProfile(currentUser.uid, { displayName: formData.displayName, phone: formData.phone, email: formData.email });
            setMessage({ type: "success", text: "Profile updated successfully!" });
            setEditMode(false);
            setFormData((prev) => ({ ...prev, newPassword: "", confirmPassword: "" }));
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: "error", text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const validatePasswordStrength = (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    };

    const handleResendVerification = async () => {
        try {
            const { error } = await sendEmailVerification();
            if (error) throw error;
            setMessage({ type: "success", text: "Verification email sent!" });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.")) return;
        setLoading(true);
        try {
            const response = await fetch("/api/delete-account", { method: "POST" });
            if (response.ok) {
                setMessage({ type: "success", text: "Account deletion request received. You will be logged out shortly." });
                setTimeout(() => { window.location.href = "/login"; }, 3000);
            } else {
                throw new Error("Failed to delete account");
            }
        } catch (error) {
            setMessage({ type: "error", text: "Error deleting account. Please contact support." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 sm:p-6 text-white">
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <div className="relative">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-indigo-700 flex items-center justify-center text-2xl sm:text-3xl overflow-hidden">
                                {userProfile?.profilePicture ? (
                                    <img src={userProfile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    userProfile?.displayName?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || "U"
                                )}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                className="absolute bottom-0 right-0 bg-white text-indigo-600 p-1 rounded-full shadow-md hover:bg-gray-100 transition-colors">
                                {uploading ? "📤" : "📷"}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePictureChange} className="hidden" />
                        </div>
                        <div className="text-center sm:text-left min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold">User Profile</h1>
                            <p className="opacity-90 text-sm sm:text-base truncate">{currentUser?.email}</p>
                            {!currentUser?.emailVerified && (
                                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Email not verified</span>
                                    <button onClick={handleResendVerification} className="text-yellow-200 hover:text-white text-xs underline">Resend verification</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-800 dark:text-white">Your Activity</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{userStats.registrations}</div>
                            <div className="text-sm text-indigo-800 dark:text-indigo-200">Registrations</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">4</div>
                            <div className="text-sm text-purple-800 dark:text-purple-200">Houses</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
                            <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                                {userStats.lastRegistration ? new Date(userStats.lastRegistration).toLocaleDateString() : "Never"}
                            </div>
                            <div className="text-sm text-green-800 dark:text-green-200">Last Activity</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-6 gap-3">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">Profile Information</h2>
                        <button onClick={() => setEditMode(!editMode)}
                            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors shrink-0">
                            {editMode ? "Cancel" : "Edit Profile"}
                        </button>
                    </div>

                    {message.text && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "error" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : message.type === "success" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <Field label="Display Name">
                                <Input type="text" name="displayName" value={formData.displayName} onChange={handleInputChange} disabled={!editMode || loading} placeholder="Enter your display name" />
                            </Field>
                            <Field label="Phone Number">
                                <Input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} disabled={!editMode || loading} placeholder="Enter your phone number" />
                            </Field>
                            <Field label="Email Address">
                                <Input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={!editMode || loading} required />
                            </Field>
                            <Field label="New Password (leave blank to keep current)" hint="Must include uppercase, lowercase, number, and special character">
                                <Input type="password" name="newPassword" value={formData.newPassword} onChange={handleInputChange} disabled={!editMode || loading} placeholder="••••••••" />
                            </Field>
                            <Field label="Confirm New Password">
                                <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} disabled={!editMode || loading} placeholder="••••••••" />
                            </Field>
                            {editMode && (
                                <div className="pt-4">
                                    <Button type="submit" disabled={loading} fullWidth>
                                        {loading ? "Updating..." : "Save Changes"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                    <h2 className="text-base sm:text-lg font-semibold mb-4 text-red-800 dark:text-red-200">Danger Zone</h2>
                    <p className="text-red-700 dark:text-red-300 mb-4 text-sm">Once you delete your account, there is no going back. All your data will be permanently deleted.</p>
                    <Button variant="danger" onClick={handleDeleteAccount} disabled={loading}>
                        {loading ? "Processing..." : "Delete Account"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

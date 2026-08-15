"use client";
// contexts/AuthContext.jsx
// Supabase-backed replacement for the old Firebase AuthContext. Exposes the
// same surface the app already uses (currentUser, userRole, login/signup/
// logout, plus profile helpers) so ported pages need minimal changes.
//
// The Supabase user is normalized to also carry `uid` (= user.id) and
// `emailVerified`, matching how the Firebase pages referenced the user.
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

function normalizeUser(user) {
    if (!user) return null;
    return {
        ...user,
        uid: user.id,
        emailVerified: Boolean(user.email_confirmed_at),
    };
}

export function AuthProvider({ children }) {
    const supabase = useMemo(() => createClient(), []);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch the caller's role from the profiles table.
    async function loadRole(userId) {
        try {
            const { data } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .single();
            setUserRole(data?.role || "user");
        } catch {
            setUserRole("user");
        }
    }

    useEffect(() => {
        // Not wired to a real project yet — treat as signed out but ready.
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        let active = true;

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!active) return;
            const user = normalizeUser(session?.user);
            setCurrentUser(user);
            if (user) await loadRole(user.id);
            else setUserRole(null);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = normalizeUser(session?.user);
            setCurrentUser(user);
            if (user) await loadRole(user.id);
            else setUserRole(null);
        });

        return () => {
            active = false;
            subscription?.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Auth actions (Supabase equivalents of the old Firebase calls) ----
    const login = (email, password) =>
        supabase.auth.signInWithPassword({ email, password });

    const signup = (email, password) =>
        // The profiles row is created server-side by the handle_new_user
        // trigger (see supabase/migrations/0002_rls.sql).
        supabase.auth.signUp({ email, password });

    const logout = () => supabase.auth.signOut();

    const updatePassword = (newPassword) =>
        supabase.auth.updateUser({ password: newPassword });

    const updateEmail = (newEmail) =>
        supabase.auth.updateUser({ email: newEmail });

    const sendEmailVerification = () =>
        supabase.auth.resend({ type: "signup", email: currentUser?.email });

    const value = {
        supabase,
        currentUser,
        userRole,
        loading,
        login,
        signup,
        logout,
        updatePassword,
        updateEmail,
        sendEmailVerification,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

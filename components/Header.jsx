"use client";
// components/Header.jsx
// Ported from react-router-dom to Next: next/link + usePathname. The NavLink/
// MobileNavLink helpers keep their `to` prop (mapped to href) so the many call
// sites stay unchanged.
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function Header() {
    const { currentUser, logout, userRole } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close mobile menu when route changes
    React.useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    return (
        <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-indigo-100 dark:border-gray-700">
            {/* Skip navigation link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only absolute top-2 left-2 bg-indigo-600 text-white p-2 z-50 rounded text-sm transition-transform transform focus:translate-y-0 -translate-y-16"
            >
                Skip to main content
            </a>

            <div className="max-w-screen-2xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-4">
                {/* Logo — always visible (brand identity shouldn't disappear on mobile) */}
                <div className="flex items-center shrink-0">
                    <Link href="/" className="flex items-center shrink-0" aria-label="All Winners home">
                        <img src="/logo.png" alt="All Winners" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-lg shadow-md" />
                    </Link>
                </div>

                {/* Desktop navigation */}
                <nav className="hidden 2xl:flex items-center gap-0.5 min-w-0">
                    {currentUser ? (
                        <>
                            <NavLink to="/" currentPath={pathname}>
                                🏠 Home
                            </NavLink>
                            <NavLink to="/register" currentPath={pathname}>
                                📝 Register Participant
                            </NavLink>
                            <NavLink to="/staff-registration" currentPath={pathname}>
                                👥 Register Staff
                            </NavLink>

                            {/* Sports Fiesta operational modules (staff + admin) */}
                            <div className="relative group">
                                <button className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 whitespace-nowrap flex items-center">
                                    🏆 Fiesta
                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown menu for Sports Fiesta modules */}
                                <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <Link
                                        href="/admin/sports"
                                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                                    >
                                        🏅 Sporting Activities
                                    </Link>
                                    <Link
                                        href="/representatives"
                                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                                    >
                                        👥 House Representatives
                                    </Link>
                                    <Link
                                        href="/results"
                                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                                    >
                                        🥇 Record Result
                                    </Link>
                                    <Link
                                        href="/injuries"
                                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                                    >
                                        🩹 Injury Register
                                    </Link>
                                    <Link
                                        href="/decisions"
                                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        ✝️ Decisions for Christ
                                    </Link>
                                </div>
                            </div>

                            <NavLink to="/dashboard" currentPath={pathname}>
                                🎯 Dashboard
                            </NavLink>
                            <NavLink to="/analysis" currentPath={pathname}>
                                📈 Participant Analytics
                            </NavLink>
                            <NavLink to="/staff-dashboard" currentPath={pathname}>
                                👥 Staff Analytics
                            </NavLink>

                            {/* Admin links - Only show for admin users */}
                            {userRole === "admin" && (
                                <>
                                    <NavLink to="/admin" currentPath={pathname}>
                                        👑 Admin
                                    </NavLink>
                                    <NavLink to="/admin/registrations" currentPath={pathname}>
                                        📋 Manage Participants
                                    </NavLink>
                                    <NavLink to="/admin/registrations?tab=staff" currentPath={pathname}>
                                        👥 Manage Staff
                                    </NavLink>
                                    <NavLink to="/admin/settings" currentPath={pathname}>
                                        ⚙️ Settings
                                    </NavLink>
                                </>
                            )}

                            {/* Theme toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"
                                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            >
                                {isDark ? '☀️' : '🌙'}
                            </button>

                            {/* User menu */}
                            <div className="relative group ml-1">
                                <Link
                                    href="/profile"
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                                        {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-sm font-medium hidden xl:block">
                                        {currentUser.email?.split('@')[0]}
                                    </span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </Link>

                                {/* Dropdown menu */}
                                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                            {currentUser.email}
                                        </p>
                                    </div>
                                    <Link
                                        href="/profile"
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        👤 View Profile
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        🚪 Sign out
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <NavLink to="/" currentPath={pathname}>
                                🏠 Home
                            </NavLink>
                            <NavLink to="/login" currentPath={pathname}>
                                Login
                            </NavLink>
                            <NavLink to="/signup" currentPath={pathname}>
                                Sign Up
                            </NavLink>
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            >
                                {isDark ? '☀️' : '🌙'}
                            </button>
                        </>
                    )}
                </nav>

                {/* Mobile menu button — 44px+ touch target per WCAG */}
                <button
                    className="2xl:hidden p-2.5 -mr-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                    aria-expanded={isMenuOpen}
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile navigation — capped + scrollable so it never gets clipped
                by the viewport on short phones with the full admin menu open */}
            <nav
                className={`2xl:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out overflow-y-auto ${
                    isMenuOpen ? 'max-h-[calc(100dvh-3.5rem)] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
                aria-hidden={!isMenuOpen}
            >
                <div className="px-3 sm:px-4 py-3 space-y-1">
                    {currentUser ? (
                        <>
                            <MobileNavLink to="/" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                🏠 Home
                            </MobileNavLink>
                            <MobileNavLink to="/register" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                📝 Register Participant
                            </MobileNavLink>
                            <MobileNavLink to="/staff-registration" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                👥 Register Staff
                            </MobileNavLink>

                            {/* Sports Fiesta modules for mobile */}
                            <div className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                                🏆 Sports Fiesta
                            </div>
                            <MobileNavLink to="/admin/sports" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                &nbsp;&nbsp;🏅 Sporting Activities
                            </MobileNavLink>
                            <MobileNavLink to="/results" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                &nbsp;&nbsp;🥇 Record Result
                            </MobileNavLink>
                            <MobileNavLink to="/representatives" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                &nbsp;&nbsp;👥 House Representatives
                            </MobileNavLink>
                            <MobileNavLink to="/injuries" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                &nbsp;&nbsp;🩹 Injury Register
                            </MobileNavLink>
                            <MobileNavLink to="/decisions" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                &nbsp;&nbsp;✝️ Decisions for Christ
                            </MobileNavLink>

                            <MobileNavLink to="/dashboard" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                🎯 Dashboard
                            </MobileNavLink>
                            <MobileNavLink to="/analysis" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                📈 Participant Analytics
                            </MobileNavLink>
                            <MobileNavLink to="/staff-dashboard" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                👥 Staff Analytics
                            </MobileNavLink>
                            <MobileNavLink to="/profile" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                👤 Profile
                            </MobileNavLink>

                            {/* Admin links for mobile - Only show for admin users */}
                            {userRole === "admin" && (
                                <>
                                    <MobileNavLink to="/admin" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                        👑 Admin Panel
                                    </MobileNavLink>
                                    <MobileNavLink to="/admin/registrations" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                        📋 Manage Participants
                                    </MobileNavLink>
                                    <MobileNavLink to="/admin/registrations?tab=staff" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                        👥 Manage Staff
                                    </MobileNavLink>
                                    <MobileNavLink to="/admin/settings" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                        ⚙️ Fiesta Settings
                                    </MobileNavLink>
                                </>
                            )}

                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 mt-3">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
                                    <button
                                        onClick={toggleTheme}
                                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                                    >
                                        {isDark ? '☀️ Light' : '🌙 Dark'}
                                    </button>
                                </div>

                                <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 break-words">
                                    Signed in as {currentUser.email}
                                </div>

                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2"
                                >
                                    🚪 Sign out
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <MobileNavLink to="/" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                🏠 Home
                            </MobileNavLink>
                            <MobileNavLink to="/login" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                Login
                            </MobileNavLink>
                            <MobileNavLink to="/signup" currentPath={pathname} onClick={() => setIsMenuOpen(false)}>
                                Sign Up
                            </MobileNavLink>

                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 mt-3">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
                                    <button
                                        onClick={toggleTheme}
                                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                                    >
                                        {isDark ? '☀️ Light' : '🌙 Dark'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}

// Desktop NavLink component
function NavLink({ to, currentPath, children }) {
    const isActive = currentPath === to.split("?")[0];

    return (
        <Link
            href={to}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                    ? "text-white bg-indigo-600 shadow-md"
                    : "text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
        >
            {children}
        </Link>
    );
}

// Mobile NavLink component
function MobileNavLink({ to, currentPath, onClick, children }) {
    const isActive = currentPath === to.split("?")[0];

    return (
        <Link
            href={to}
            onClick={onClick}
            className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                isActive
                    ? "text-white bg-indigo-600"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
        >
            {children}
        </Link>
    );
}

// app/(member)/layout.jsx
// Guards this group for any signed-in user (and admin, who passes
// everything): dashboards, analytics, profile, event registration forms.
import RoleGuard from "@/components/RoleGuard";

export default function MemberGroupLayout({ children }) {
    return <RoleGuard allowedRoles={["staff", "user"]}>{children}</RoleGuard>;
}

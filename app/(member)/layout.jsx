// app/(member)/layout.jsx
// Guards this group for staff + user (and admin, who passes everything):
// dashboards, analytics, profile.
import RoleGuard from "@/components/RoleGuard";

export default function MemberGroupLayout({ children }) {
    return <RoleGuard allowedRoles={["staff", "user"]}>{children}</RoleGuard>;
}

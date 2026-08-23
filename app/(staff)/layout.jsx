// app/(staff)/layout.jsx
// Guards this group for any signed-in user (operational Fiesta modules are
// open to all registered roles now; only /admin/* stays admin-only).
import RoleGuard from "@/components/RoleGuard";

export default function StaffGroupLayout({ children }) {
    return <RoleGuard allowedRoles={["staff", "user"]}>{children}</RoleGuard>;
}

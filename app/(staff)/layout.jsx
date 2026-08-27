// app/(staff)/layout.jsx
// Guards this group for any signed-in user (operational Fiesta modules are
// open to all registered roles now; only /admin/* stays admin-only).
import RoleGuard from "@/components/RoleGuard";
import { AUTHENTICATED_ROLES } from "@/utils/roles";

export default function StaffGroupLayout({ children }) {
    return <RoleGuard allowedRoles={AUTHENTICATED_ROLES}>{children}</RoleGuard>;
}

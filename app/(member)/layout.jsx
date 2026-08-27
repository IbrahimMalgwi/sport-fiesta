// app/(member)/layout.jsx
// Guards this group for any signed-in user (and admin, who passes
// everything): dashboards, analytics, profile, event registration forms.
import RoleGuard from "@/components/RoleGuard";
import { AUTHENTICATED_ROLES } from "@/utils/config";

export default function MemberGroupLayout({ children }) {
    return <RoleGuard allowedRoles={AUTHENTICATED_ROLES}>{children}</RoleGuard>;
}

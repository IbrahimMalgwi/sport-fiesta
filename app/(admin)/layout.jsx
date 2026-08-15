// app/(admin)/layout.jsx
// Guards every route in this group for admins only (RoleGuard lets admins
// through and denies everyone else since allowedRoles is ["admin"]).
import RoleGuard from "@/components/RoleGuard";

export default function AdminGroupLayout({ children }) {
    return <RoleGuard allowedRoles={["admin"]}>{children}</RoleGuard>;
}

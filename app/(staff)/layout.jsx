// app/(staff)/layout.jsx
// Guards this group for staff + admins (operational Fiesta modules).
import RoleGuard from "@/components/RoleGuard";

export default function StaffGroupLayout({ children }) {
    return <RoleGuard allowedRoles={["staff"]}>{children}</RoleGuard>;
}

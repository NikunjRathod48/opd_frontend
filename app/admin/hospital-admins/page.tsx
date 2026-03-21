"use client";

import { HospitalAdminList } from "@/components/modules/hospitals/hospital-admin-list";
import { RoleGuard } from "@/components/auth/role-guard";

export default function HospitalAdminsPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin','GroupAdmin']}>
            <HospitalAdminList />
        </RoleGuard>
    );
}

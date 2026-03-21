"use client";

import { GroupAdminList } from "@/components/modules/hospitals/group-admin-list";
import { RoleGuard } from "@/components/auth/role-guard";

export default function GroupAdminsPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin']}>
            <GroupAdminList />
        </RoleGuard>
    );
}

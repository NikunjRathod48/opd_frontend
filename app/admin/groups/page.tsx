"use client";

import { GroupList } from "@/components/modules/hospitals/group-list";
import { RoleGuard } from "@/components/auth/role-guard";

export default function GroupsPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin']}>
            <GroupList />
        </RoleGuard>
    );
}

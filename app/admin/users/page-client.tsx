"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { UsersView } from "@/components/modules/users/users-view";

export default function UsersPage() {
    return (
        <RoleGuard allowedRoles={["SuperAdmin"]}>
            <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
                <UsersView />
            </div>
        </RoleGuard>
    );
}

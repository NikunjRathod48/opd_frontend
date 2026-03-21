"use client";

import { ReportsView } from "@/components/modules/reports/reports-view";
import { RoleGuard } from "@/components/auth/role-guard";

export default function ReportsPage() {
    // Accessible by all admin types, logic handles data filtering
    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin']}>
            <ReportsView />
        </RoleGuard>
    );
}

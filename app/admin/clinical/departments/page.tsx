"use client";

import { DepartmentList } from "@/components/modules/master-data/department-list";
import { RoleGuard } from "@/components/auth/role-guard";

export default function DepartmentsPage() {

    // Use DepartmentList directly instead of ClinicalMasterLayout if we want the "single page" feel
    // OR wrap it. The user asked "can we do in one page like treatment-type-list.tsx".
    // treatment-type-list.tsx includes its own header/toolbar etc.
    // So we should just render it with a basic wrapper or Dashboard Layout (already in parent).

    return (
        <RoleGuard allowedRoles={["SuperAdmin"]}>
            <div className="h-full p-6">
                <DepartmentList />
            </div>
        </RoleGuard>
    );
}

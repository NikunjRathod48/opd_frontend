"use client";

import { DepartmentList } from "@/components/modules/master-data/department-list";
import { RoleGuard } from "@/components/auth/role-guard";

export default function HospitalDepartmentsPage() {

    return (
        <RoleGuard allowedRoles={["SuperAdmin", "HospitalAdmin"]}>
            <div className="h-full p-6">
                <DepartmentList />
            </div>
        </RoleGuard>
    );
}

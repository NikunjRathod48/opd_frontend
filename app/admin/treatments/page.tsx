"use client";

import { TreatmentTypeList } from "@/components/modules/opd/treatment-type-list";
import { RoleGuard } from "@/components/auth/role-guard";

export default function TreatmentsPage() {
    return (
        <RoleGuard allowedRoles={['HospitalAdmin', 'SuperAdmin', 'GroupAdmin']}>
            <TreatmentTypeList />
        </RoleGuard>
    );
}

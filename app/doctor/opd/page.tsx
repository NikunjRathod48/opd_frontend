"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { OPDView } from "@/components/modules/opd/opd-view";

export default function DoctorOPDPage() {
    return (
        <RoleGuard allowedRoles={['HospitalAdmin', 'Doctor']}>
            <OPDView />
        </RoleGuard>
    );
}

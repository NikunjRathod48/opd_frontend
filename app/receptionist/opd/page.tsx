"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { OPDView } from "@/components/modules/opd/opd-view";

export default function ReceptionistOPDPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist']}>
            <OPDView />
        </RoleGuard>
    );
}

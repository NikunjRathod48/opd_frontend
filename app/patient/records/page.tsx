"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { MedicalRecordsView } from "@/components/modules/records/medical-records-view";

export default function PatientRecordsPage() {
    return (
        <RoleGuard allowedRoles={['Patient']}>
            <MedicalRecordsView />
        </RoleGuard>
    );
}

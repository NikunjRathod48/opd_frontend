"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { MedicalRecordsView } from "@/components/modules/records/medical-records-view";

export default function DoctorRecordsPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist']}>
            <MedicalRecordsView />
        </RoleGuard>
    );
}

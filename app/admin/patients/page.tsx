"use client";

import { PatientList } from "@/components/modules/patients/patient-list";
import { RoleGuard } from "@/components/auth/role-guard";

export default function PatientsPage() {
    return(
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin']}>
            <PatientList />
        </RoleGuard>
    )
}

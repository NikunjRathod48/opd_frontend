"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { PatientList } from "@/components/modules/patients/patient-list";

export default function DoctorPatientsPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist']}>
            <PatientList />
        </RoleGuard>
    );
}

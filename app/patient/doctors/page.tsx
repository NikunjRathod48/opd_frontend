"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorList } from "@/components/modules/doctors/doctor-list";

export default function PatientDoctorsPage() {
    return (
        <RoleGuard allowedRoles={['Patient']}>
            <DoctorList />
        </RoleGuard>
    );
}

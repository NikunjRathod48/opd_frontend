"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorList } from "@/components/modules/doctors/doctor-list";

export default function ReceptionistDoctorsPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist']}>
            <DoctorList />
        </RoleGuard>
    );
}

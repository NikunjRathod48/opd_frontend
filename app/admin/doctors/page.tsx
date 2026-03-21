"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorList } from "@/components/modules/doctors/doctor-list";

export default function DoctorsPage() {
    return(
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin']}>
            <DoctorList />
        </RoleGuard>
    )
}

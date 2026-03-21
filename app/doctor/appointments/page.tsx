"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { AppointmentView } from "@/components/modules/appointments/appointment-view";

export default function DoctorAppointmentsPage() {
    return(
        <RoleGuard allowedRoles={['Doctor', 'Receptionist']}>
            <AppointmentView />
        </RoleGuard>
    )
}

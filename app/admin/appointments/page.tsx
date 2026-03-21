"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { AppointmentView } from "@/components/modules/appointments/appointment-view";

export default function AppointmentsPage() {
    return(
        <RoleGuard allowedRoles={['HospitalAdmin']}>
            <AppointmentView />
        </RoleGuard>
    )
}

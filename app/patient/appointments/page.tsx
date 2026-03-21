"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { AppointmentView } from "@/components/modules/appointments/appointment-view";

export default function PatientAppointmentsPage() {
    return (
        <RoleGuard allowedRoles={['Patient']}>
            <AppointmentView />
        </RoleGuard>
    );
}

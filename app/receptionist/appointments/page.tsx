"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { AppointmentView } from "@/components/modules/appointments/appointment-view";

export default function ReceptionistAppointmentsPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist']}>
            <AppointmentView />
        </RoleGuard>
    );
}

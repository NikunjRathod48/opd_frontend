"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { BillingView } from "@/components/modules/billing/billing-view";

export default function ReceptionistBillingPage() {
    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist']}>
            <BillingView />
        </RoleGuard>
    );
}

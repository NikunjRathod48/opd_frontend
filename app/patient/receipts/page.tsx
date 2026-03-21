"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { BillingView } from "@/components/modules/billing/billing-view";

export default function PatientReceiptsPage() {
    return (
        <RoleGuard allowedRoles={['Patient']}>
            <BillingView />
        </RoleGuard>
    );
}

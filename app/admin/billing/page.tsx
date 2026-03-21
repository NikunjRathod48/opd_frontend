"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { BillingView } from "@/components/modules/billing/billing-view";

export default function BillingPage() {
    return(
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin']}>
            <BillingView />
        </RoleGuard>
    )
}

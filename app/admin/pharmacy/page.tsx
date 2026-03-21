"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { PharmacyView } from "@/components/modules/pharmacy/pharmacy-view";

export default function PharmacyPage() {
    return(
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin']}>
            <PharmacyView />
        </RoleGuard>
    )
}
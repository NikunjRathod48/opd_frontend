"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { ReceptionistList } from "@/components/modules/receptionists/receptionist-list";

export default function ReceptionistsPage() {
    return (
        <RoleGuard allowedRoles={["SuperAdmin", "GroupAdmin", "HospitalAdmin"]}>
            <ReceptionistList />
        </RoleGuard>
    );
}

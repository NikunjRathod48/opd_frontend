"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { ProfileView } from "@/components/modules/settings/profile-view";

export default function PatientProfilePage() {
    return (
        <RoleGuard allowedRoles={['Patient']}>
            <ProfileView />
        </RoleGuard>
    );
}

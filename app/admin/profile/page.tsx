"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { ProfileView } from "@/components/modules/settings/profile-view";

export default function ProfilePage() {
    return(
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist', 'Patient']}>
            <ProfileView />
        </RoleGuard>
    )
}

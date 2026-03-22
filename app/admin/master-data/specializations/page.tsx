import { RoleGuard } from "@/components/auth/role-guard";
import { SpecializationManager } from "@/components/modules/master-data/specialization-manager";

export default function Page() {
    return (
        <RoleGuard allowedRoles={["SuperAdmin"]}>
            <SpecializationManager />
        </RoleGuard>
    );
}

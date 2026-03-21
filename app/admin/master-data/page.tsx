import { RoleGuard } from "@/components/auth/role-guard";
import { StateCityManager } from "@/components/modules/master-data/state-city-manager";

export default function Page() {
    return (
        <RoleGuard allowedRoles={["SuperAdmin"]}>
            <StateCityManager />
        </RoleGuard>
    );
}

import { RoleGuard } from "@/components/auth/role-guard";
import { ReceptionistQueueView } from "@/components/modules/queues/receptionist-queue-view";

export default function ReceptionistQueuesPage() {
    return (
        <RoleGuard allowedRoles={["Receptionist"]}>
            <ReceptionistQueueView />
        </RoleGuard>
    );
}

import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorQueueView } from "@/components/modules/queues/doctor-queue-view";

export default function DoctorQueuesPage() {
    return (
        <RoleGuard allowedRoles={["Doctor"]}>
            <DoctorQueueView />
        </RoleGuard>
    );
}

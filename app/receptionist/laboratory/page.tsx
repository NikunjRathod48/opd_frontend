import { RoleGuard } from "@/components/auth/role-guard";
import { LaboratoryView } from "@/components/modules/laboratory/laboratory-view";

export default function LaboratoryPage() {
  return (
    <RoleGuard allowedRoles={["SuperAdmin", "GroupAdmin", "HospitalAdmin", "Doctor", "Receptionist"]}>
      <LaboratoryView />
    </RoleGuard>
  );
}

import { RoleGuard } from "@/components/auth/role-guard";
import { LaboratoryView } from "@/components/modules/laboratory/laboratory-view";

export default function LaboratoryPage() {
  return (
    <RoleGuard allowedRoles={["SuperAdmin", "HospitalAdmin", "Receptionist", "Doctor"]}>
      <LaboratoryView />
    </RoleGuard>
  );
}

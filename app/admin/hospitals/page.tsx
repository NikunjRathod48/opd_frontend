"use client";

import { HospitalList } from "@/components/modules/hospitals/hospital-list";

export default function HospitalsPage() {
    return <HospitalList allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin']} />;
}

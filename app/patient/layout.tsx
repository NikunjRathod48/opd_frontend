import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}

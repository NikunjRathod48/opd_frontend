import { api } from "@/lib/api";

export interface DashboardAnalytics {
    totalRevenue: number;
    totalAppointments: number;
    activePatients: number;
    treatmentSuccessRate: number;
    revenueTrendData: { name: string; revenue: number; expenses: number }[];
    appStatusData: { name: string; value: number }[];
    revenueByHospitalData: { name: string; revenue: number; visits: number }[];
}

export const reportsService = {
    getDashboardAnalytics: async (hospitalId?: string | null, hospitalGroupId?: string | null): Promise<DashboardAnalytics> => {
        const params = new URLSearchParams();
        if (hospitalId) params.append('hospital_id', hospitalId);
        if (hospitalGroupId) params.append('hospital_group_id', hospitalGroupId);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        return api.get(`/reports/dashboard${queryString}`);
    }
};

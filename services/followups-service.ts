import { api } from "@/lib/api";

export interface Followup {
  followup_id: number;
  visit_id: number;
  recommended_date: string;
  reason: string;
  status: string; // 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled'
  created_at: string;
  modified_at: string;
  opd_visits?: {
    opd_id: number;
    opd_no: string;
    patients?: {
      patient_id: number;
      users_patients_user_idTousers?: { full_name: string };
    };
    doctors?: {
      doctor_id: number;
      users_doctors_user_idTousers?: { full_name: string };
    };
  };
}

function buildQuery(params: Record<string, any>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export const followupsService = {
  async create(data: { visit_id: number; recommended_date: string; reason: string }): Promise<Followup> {
    return api.post<Followup>('/followups', data);
  },

  async getByVisit(visitId: number): Promise<Followup[]> {
    return api.get<Followup[]>(`/followups/visit/${visitId}`);
  },

  async getAll(params?: {
    hospital_id?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<Followup[]> {
    return api.get<Followup[]>(`/followups${buildQuery(params || {})}`);
  },

  async update(id: number, data: Partial<{ status: string; recommended_date: string; reason: string }>): Promise<Followup> {
    return api.patch<Followup>(`/followups/${id}`, data);
  },
};

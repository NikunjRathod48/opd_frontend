import { api } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OpdVisit {
    opd_id: number;
    opd_no: string;
    hospital_id: number;
    patient_id: number;
    doctor_id: number;
    visit_datetime: string;
    chief_complaint: string;
    clinical_notes: string;
    is_active: boolean;
    patients?: {
        patient_id: number;
        patient_no: string;
        gender: string;
        dob: string;
        phone_number: string;
        users_patients_user_idTousers: { full_name: string };
    };
    vitals?: {
        vital_id: number;
        opd_id: number;
        height: number;
        weight: number;
        blood_pressure: string;
        temperature: number;
        spo2: number;
        pulse: number;
    };
    doctors?: { users_doctors_user_idTousers: { full_name: string } };
    opd_diagnoses?: Array<{
        opd_diagnosis_id: number;
        diagnosis_id: number;
        is_primary: boolean;
        remarks: string;
        diagnoses: { diagnosis_id: number; diagnosis_name: string };
    }>;
    opd_tests?: Array<{
        opd_test_id: number;
        test_id: number;
        test_status: string;
        result_summary?: string;
        tests: { test_id: number; test_name: string };
    }>;
    opd_procedures?: Array<{
        opd_procedure_id: number;
        procedure_id: number;
        procedure_date: string;
        remarks: string;
        procedures: { procedure_id: number; procedure_name: string };
    }>;
    prescriptions?: Array<{
        prescription_id: number;
        notes: string;
        prescription_items: Array<{
            prescription_item_id: number;
            medicine_id: number;
            dosage: string;
            quantity: number;
            duration_days: number;
            instructions: string;
            medicines: { medicine_id: number; medicine_name: string };
        }>;
    }>;
}

export interface PatientSearchResult {
    patientid: number;
    patientno: string;
    full_name: string;
    phone_number: string;
    gender: string;
    dob: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQuery(params: Record<string, any>): string {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    return qs ? `?${qs}` : '';
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const opdService = {

    // --- OPD Visits ---

    getVisits: async (params: { hospital_id?: number; doctor_id?: number; date?: string; status?: string; is_active?: boolean }): Promise<OpdVisit[]> => {
        return api.get<OpdVisit[]>(`/opd${buildQuery(params)}`);
    },

    getVisit: async (opdId: number): Promise<OpdVisit> => {
        return api.get<OpdVisit>(`/opd/${opdId}`);
    },

    createVisit: async (data: {
        hospital_id: number;
        patient_id: number;
        doctor_id: number;
        chief_complaint?: string;
    }): Promise<OpdVisit> => {
        return api.post<OpdVisit>('/opd', data);
    },

    updateVisit: async (opdId: number, data: Partial<{ chief_complaint: string; clinical_notes: string; is_active: boolean }>): Promise<OpdVisit> => {
        return api.patch<OpdVisit>(`/opd/${opdId}`, data);
    },

    // --- Clinical ---

    addDiagnosis: async (opdId: number, data: { diagnosis_id: number; is_primary?: boolean; remarks?: string }) => {
        return api.post(`/opd/${opdId}/diagnoses`, data);
    },

    addTest: async (opdId: number, data: { test_id: number; status?: string }) => {
        return api.post(`/opd/${opdId}/tests`, data);
    },

    addProcedure: async (opdId: number, data: { procedure_id: number; procedure_date: string; remarks?: string }) => {
        return api.post(`/opd/${opdId}/procedures`, data);
    },

    addPrescription: async (opdId: number, data: {
        doctor_id: number;
        notes?: string;
        items: Array<{ medicine_id: number; dosage: string; quantity: number; duration_days: number; instructions?: string }>;
    }) => {
        return api.post(`/opd/${opdId}/prescriptions`, data);
    },

    // --- Vitals ---

    getVitals: async (opdId: number): Promise<any> => {
        return api.get(`/opd/${opdId}/vitals`);
    },

    upsertVitals: async (opdId: number, data: {
        height?: number;
        weight?: number;
        blood_pressure?: string;
        temperature?: number;
        spo2?: number;
        pulse?: number;
    }) => {
        return api.patch(`/opd/${opdId}/vitals`, data);
    },

    // --- Patient ---

    searchPatients: async (q: string, hospitalGroupId?: number): Promise<PatientSearchResult[]> => {
        return api.get<PatientSearchResult[]>(`/patients/search${buildQuery({ q, hospital_group_id: hospitalGroupId })}`);
    },

    createWalkInPatient: async (data: {
        full_name: string;
        phone_number: string;
        gender: string;
        dob: string;
        hospital_group_id?: number;
    }): Promise<{ patient_id: number; patient_no: string }> => {
        return api.post('/patients', { ...data, is_walk_in: true });
    },
};

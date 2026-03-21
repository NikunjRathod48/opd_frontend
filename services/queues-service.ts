import { api } from '../lib/api';

export interface DailyQueue {
    daily_queue_id: number;
    hospital_id: number;
    doctor_id: number;
    queue_date: string;
    current_token: number;
    status: string;
    opened_at: string;
    closed_at?: string;
    doctors: {
        users_doctors_user_idTousers?: {
            full_name: string;
        };
    };
    _count: {
        queue_tokens: number;
    };
}

export interface QueueToken {
    token_id: number;
    daily_queue_id: number;
    opd_id?: number | null;
    token_number: number;
    status: string;
    issued_at: string;
    started_at?: string;
    completed_at?: string;
    opd_visits?: {
        patients?: {
            users_patients_user_idTousers?: {
                full_name: string;
            };
        };
        opd_no?: string;
    };
}

export interface OpdVisit {
    opdid: number;
    opdno: string;
    patientid: number;
    doctorid: number;
    patientName: string;
    doctorName: string;
    visitdatetime: string;
    status: string;
}

// Helper: build query string from an object, omitting undefined/null values
function buildQuery(params: Record<string, any>): string {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    return qs ? `?${qs}` : '';
}

export const queuesService = {
    // Queues
    getAllQueues: async (params?: Record<string, any>): Promise<DailyQueue[]> => {
        const qs = params ? buildQuery(params) : '';
        return api.get<DailyQueue[]>(`/queues${qs}`);
    },

    createQueue: async (data: { hospital_id: number; doctor_id: number; queue_date: string }) => {
        return api.post<any>('/queues', data);
    },

    updateQueueStatus: async (queueId: number, status: string) => {
        return api.patch<any>(`/queues/${queueId}/status`, { status });
    },

    // Tokens
    getTokensForQueue: async (queueId: number): Promise<QueueToken[]> => {
        return api.get<QueueToken[]>(`/queues/${queueId}/tokens`);
    },

    generateToken: async (queueId: number, opdId?: number | null) => {
        return api.post<any>(`/queues/${queueId}/tokens`, { opd_id: opdId ?? null });
    },

    updateTokenStatus: async (tokenId: number, status: string) => {
        return api.patch<any>(`/queues/tokens/${tokenId}/status`, { status });
    },

    linkTokenToOpd: async (tokenId: number, opdId: number) => {
        return api.patch<any>(`/queues/tokens/${tokenId}/opd`, { opd_id: opdId });
    },
};

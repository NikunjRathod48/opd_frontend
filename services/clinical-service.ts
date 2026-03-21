import { api } from "@/lib/api";
import { Diagnosis, Medicine, Procedure, Test, Department, MasterDataType } from "@/types/clinical";

export const clinicalService = {
    // --- Generic Fetch ---
    getAll: async <T>(type: MasterDataType, hospitalId?: number) => {
        const query = hospitalId ? `?hospital_id=${hospitalId}` : "";
        return api.get<T[]>(`/master-data/${type}${query}`);
    },

    create: async <T>(type: MasterDataType, data: any, hospitalId?: number) => {
        const query = hospitalId ? `?hospital_id=${hospitalId}` : "";
        return api.post<T>(`/master-data/${type}${query}`, data);
    },

    update: async <T>(type: MasterDataType, id: number, data: any, hospitalId?: number) => {
        const query = hospitalId ? `?hospital_id=${hospitalId}` : "";
        return api.put<T>(`/master-data/${type}/${id}${query}`, data);
    },

    toggleStatus: async (type: MasterDataType, id: number) => {
        return api.patch(`/master-data/${type}/${id}/status`, {});
    },

    // --- Specific Helpers (Typed) ---

    getDiagnoses: (hospitalId?: number) => clinicalService.getAll<Diagnosis>('diagnoses', hospitalId),
    getMedicines: (hospitalId?: number) => clinicalService.getAll<Medicine>('medicines', hospitalId),
    getTests: (hospitalId?: number) => clinicalService.getAll<Test>('tests', hospitalId),
    getDepartments: (hospitalId?: number) => clinicalService.getAll<Department>('departments', hospitalId), // Usually generic, no hospital specific for dept list often

    // Helpers to create payloads
    createDiagnosis: (data: Partial<Diagnosis>, hospitalId?: number) => clinicalService.create<Diagnosis>('diagnoses', data, hospitalId),
    updateDiagnosis: (id: number, data: Partial<Diagnosis>, hospitalId?: number) => clinicalService.update<Diagnosis>('diagnoses', id, data, hospitalId),

    createMedicine: (data: Partial<Medicine>, hospitalId?: number) => clinicalService.create<Medicine>('medicines', data, hospitalId),
    updateMedicine: (id: number, data: Partial<Medicine>, hospitalId?: number) => clinicalService.update<Medicine>('medicines', id, data, hospitalId),

    createTest: (data: Partial<Test>, hospitalId?: number) => clinicalService.create<Test>('tests', data, hospitalId),
    updateTest: (id: number, data: Partial<Test>, hospitalId?: number) => clinicalService.update<Test>('tests', id, data, hospitalId),

    createDepartment: (data: Partial<Department>, hospitalId?: number) => clinicalService.create<Department>('departments', data, hospitalId),
    updateDepartment: (id: number, data: Partial<Department>, hospitalId?: number) => clinicalService.update<Department>('departments', id, data, hospitalId),

    getProcedures: (hospitalId?: number) => clinicalService.getAll<Procedure>('procedures', hospitalId),
    createProcedure: (data: Partial<Procedure>, hospitalId?: number) => clinicalService.create<Procedure>('procedures', data, hospitalId),
    updateProcedure: (id: number, data: Partial<Procedure>, hospitalId?: number) => clinicalService.update<Procedure>('procedures', id, data, hospitalId),

};

import type { OpdVisit } from "@/services/opd-service";

// ─── State ────────────────────────────────────────────────────────────────────

export type DiagEntry  = NonNullable<OpdVisit["opd_diagnoses"]>[number];
export type TestEntry  = NonNullable<OpdVisit["opd_tests"]>[number];
export type ProcEntry  = NonNullable<OpdVisit["opd_procedures"]>[number];
export type RxEntry    = NonNullable<OpdVisit["prescriptions"]>[number];

export interface ClinicalState {
    diagnoses:     DiagEntry[];
    tests:         TestEntry[];
    procedures:    ProcEntry[];
    medicines:     RxEntry[];        // prescriptions
}

export const emptyClinical: ClinicalState = {
    diagnoses:  [],
    tests:      [],
    procedures: [],
    medicines:  [],
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ClinicalAction =
    | { type: "RESET";           payload: ClinicalState }
    | { type: "ADD_DIAGNOSIS";   payload: DiagEntry }
    | { type: "ADD_TEST";        payload: TestEntry }
    | { type: "ADD_PROCEDURE";   payload: ProcEntry }
    | { type: "ADD_MEDICINE";    payload: RxEntry };

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function clinicalReducer(state: ClinicalState, action: ClinicalAction): ClinicalState {
    switch (action.type) {
        case "RESET":         return action.payload;
        case "ADD_DIAGNOSIS": return { ...state, diagnoses:  [...state.diagnoses,  action.payload] };
        case "ADD_TEST":      return { ...state, tests:      [...state.tests,      action.payload] };
        case "ADD_PROCEDURE": return { ...state, procedures: [...state.procedures, action.payload] };
        case "ADD_MEDICINE":  return { ...state, medicines:  [...state.medicines,  action.payload] };
        default:              return state;
    }
}

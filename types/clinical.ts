
export interface Department {
    department_id: number;
    department_name: string;
    department_code: string;
    description?: string;

    // Hospital specific
    is_active_in_hospital?: boolean;
    is_linked?: boolean;
    hospital_record_id?: number;
}

export interface Diagnosis {
    diagnosis_id: number;
    diagnosis_code: string;
    diagnosis_name: string;
    description: string;
    department_id: number;
    departments_master?: Department; // Joined data

    // Hospital specific (mapped in service)
    is_active_in_hospital?: boolean;
    is_linked?: boolean;
    hospital_record_id?: number;
}

export interface Medicine {
    medicine_id: number;
    medicine_code: string;
    medicine_name: string;
    medicine_type: string;
    strength: string;
    manufacturer: string;
    is_active: boolean; // Master active status

    // Hospital specific
    price?: number;
    stock_quantity?: number;
    is_active_in_hospital?: boolean;
    is_linked?: boolean;
    hospital_record_id?: number;
}

export interface Test {
    test_id: number;
    test_code: string;
    test_name: string;
    test_type: string;
    department_id: number;
    description: string;
    is_active: boolean;
    departments_master?: Department;

    // Hospital specific
    price?: number;
    is_active_in_hospital?: boolean;
    is_linked?: boolean;
    hospital_record_id?: number;
}

export interface Procedure {
    procedure_id: number;
    procedure_code: string;
    procedure_name: string;
    description?: string;
    is_active: boolean;

    // Hospital specific
    price?: number;
    is_active_in_hospital?: boolean;
    is_linked?: boolean;
    hospital_record_id?: number;
}

// Master Data Types mapping for API/Service convenience
export type MasterDataType = 'diagnoses' | 'medicines' | 'tests' | 'departments' | 'treatments' | 'procedures';

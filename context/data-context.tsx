"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./auth-context";

// --- Database Schema Types ---

export type UserRole = 'SuperAdmin' | 'GroupAdmin' | 'HospitalAdmin' | 'Doctor' | 'Patient' | 'Receptionist';

export interface User {
    userid: string;
    email: string;
    phoneno: string;
    role: UserRole;
    isactive: boolean;
    name: string;
    hospitalgroupid?: string;
    hospitalid?: string;
    joiningDate?: string;
    profile_image_url?: string;
    employeeid?: string;
}

export interface HospitalGroup {
    hospitalgroupid: string;
    groupname: string;
    contactemail: string;
    contactno: string;
    address: string;
}

export interface Hospital {
    hospitalid: string;
    hospitalgroupid: string;
    hospitalname: string;
    address: string;
    receptionistcontact: string;
    type: "General" | "Specialized" | "Clinic";
    bedCount: number;
}

export interface BloodGroup {
    bloodgroupid: string;
    bloodgroupname: string;
}

export interface Specialization {
    specializationid: string;
    specializationname: string;
}

export interface DiagnosisType {
    diagnosistypeid: string;
    diagnosisname: string;
}

export interface TreatmentType {
    treatmenttypeid: string;
    treatmentname: string;
}

export interface SubTreatmentType {
    subtreatmenttypeid: string;
    treatmenttypeid: string;
    subtreatmentname: string;
    rate: number;
    is_linked?: boolean;
}

export interface Medicine {
    medicine_id: string;
    medicine_name: string;
    medicine_type: string;
    strength: string;
    stock_quantity?: number;
    is_linked?: boolean;
}

export interface TestType {
    test_id: string;
    test_name: string;
    test_type: string;
    price: number;
    is_linked?: boolean;
}

export interface Doctor {
    doctorid: string;
    userid: string;
    hospitalid: string;
    departmentid: string;
    doctorname: string;
    specializationid: string;
    isactive: boolean;
    specializationName?: string;
    departmentName?: string;
    hospitalName?: string;
    email?: string;
    contact?: string;
    qualification?: string;
    experience?: number;
    fees?: number;
    profile_image_url?: string;
    gender?: string;
    consultation_fees?: number;
    medical_license_no?: string;
}

export interface Receptionist {
    receptionistid: string;
    userid: string;
    hospitalid: string;
    name: string;
    email: string;
    contact: string;
    isactive: boolean;
    joiningDate?: string;
    profile_image_url?: string;
}

export interface State {
    state_id: string;
    state_name: string;
    state_code: string;
}

export interface City {
    city_id: string;
    state_id: string;
    city_name: string;
    city_code: string;
}

export interface Patient {
    patientid: string;
    userid?: string;
    hospitalid?: string;
    patient_no?: string;
    patientname: string;
    gender: "Male" | "Female" | "Other";
    age?: number;
    dob?: string;
    blood_group_id?: string;
    bloodgroupid?: string;
    registrationdate?: string;
    isactive?: boolean;
    bloodgroupName?: string;
    phone_number?: string;
    contact?: string;
    email?: string;
    address?: string;
    city_id?: number;
    state_id?: number;
    pincode?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    is_walk_in?: boolean;
    condition?: string;
    lastVisit?: string;
}

export interface Appointment {
    appointmentid: string;
    hospitalid: string;
    patientid: string;
    doctorid: string;
    appointmentdatetime: string;
    status: 'Scheduled' | 'Checked-In' | 'Completed' | 'Cancelled' | 'No-Show' | 'Rescheduled';
    patientName?: string;
    doctorName?: string;
    type?: string;
    appointmentno?: string;
}

export interface OPDVisit {
    opdid: string;
    hospitalid: string;
    patientid: string;
    doctorid: string;
    opdno: string;
    visitdatetime: string;
    isfollowup: boolean;
    notes?: string;
    diagnosis?: string;
    status: "Active" | "Discharged";
    patientName?: string;
    doctorName?: string;
}

export interface ReceiptItem {
    receiptitemid?: string;
    subtreatmenttypeid: string;
    description: string;
    qty: number;
    rate: number;
    amount: number;
    isPaid?: boolean;
}

export interface Receipt {
    receiptid: string;
    hospitalid: string;
    opdid?: string;
    receiptnumber: string;
    receiptdate: string;
    subtotalamount?: number;
    taxamount?: number;
    discountamount?: number;
    totalamount: number;
    paidamount?: number;
    paymentmodeid: string;
    status: 'Paid' | 'Pending' | 'Refunded' | 'Cancelled' | 'Partially Paid';
    billingstatus?: 'Draft' | 'Finalized' | 'Cancelled';
    items: ReceiptItem[];
    patientName?: string;
    paymentModeName?: string;
    referenceNumber?: string;
    patientid?: string;
}

export interface PharmacyPrescription {
    prescription_id: number;
    visit_id: number;
    doctor_id: number;
    prescribed_date: string;
    notes?: string;
    status: 'Pending' | 'Dispensed';
    prescription_items: any[];
    doctors?: any;
    opd_visits?: any;
}

export interface LaboratoryTest {
    opd_test_id: number;
    visit_id: number;
    test_id: number;
    test_status: string;
    result_summary?: string;
    ordered_at: string;
    completed_at?: string;
    tests?: { test_name: string; test_code: string; department_id: number };
    opd_visits?: {
        opd_no: string;
        patients?: { users_patients_user_idTousers?: { full_name: string; phone_number: string } };
        doctors?: { users_doctors_user_idTousers?: { full_name: string } };
    };
}

// --- CONSTANTS ---
const BLOOD_GROUPS: BloodGroup[] = [
    { bloodgroupid: '1', bloodgroupname: 'A+' },
    { bloodgroupid: '2', bloodgroupname: 'A-' },
    { bloodgroupid: '3', bloodgroupname: 'B+' },
    { bloodgroupid: '4', bloodgroupname: 'B-' },
    { bloodgroupid: '5', bloodgroupname: 'O+' },
    { bloodgroupid: '6', bloodgroupname: 'O-' },
    { bloodgroupid: '7', bloodgroupname: 'AB+' },
    { bloodgroupid: '8', bloodgroupname: 'AB-' },
];

const SPECIALIZATIONS: Specialization[] = [
    { specializationid: '1', specializationname: 'General Physician' },
    { specializationid: '2', specializationname: 'Cardiologist' },
    { specializationid: '3', specializationname: 'Dermatologist' },
    { specializationid: '4', specializationname: 'Orthopedic' },
    { specializationid: '5', specializationname: 'Dentist' },
    { specializationid: '6', specializationname: 'Neurologist' },
];

interface DataContextType {
    // Entities
    hospitalGroups: HospitalGroup[];
    hospitals: Hospital[];
    admins: User[];
    doctors: Doctor[];
    receptionists: Receptionist[];
    patients: Patient[];
    treatments: TreatmentType[];
    subTreatments: SubTreatmentType[];
    appointments: Appointment[];
    opdVisits: OPDVisit[];
    receipts: Receipt[];
    diagnoses: DiagnosisType[];
    medicines: Medicine[];
    tests: TestType[];

    // Masters
    bloodGroups: BloodGroup[];
    specializations: Specialization[];
    states: State[];
    getCities: (stateId: string) => Promise<City[]>;

    // Fetch methods
    fetchHospitalGroups: () => void;
    fetchHospitals: () => void;
    fetchAdmins: () => void;
    fetchDoctors: () => void;
    fetchReceptionists: () => void;
    fetchPatients: () => Promise<void>;

    // Data Actions
    addHospitalGroup: (g: any) => void;
    updateHospitalGroup: (id: string, g: Partial<HospitalGroup>) => void;
    addHospital: (h: any) => void;
    addAdmin: (u: any) => void;
    updateAdmin: (id: string, u: Partial<User>) => Promise<void>;
    toggleAdminStatus: (id: string) => Promise<void>;
    addDoctor: (d: any) => void;
    updateDoctor: (id: string, d: Partial<Doctor>) => void;
    addReceptionist: (r: any) => void;
    updateReceptionist: (id: string, r: Partial<Receptionist>) => void;
    deleteReceptionist: (id: string) => void;

    addTreatmentType: (t: any) => void;
    updateTreatmentType: (id: string, t: Partial<TreatmentType>) => void;
    deleteTreatmentType: (id: string) => void;
    addSubTreatmentType: (st: any) => void;
    updateSubTreatmentType: (id: string, st: Partial<SubTreatmentType>) => void;
    deleteSubTreatmentType: (id: string) => void;

    updateMedicine: (id: string, data: Partial<Medicine>) => Promise<void>;

    addPatient: (p: any) => Promise<{ success: boolean; error?: string; data?: any }>;
    updatePatient: (id: string, p: Partial<Patient>) => Promise<{ success: boolean; error?: string }>;
    deleteDoctor: (id: string) => void;
    addAppointment: (a: any) => void;
    updateAppointment: (id: string, a: Partial<Appointment>) => void;
    deleteAppointment: (id: string) => void;
    updateOPDVisit: (id: string, d: Partial<OPDVisit>) => void;
    addReceipt: (r: any) => void;
    updateReceipt: (id: string, r: Partial<Receipt>) => void;
    updateHospital: (id: string, h: Partial<Hospital>) => void;
    deleteHospital: (id: string) => void;
    refreshAdmins: () => Promise<void>;
    refreshReceptionists: () => Promise<void>;
    refreshDoctors: () => Promise<void>;
    fetchAppointments: () => Promise<void>;
    fetchAvailableSlots: (doctorId: string, date: string, patientId?: string) => Promise<{ slots: any[]; existingAppointment: { time: string; status: string } | null }>;
    fetchOPDVisits: () => Promise<void>;
    savePrescription: (data: any) => Promise<void>;
    saveOpdTests: (data: any) => Promise<void>;
    saveOpdProcedures: (data: any) => Promise<void>;
    saveBill: (data: any) => Promise<void>;
    updateBill: (id: string, data: any) => Promise<void>;
    payBill: (id: string, data: any) => Promise<void>;
    fetchReceipts: () => Promise<void>;
    getOpdDetails: (id: string) => Promise<any>;
    fetchPendingPrescriptions: (hospitalId: string) => Promise<PharmacyPrescription[]>;
    dispensePrescription: (id: string) => Promise<void>;
    fetchMedicines: () => Promise<void>;
    fetchPendingLabTests: (hospitalId: string) => Promise<LaboratoryTest[]>;
    updateLabTestResult: (id: string, status: string, summary?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    // State
    const [hospitalGroups, setHospitalGroups] = useState<HospitalGroup[]>([]);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [admins, setAdmins] = useState<User[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [treatments, setTreatments] = useState<TreatmentType[]>([]);
    const [subTreatments, setSubTreatments] = useState<SubTreatmentType[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [opdVisits, setOpdVisits] = useState<OPDVisit[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [diagnoses, setDiagnoses] = useState<DiagnosisType[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [tests, setTests] = useState<TestType[]>([]);
    const [specializations, setSpecializations] = useState<Specialization[]>([]);
    const [bloodGroups, setBloodGroups] = useState<BloodGroup[]>([]);

    const { user } = useAuth();
    const [states, setStates] = useState<State[]>([]);

    // --- DATA FETCHING ---

    const fetchDoctors = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/doctors"));
            if (Array.isArray(data)) {
                const mappedDoctors: Doctor[] = data.map(d => ({
                    doctorid: d.doctor_id?.toString() || "",
                    userid: d.user_id?.toString() || "",
                    hospitalid: d.hospital_id?.toString() || "",
                    departmentid: d.department_id?.toString() || "",
                    doctorname: d.name || "Unknown",
                    specializationid: d.specialization_id?.toString() || "",
                    specializationName: d.specializationName || d.specialization_name || "General",
                    departmentName: d.departmentName || d.department_name || "General",
                    hospitalName: d.hospitalName || d.hospital_name || "Unknown",
                    email: d.email || "",
                    contact: d.phone || "",
                    qualification: d.qualification || "",
                    experience: d.experience_years || 0,
                    fees: d.consultation_fees || 0,
                    consultation_fees: d.consultation_fees || 0,
                    profile_image_url: d.profile_image || "",
                    isactive: d.is_active ?? true,
                    medical_license_no: d.medical_license_no || "",
                    gender: d.gender || "Other",
                }));
                setDoctors(mappedDoctors);
            }
        } catch (err) {
            console.error("Failed to fetch doctors", err);
        }
    };

    const fetchSpecializations = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/doctors/specializations"));
            if (Array.isArray(data)) {
                setSpecializations(data.map(s => ({
                    specializationid: s.specialization_id?.toString() || "",
                    specializationname: s.specialization_name || "Unknown"
                })));
            }
        } catch (err) {
            console.error("Failed to fetch specializations", err);
        }
    };

    const fetchBloodGroups = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/master-data/blood_groups"));
            if (Array.isArray(data)) {
                setBloodGroups(data.map(b => ({
                    bloodgroupid: b.blood_group_id?.toString() || "",
                    bloodgroupname: b.blood_group_name || "Unknown"
                })));
            }
        } catch (err) {
            console.error("Failed to fetch blood groups", err);
        }
    };

    const fetchAdmins = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/hospitals/admins"));
            const mappedAdmins: User[] = data.map(u => {
                const empRelation = u.employees_employees_user_idTousers;
                const hospitalEmp = Array.isArray(empRelation) ? empRelation[0] : empRelation;
                return {
                    userid: u.user_id.toString(),
                    email: u.email,
                    phoneno: u.phone_number,
                    role: 'HospitalAdmin',
                    isactive: u.is_active,
                    name: u.full_name,
                    hospitalid: hospitalEmp?.hospitals?.hospital_id?.toString() || "",
                    hospitalgroupid: hospitalEmp?.hospital_group_id?.toString() || u.hospital_group_id?.toString() || "",
                    profile_image_url: u.profile_image_url,
                    joiningDate: hospitalEmp?.joining_date ? new Date(hospitalEmp.joining_date).toISOString().split('T')[0] : undefined,
                    employeeid: hospitalEmp?.employee_id?.toString()
                };
            });
            setAdmins(mappedAdmins);
        } catch (err) {
            console.error("Failed to fetch admins", err);
        }
    };

    const fetchReceptionists = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/hospitals/receptionists"));
            const mappedReceptionists: Receptionist[] = data.map(u => {
                const empRelation = u.employees_employees_user_idTousers;
                const hospitalEmp = Array.isArray(empRelation) ? empRelation[0] : empRelation;
                return {
                    receptionistid: u.user_id.toString(),
                    userid: u.user_id.toString(),
                    name: u.full_name,
                    email: u.email,
                    contact: u.phone_number,
                    hospitalid: hospitalEmp?.hospitals?.hospital_id?.toString() || "",
                    isactive: u.is_active,
                    joiningDate: hospitalEmp?.joining_date ? new Date(hospitalEmp.joining_date).toISOString().split('T')[0] : undefined,
                    profile_image_url: u.profile_image_url
                };
            });
            setReceptionists(mappedReceptionists);
        } catch (err) {
            console.error("Failed to fetch receptionists", err);
        }
    };

    const fetchPatients = async () => {
        try {
            let url = '/patients';
            if (user?.role === 'Patient') {
                url = `/patients?patient_user_id=${user.id}`;
            } else if (['HospitalAdmin', 'Receptionist', 'Doctor'].includes(user?.role || '') && user?.hospitalid) {
                const hid = String(user.hospitalid).replace(/\D/g, '');
                if (hid) url = `/patients?hospital_id=${hid}`;
            }
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(url));
            if (Array.isArray(data)) {
                const mappedPatients: Patient[] = data.map(p => ({
                    patientid: p.patient_id.toString(),
                    userid: p.user_id?.toString() || "",
                    patient_no: p.patient_no || "",
                    patientname: p.users_patients_user_idTousers?.full_name || p.emergency_contact_name || "Unknown",
                    gender: p.gender || "Other",
                    dob: p.dob || "",
                    age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 0,
                    phone_number: p.phone_number || "",
                    contact: p.phone_number || "",
                    email: p.email || p.users_patients_user_idTousers?.email || "",
                    address: p.address || "",
                    isactive: p.is_active,
                    blood_group_id: p.blood_group_id,
                    bloodgroupName: p.blood_groups?.blood_group_name || "",
                    registrationdate: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : "",
                    is_walk_in: p.is_walk_in || false,
                    city_id: p.city_id,
                    state_id: p.state_id,
                    pincode: p.pincode || "",
                    emergency_contact_name: p.emergency_contact_name || "",
                    emergency_contact_number: p.emergency_contact_number || "",
                    hospitalid: p.hospital_group_id?.toString() || ""
                }));
                setPatients(mappedPatients);
            }
        } catch (err) {
            console.error("Failed to fetch patients", err);
        }
    };

    const fetchAppointments = async () => {
        try {
            let url = '/appointments';
            if (user?.role === 'Patient') {
                url += `?patient_user_id=${user.id}`;
            } else if (user?.role === 'Doctor') {
                // Fetch the doctor profile first if needed to get doctor_id
                // We rely on already-cached doctors context; fall back to user_id-based lookup
                const doctorProfile = doctors.find(d => String(d.userid) === String(user.id));
                const doctorId = doctorProfile?.doctorid || (user as any)?.doctorid;
                if (doctorId) url += `?doctor_id=${doctorId}`;
            } else if (user?.hospitalid) {
                url += `?hospital_id=${user.hospitalid}`;
            }
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(url));
            const mappedAppointments: Appointment[] = data.map(a => ({
                appointmentid: a.appointmentid.toString(),
                hospitalid: a.hospitalid.toString(),
                patientid: a.patientid.toString(),
                doctorid: a.doctorid.toString(),
                appointmentdatetime: a.appointmentdatetime,
                status: a.status,
                patientName: a.patientName,
                doctorName: a.doctorName,
                type: a.type,
                appointmentno: a.appointmentno || '',
            }));
            setAppointments(mappedAppointments);
        } catch (err) {
            console.error("Failed to fetch appointments", err);
        }
    };

    const fetchAvailableSlots = async (doctorId: string, date: string, patientId?: string) => {
        try {
            let url = `/appointments/availability?doctor_id=${doctorId}&date=${date}`;
            if (patientId) url += `&patient_id=${patientId}`;
            const data = await import("@/lib/api").then(m => m.api.get<{ slots: any[]; existingAppointment: { time: string; status: string } | null }>(url));
            return { slots: data.slots || [], existingAppointment: data.existingAppointment || null };
        } catch (err) {
            console.error("Failed to fetch available slots", err);
            return { slots: [], existingAppointment: null };
        }
    };

    const fetchOPDVisits = async () => {
        try {
            let opdUrl = '/opd';
            if (['HospitalAdmin', 'Receptionist', 'Doctor'].includes(user?.role || '') && user?.hospitalid) {
                const hid = String(user.hospitalid).replace(/\D/g, '');
                if (hid) opdUrl = `/opd?hospital_id=${hid}`;
            }
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(opdUrl));
            const mappedOPD: OPDVisit[] = data.map(v => ({
                opdid: v.opdid.toString(),
                hospitalid: v.hospitalid.toString(),
                patientid: v.patientid.toString(),
                doctorid: v.doctorid.toString(),
                opdno: v.opdno,
                visitdatetime: v.visitdatetime,
                isfollowup: false,
                status: v.status,
                patientName: v.patientName,
                doctorName: v.doctorName,
                diagnosis: v.diagnosis,
                notes: v.notes
            }));
            setOpdVisits(mappedOPD);
        } catch (err) {
            console.error("Failed to fetch OPD visits", err);
        }
    };

    const fetchReceipts = async () => {
        try {
            let url = '/billing';
            if (user?.role === 'Patient') {
                url = `/billing?patient_user_id=${user.id}`;
            } else if (['HospitalAdmin', 'Receptionist'].includes(user?.role || '') && user?.hospitalid) {
                // Pass numeric hospital_id — strip any non-numeric prefix like "h1" fallbacks
                const hid = String(user.hospitalid).replace(/\D/g, '');
                if (hid) url = `/billing?hospital_id=${hid}`;
            }
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(url));
            const mappedReceipts: Receipt[] = data.map(b => {
                // Get payment mode name from the payments → payment_modes relation
                const successPayments = (b.payments || []).filter((p: any) => p.payment_status === 'Success');
                const latestPayment = successPayments.length > 0 ? successPayments[successPayments.length - 1] : null;
                const modeName = latestPayment?.payment_modes?.payment_mode_name || b.paymentModeName || 'Cash';
                const modeId = latestPayment?.payment_mode_id?.toString() || '1';

                // Map status: support Partially Paid and Insurance Pending
                let mappedStatus: Receipt['status'] = 'Pending';
                if (b.payment_status === 'Paid') mappedStatus = 'Paid';
                else if (b.payment_status === 'Partially Paid') mappedStatus = 'Partially Paid';
                else if (b.payment_status === 'Insurance Pending') mappedStatus = 'Insurance Pending' as any;
                else if (b.payment_status === 'Cancelled') mappedStatus = 'Cancelled';

                return {
                    receiptid: b.bill_id.toString(),
                    hospitalid: b.hospital_id.toString(),
                    opdid: b.visit_id?.toString(),
                    receiptnumber: b.bill_number,
                    receiptdate: b.created_at,
                    subtotalamount: Number(b.subtotal_amount),
                    taxamount: Number(b.tax_amount),
                    totalamount: Number(b.total_amount),
                    paymentmodeid: modeId,
                    status: mappedStatus,
                    paidamount: successPayments.reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0),
                    patientName: b.patientName || 'Unknown',
                    patientid: b.patientid?.toString() || '',
                    paymentModeName: modeName,
                    referenceNumber: latestPayment?.reference_number,
                    items: b.bill_items?.map((item: any) => {
                        let refId = item.reference_id ? item.reference_id.toString() : '';
                        if (refId && !refId.includes('-')) {
                            if (item.item_type === 'Procedure') refId = `TRT-${refId}`;
                            else if (item.item_type === 'Test') refId = `TST-${refId}`;
                            else if (item.item_type === 'Medicine') refId = `MED-${refId}`;
                        } else if (!refId) {
                            refId = `CUSTOM-${item.bill_item_id}`;
                        }
                        return {
                            receiptitemid: item.bill_item_id.toString(),
                            subtreatmenttypeid: refId,
                            description: item.item_description,
                            qty: item.quantity,
                            rate: Number(item.unit_price),
                            amount: Number(item.total_price)
                        };
                    }) || []
                };
            });
            setReceipts(mappedReceipts);
        } catch (err) {
            console.error("Failed to fetch receipts", err);
        }
    };

    const fetchTreatments = async () => {
        try {
            const hospitalId = user?.hospitalid;
            const url = hospitalId ? `/master-data/treatments?hospital_id=${hospitalId}` : '/master-data/treatments';
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(url));
            const mapped: TreatmentType[] = data.map(t => ({
                treatmenttypeid: t.treatment_type_id.toString(),
                treatmentname: t.treatment_name
            }));
            setTreatments(mapped);
        } catch (err) {
            console.error("Failed to fetch treatments", err);
        }
    };

    const fetchSubTreatments = async () => {
        try {
            const hospitalId = user?.hospitalid;
            const url = hospitalId ? `/master-data/procedures?hospital_id=${hospitalId}` : '/master-data/procedures';
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(url));
            const mapped: SubTreatmentType[] = data.map(p => ({
                subtreatmenttypeid: p.procedure_id.toString(),
                treatmenttypeid: p.treatment_type_id.toString(),
                subtreatmentname: p.procedure_name,
                rate: p.price || 0,
                is_linked: p.is_linked !== false,
            }));
            setSubTreatments(mapped);
        } catch (err) {
            console.error("Failed to fetch procedures", err);
        }
    };

    const fetchMedicines = async () => {
        try {
            const hospitalId = user?.hospitalid;
            const url = hospitalId ? `/master-data/medicines?hospital_id=${hospitalId}` : '/master-data/medicines';
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(url));
            const mapped: Medicine[] = data.map(m => ({
                medicine_id: m.medicine_id?.toString(),
                medicine_name: m.medicine_name,
                medicine_type: m.medicine_type,
                strength: m.strength,
                stock_quantity: m.stock_quantity || 0,
                is_linked: m.is_linked !== false,
            }));
            setMedicines(mapped);
        } catch (err) {
            console.error("Failed to fetch medicines", err);
        }
    };

    const fetchTests = async () => {
        try {
            const hospitalId = user?.hospitalid;
            const url = hospitalId ? `/master-data/tests?hospital_id=${hospitalId}` : '/master-data/tests';
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(url));
            const mapped: TestType[] = data.map(t => ({
                test_id: t.test_id?.toString(),
                test_name: t.test_name,
                test_type: t.test_type,
                price: Number(t.price) || 0,
                is_linked: t.is_linked !== false,
            }));
            setTests(mapped);
        } catch (err) {
            console.error("Failed to fetch tests", err);
        }
    };

    const fetchDiagnoses = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/master-data/diagnoses"));
            const mapped: DiagnosisType[] = data.map(d => ({
                diagnosistypeid: d.diagnosis_id.toString(),
                diagnosisname: d.diagnosis_name
            }));
            setDiagnoses(mapped);
        } catch (err) {
            console.error("Failed to fetch diagnoses", err);
        }
    };

    const fetchStates = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/master/states"));
            const mappedStates: State[] = data.map(s => ({
                state_id: s.state_id.toString(),
                state_name: s.state_name,
                state_code: s.state_code
            }));
            setStates(mappedStates);
        } catch (err) {
            console.error("Failed to fetch states", err);
        }
    };

    const getCities = async (stateId: string): Promise<City[]> => {
        if (!stateId) return [];
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>(`/master/cities/${stateId}`));
            return data.map(c => ({
                city_id: c.city_id.toString(),
                state_id: c.state_id.toString(),
                city_name: c.city_name,
                city_code: c.city_code
            }));
        } catch (err) {
            console.error("Failed to fetch cities", err);
            return [];
        }
    };

    const fetchHospitalGroups = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/hospital-groups"));
            const mappedGroups: HospitalGroup[] = data.map(g => ({
                hospitalgroupid: g.hospital_group_id.toString(),
                groupname: g.group_name,
                contactemail: g.contact_email || "",
                contactno: g.contact_number || "",
                address: g.details || ""
            }));
            setHospitalGroups(mappedGroups);
        } catch (err) {
            console.error("Failed to fetch hospital groups", err);
        }
    };

    const fetchHospitals = async () => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get<any[]>("/hospitals"));
            const mappedHospitals: Hospital[] = data.map(h => ({
                hospitalid: h.hospital_id.toString(),
                hospitalgroupid: h.hospital_group_id.toString(),
                hospitalname: h.hospital_name,
                address: h.address || "",
                receptionistcontact: h.receptionist_contact_number || "",
                type: h.hospital_type || "General",
                bedCount: h.bed_count || 0
            }));
            if (mappedHospitals.length > 0) setHospitals(mappedHospitals);
        } catch (err) {
            console.error("Failed to fetch hospitals", err);
        }
    };

    // --- EFFECT ---

    useEffect(() => {
        if (!user) return;

        const role = user.role;

        // --- Common to ALL authenticated users ---
        fetchDoctors();
        fetchAppointments();
        fetchSpecializations();
        fetchBloodGroups();

        // --- Role-specific fetches ---
        if (role === 'Patient') {
            fetchReceipts();
        } else if (role === 'Doctor') {
            fetchPatients();
            fetchStates(); // Needed for walk-in patient registration form
            fetchOPDVisits();
            fetchTreatments();
            fetchSubTreatments();
            fetchDiagnoses();
            fetchMedicines();
            fetchTests();
        } else if (role === 'Receptionist') {
            fetchPatients();
            fetchStates();
            fetchOPDVisits();
            fetchReceipts();
            fetchTreatments();
            fetchSubTreatments();
            fetchMedicines();
            fetchTests();
        } else if (role === 'HospitalAdmin') {
            // Hospital Admin: manages staff, patients, billing — NO hospital-groups
            fetchAdmins();
            fetchHospitals();
            fetchReceptionists();
            fetchPatients();
            fetchStates();
            fetchOPDVisits();
            fetchReceipts();
            fetchTreatments();
            fetchSubTreatments();
            fetchDiagnoses();
            fetchMedicines();
            fetchTests();
        } else if (role === 'GroupAdmin') {
            // Group Admin: manages hospitals within their group
            fetchHospitalGroups();
            fetchHospitals();
            fetchAdmins();
            fetchReceptionists();
            fetchPatients();
            fetchStates();
            fetchOPDVisits();
            fetchReceipts();
            fetchTreatments();
            fetchSubTreatments();
            fetchDiagnoses();
            fetchMedicines();
            fetchTests();
        } else if (role === 'SuperAdmin') {
            // Super Admin: full access
            fetchHospitalGroups();
            fetchHospitals();
            fetchAdmins();
            fetchReceptionists();
            fetchPatients();
            fetchStates();
            fetchOPDVisits();
            fetchReceipts();
            fetchTreatments();
            fetchSubTreatments();
            fetchDiagnoses();
            fetchMedicines();
            fetchTests();
        }
    }, [user]);

    // --- ACTIONS ---

    const addAppointment = async (a: any) => {
        try {
            // Extract date and time from appointmentdatetime if strict date/time not provided
            let date = a.date;
            let time = a.time;
            if (!date && a.appointmentdatetime) {
                date = a.appointmentdatetime.split('T')[0];
                time = a.appointmentdatetime.split('T')[1].substring(0, 5);
            }

            // Ensure hospital_id is present.
            const hospitalId = a.hospitalid ? Number(a.hospitalid) : (user?.hospitalid ? Number(user.hospitalid) : 0);

            if (!hospitalId) {
                console.error("Hospital ID missing for appointment creation");
                return;
            }

            await import("@/lib/api").then(m => m.api.post("/appointments", {
                hospital_id: hospitalId,
                patient_id: Number(a.patientid),
                doctor_id: Number(a.doctorid),
                appointment_date: date,
                appointment_time: time,
                remarks: a.remarks || a.type
            }));
            fetchAppointments();
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const updateAppointment = async (id: string, a: Partial<Appointment>) => {
        try {
            const payload: any = {};
            if (a.status) payload.appointment_status = a.status;

            // Allow updating date/time if needed (Rescheduling)
            if (a.appointmentdatetime) {
                payload.appointment_date = a.appointmentdatetime.split('T')[0];
                payload.appointment_time = a.appointmentdatetime.split('T')[1].substring(0, 5);
            }

            await import("@/lib/api").then(m => m.api.patch(`/appointments/${id}`, payload));

            if (a.status === 'Checked-In') {
                setTimeout(() => fetchOPDVisits(), 500);
            }
            fetchAppointments();
        } catch (err) {
            console.error(err);
        }
    };

    const updateOPDVisit = async (id: string, d: Partial<OPDVisit>) => {
        try {
            const payload: any = {};
            if (d.notes) payload.clinical_notes = d.notes;
            if (d.diagnosis) payload.diagnosis = d.diagnosis;
            // Handle status change
            if (d.status === 'Discharged') payload.is_active = false;
            // If explicit active status set
            if (d.status === 'Active') payload.is_active = true;

            await import("@/lib/api").then(m => m.api.patch(`/opd/${id}`, payload));
            fetchOPDVisits();
        } catch (err) {
            console.error(err);
        }
    };

    const addPatient = async (patientData: any) => {
        try {
            const newPatient = await import("@/lib/api").then(m => m.api.post<any>("/patients", patientData));
            await fetchPatients();
            return { success: true, data: newPatient };
        } catch (error: any) {
            console.error("Error adding patient:", error);
            return { success: false, error: error.message || 'Failed to add patient' };
        }
    };

    const updatePatient = async (id: string, p: Partial<Patient>) => {
        try {
            const payload = { ...p };
            await import("@/lib/api").then(m => m.api.put(`/patients/${id}`, payload));
            await fetchPatients();
            return { success: true };
        } catch (e: any) {
            console.error("Failed to update patient", e);
            return { success: false, error: e.message || "Failed to update patient" };
        }
    }

    // Placeholders or Simple State Updates
    const addHospitalGroup = (g: any) => setHospitalGroups([...hospitalGroups, { ...g, hospitalgroupid: `g${hospitalGroups.length + 1}` }]);
    const updateHospitalGroup = (id: string, g: Partial<HospitalGroup>) => setHospitalGroups(groups => groups.map(group => group.hospitalgroupid === id ? { ...group, ...g } : group));
    const addHospital = (h: any) => setHospitals([...hospitals, { ...h, hospitalid: `h${hospitals.length + 1}` }]);
    const addAdmin = (u: any) => setAdmins([...admins, { ...u, userid: `admin${admins.length + 1}`, isactive: true }]);

    const updateAdmin = async (id: string, u: Partial<User>) => {
        try {
            const payload: any = { full_name: u.name, email: u.email, phone_number: u.phoneno, joining_date: u.joiningDate };
            await import("@/lib/api").then(m => m.api.put(`/hospitals/admin/${id}`, payload));
            fetchAdmins();
        } catch (error) { console.error(error); }
    };

    const toggleAdminStatus = async (id: string) => {
        try {
            await import("@/lib/api").then(m => m.api.patch(`/hospitals/admin/${id}/status`, {}));
            fetchAdmins();
        } catch (error) { console.error(error); }
    };

    const addDoctor = (d: any) => fetchDoctors();
    const updateDoctor = (id: string, d: Partial<Doctor>) => fetchDoctors();
    const deleteDoctor = (id: string) => fetchDoctors();

    const addReceptionist = (r: any) => fetchReceptionists();
    const updateReceptionist = async (id: string, r: Partial<Receptionist>) => {
        try {
            if (r.hasOwnProperty('isactive')) {
                await import("@/lib/api").then(m => m.api.patch(`/hospitals/receptionist/${id}/status`, {}));
            } else {
                const payload = { full_name: r.name, email: r.email, phone_number: r.contact, joining_date: r.joiningDate };
                await import("@/lib/api").then(m => m.api.put(`/hospitals/receptionist/${id}`, payload));
            }
            fetchReceptionists();
        } catch (err) { console.error(err); }
    };
    const deleteReceptionist = (id: string) => setReceptionists(recs => recs.filter(rec => rec.receptionistid !== id));

    const addTreatmentType = (t: any) => setTreatments([...treatments, { ...t, treatmenttypeid: `tt${treatments.length + 1}` }]);
    const updateTreatmentType = (id: string, t: Partial<TreatmentType>) => setTreatments(prev => prev.map(item => item.treatmenttypeid === id ? { ...item, ...t } : item));
    const deleteTreatmentType = (id: string) => setTreatments(prev => prev.filter(item => item.treatmenttypeid !== id));

    const addSubTreatmentType = (st: any) => setSubTreatments([...subTreatments, { ...st, subtreatmenttypeid: `st${subTreatments.length + 1}` }]);
    const updateSubTreatmentType = (id: string, st: Partial<SubTreatmentType>) => setSubTreatments(prev => prev.map(item => item.subtreatmenttypeid === id ? { ...item, ...st } : item));
    const deleteSubTreatmentType = (id: string) => setSubTreatments(prev => prev.filter(item => item.subtreatmenttypeid !== id));

    const deleteAppointment = (id: string) => { };

    const addReceipt = (r: any) => setReceipts([...receipts, { ...r, receiptid: `r${receipts.length + 1}` }]);
    const updateReceipt = (id: string, r: Partial<Receipt>) => setReceipts(prev => prev.map(item => item.receiptid === id ? { ...item, ...r } : item));
    const updateHospital = (id: string, h: Partial<Hospital>) => setHospitals(hosps => hosps.map(hh => hh.hospitalid === id ? { ...hh, ...h } : hh));
    const deleteHospital = (id: string) => setHospitals(hosps => hosps.filter(hh => hh.hospitalid !== id));

    const savePrescription = async (data: any) => {
        try {
            await import("@/lib/api").then(m => m.api.post("/prescriptions", data));
        } catch (err) { console.error(err); }
    };

    const saveOpdTests = async (data: any) => {
        try {
            await import("@/lib/api").then(m => m.api.post("/opd-tests", data));
        } catch (err) { console.error(err); }
    };

    const saveOpdProcedures = async (data: any) => {
        try {
            await import("@/lib/api").then(m => m.api.post("/opd-procedures", data));
        } catch (err) { console.error(err); }
    };

    const saveBill = async (data: any) => {
        try {
            // Only send fields the backend expects (bill_number, total_amount, statuses are auto-generated)
            const payload = {
                hospital_id: data.hospital_id,
                visit_id: data.visit_id,
                subtotal_amount: data.subtotal_amount,
                tax_amount: data.tax_amount,
                discount_amount: data.discount_amount,
                items: data.items,
            };
            await import("@/lib/api").then(m => m.api.post("/billing", payload));
            await fetchReceipts();
        } catch (err) { console.error(err); throw err; }
    };

    const updateBill = async (id: string, data: any) => {
        try {
            await import("@/lib/api").then(m => m.api.patch(`/billing/${id}`, data));
            await fetchReceipts();
        } catch (err) { console.error(err); }
    };

    const payBill = async (id: string, data: any) => {
        try {
            await import("@/lib/api").then(m => m.api.post(`/billing/${id}/pay`, data));
            await fetchReceipts();
        } catch (err) { console.error(err); throw err; }
    };

    const getOpdDetails = async (id: string) => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get(`/opd/${id}`));
            return data;
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const fetchPendingPrescriptions = async (hospitalId: string) => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get(`/prescriptions/pending/hospital/${hospitalId}`));
            return data as PharmacyPrescription[];
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const dispensePrescription = async (id: string) => {
        try {
            await import("@/lib/api").then(m => m.api.post(`/prescriptions/${id}/dispense`, {}));
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const updateMedicine = async (id: string, data: Partial<Medicine>) => {
        try {
            let url = `/master-data/medicines/${id}`;
            const hid = user?.hospitalid ? String(user.hospitalid).replace(/\D/g, '') : null;
            if (hid) {
                url += `?hospital_id=${hid}`;
            }
            await import("@/lib/api").then(m => m.api.put(url, data));
            await fetchMedicines();
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const fetchPendingLabTests = async (hospitalId: string) => {
        try {
            const data = await import("@/lib/api").then(m => m.api.get(`/opd-tests/pending/hospital/${hospitalId}`));
            return data as LaboratoryTest[];
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const updateLabTestResult = async (id: string, status: string, summary?: string) => {
        try {
            await import("@/lib/api").then(m => m.api.patch(`/opd-tests/${id}`, { test_status: status, result_summary: summary }));
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const contextValue: DataContextType = {
        hospitalGroups, hospitals, admins, doctors, receptionists, patients,
        treatments, subTreatments, appointments, opdVisits, receipts, diagnoses, medicines, tests,
        bloodGroups: bloodGroups.length > 0 ? bloodGroups : BLOOD_GROUPS, specializations: specializations.length > 0 ? specializations : SPECIALIZATIONS,
        states, getCities,
        addHospitalGroup, updateHospitalGroup, addHospital, addAdmin, updateAdmin, toggleAdminStatus,
        addDoctor, updateDoctor, deleteDoctor,
        addReceptionist, updateReceptionist, deleteReceptionist,
        addTreatmentType, updateTreatmentType, deleteTreatmentType,
        addSubTreatmentType, updateSubTreatmentType, deleteSubTreatmentType,
        addPatient, updatePatient,
        addAppointment, updateAppointment, deleteAppointment,
        updateOPDVisit, addReceipt, updateReceipt,
        updateHospital, deleteHospital,
        fetchHospitalGroups,
        fetchHospitals,
        fetchAdmins,
        fetchDoctors,
        fetchReceptionists,
        refreshAdmins: fetchAdmins,
        refreshReceptionists: fetchReceptionists,
        fetchPendingPrescriptions,
        dispensePrescription,
        fetchMedicines,
        updateMedicine,
        refreshDoctors: fetchDoctors,
        fetchAppointments,
        fetchAvailableSlots,
        fetchOPDVisits,
        fetchPatients,
        savePrescription,
        saveOpdTests,
        saveOpdProcedures,
        saveBill,
        updateBill,
        payBill,
        fetchReceipts,
        getOpdDetails,
        fetchPendingLabTests,
        updateLabTestResult
    };

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within DataProvider");
    return context;
}
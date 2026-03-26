"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, Pencil, Eye, X, Phone, AlertCircle, Droplet, Filter, Users, UserCheck, MapPin, Mail, HeartPulse, ChevronRight, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { City, useData, Patient } from "@/context/data-context";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useApi } from "@/hooks/use-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Switch } from "@/components/ui/switch";
import React from "react";

// ─── Schema ───────────────────────────────────────────────────────────────────

const patientSchema = z.object({
    full_name:                z.string().min(1, "Name is required"),
    dob:                      z.string().min(1, "Date of Birth is required"),
    gender:                   z.string().min(1, "Gender is required"),
    blood_group_id:           z.string().optional(),
    phone_number:             z.string().min(10, "Valid phone required").optional().or(z.literal("")),
    email:                    z.email("Invalid email").optional().or(z.literal("")),
    address:                  z.string().min(1, "Address is required"),
    city_id:                  z.string().optional(),
    state_id:                 z.string().optional(),
    pincode:                  z.string().min(4, "Invalid Pincode").max(6, "Invalid Pincode"),
    emergency_contact_name:   z.string().optional(),
    emergency_contact_number: z.string().optional(),
    is_walk_in:               z.boolean().optional(),
    hospital_group_id:        z.number().optional(),
});
type PatientFormValues = z.infer<typeof patientSchema>;

// ─── Motion variants ──────────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.055 } },
};
const cardVariants:import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show:   { opacity: 1, y: 0,  scale: 1,    transition: { type: "spring", stiffness: 280, damping: 24 } },
};

// ─── Avatar gradient palette ──────────────────────────────────────────────────

const GRADIENTS = [
    "from-blue-500 to-cyan-500",    "from-violet-500 to-purple-500",
    "from-emerald-500 to-teal-500", "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500", "from-indigo-500 to-blue-500",
    "from-teal-500 to-emerald-500", "from-fuchsia-500 to-violet-500",
];
const getGrad = (name: string) => GRADIENTS[(name?.charCodeAt(0) || 0) % GRADIENTS.length];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateAge = (dob: string) => {
    if (!dob) return "";
    const today = new Date(), birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

// ─── Bone skeleton primitive ──────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-xl bg-muted/60", className)} />;
}

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────

function StatCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 animate-pulse">
            <Bone className="h-10 w-10 rounded-xl mb-4" />
            <Bone className="h-8 w-12 mb-2" />
            <Bone className="h-3 w-24" />
        </div>
    );
}

// ─── Patient Card Skeleton ────────────────────────────────────────────────────

function PatientCardSkeletonContent() {
    return (
        <>
            <Bone className="h-1.5 w-full rounded-none" />
            <div className="p-5 space-y-4">
                {/* Avatar + name row */}
                <div className="flex items-center gap-3">
                    <Bone className="h-14 w-14 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Bone className="h-4 w-36" />
                        <Bone className="h-4 w-20 rounded-full" />
                    </div>
                </div>
                {/* Info tiles */}
                <div className="grid grid-cols-2 gap-2">
                    <Bone className="h-16 rounded-xl" />
                    <Bone className="h-16 rounded-xl" />
                </div>
                {/* Address */}
                <Bone className="h-10 rounded-xl" />
                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                    <Bone className="flex-1 h-9 rounded-xl" />
                    <Bone className="w-10 h-9 rounded-xl" />
                </div>
            </div>
        </>
    );
}

function PatientCardSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}
            className="rounded-3xl border border-border/50 bg-card overflow-hidden"
        >
            <PatientCardSkeletonContent />
        </motion.div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconBg, glow, delay }: {
    label: string; value: number; icon: any; iconBg: string; glow: string; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.38, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 group hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300"
        >
            <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity", glow)} />
            <div className="relative z-10">
                <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center mb-4", iconBg)}>
                    <Icon className="h-[18px] w-[18px]" />
                </div>
                <p className="text-3xl font-bold tabular-nums tracking-tight leading-none">{value}</p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">{label}</p>
            </div>
        </motion.div>
    );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────

function PatientCard({ patient, bloodGroups, onView, onEdit, actionLoading }: {
    patient: Patient; bloodGroups: any[]; onView: () => void; onEdit: () => void; actionLoading: string | null;
}) {
    const isSaving = actionLoading === `${patient.patientid}-saving`;
    const grad    = getGrad(patient.patientname);
    const isWalkIn= patient.is_walk_in;
    const bloodName = bloodGroups.find(b => b.bloodgroupid === patient.blood_group_id?.toString())?.bloodgroupname;

    return (
        <motion.div variants={cardVariants} layout
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
            className="group relative rounded-3xl border border-border/50 bg-card overflow-hidden hover:border-border hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300"
        >
            {isSaving ? (
                <PatientCardSkeletonContent />
            ) : (
                <>
                    {/* Accent bar */}
                    <div className={cn("absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r transition-all", isWalkIn ? "from-amber-400 to-orange-500" : "from-blue-400 to-indigo-500")} />
                    {/* Hover glow */}
                    <div className="absolute -top-14 -right-14 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Action buttons — reveal on hover */}
                    <div className="absolute top-5 right-4 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                        <Tooltip content="View Profile" side="left">
                            <button onClick={onView} disabled={actionLoading !== null} className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all disabled:opacity-50">
                                {actionLoading === `${patient.patientid}-view` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </Tooltip>
                        <Tooltip content="Edit" side="left">
                            <button onClick={e => { e.stopPropagation(); onEdit(); }} disabled={actionLoading !== null} className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all disabled:opacity-50">
                                {actionLoading === `${patient.patientid}-edit` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" /> : <Pencil className="h-3.5 w-3.5" />}
                            </button>
                        </Tooltip>
                    </div>

                    <div className="pt-7 px-5 pb-5 relative z-10">
                        {/* Avatar + name */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={cn("relative h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold shadow-sm shrink-0 group-hover:scale-105 transition-transform", grad)}>
                                {patient.patientname?.charAt(0) || "P"}
                                <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background shadow-sm", patient.isactive ? "bg-emerald-500" : "bg-slate-400")} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-bold text-foreground/90 truncate leading-tight">{patient.patientname}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {patient.patient_no && !patient.patient_no.startsWith("P-") && patient.patient_no !== "PENDING" ? (
                                        <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md text-[10px] font-bold patient-mono">{patient.patient_no}</span>
                                    ) : (
                                        <span className="inline-block bg-muted/60 border border-border/50 text-muted-foreground px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">No UHID</span>
                                    )}
                                    {bloodName && (
                                        <span className="inline-flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                            <Droplet className="h-2.5 w-2.5" />{bloodName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info tiles */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Demographics</p>
                                <p className="text-sm font-bold text-foreground/80">{patient.gender?.charAt(0)}, {calculateAge(patient.dob || "")}y</p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3 overflow-hidden">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />Contact</p>
                                <p className="text-sm font-bold text-foreground/80 truncate patient-mono">{patient.phone_number || "—"}</p>
                            </div>
                        </div>

                        {/* Address */}
                        {patient.address && (
                            <div className="flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2.5 mb-3">
                                <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                <p className="text-[12px] font-medium text-muted-foreground truncate">{patient.address}</p>
                            </div>
                        )}

                        {/* Walk-in badge */}
                        {isWalkIn && (
                            <div className="mb-3">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                    Walk-in
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </motion.div>
    );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
    return (
        <div className={cn("flex items-center gap-2 pb-2.5 border-b border-border/50 mb-4", color)}>
            <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", color.includes("blue") ? "bg-blue-50 dark:bg-blue-950/40" : color.includes("rose") ? "bg-rose-50 dark:bg-rose-950/40" : "bg-muted/50")}>
                <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientListProps {
    allowedRoles?: UserRole[];
    readOnly?: boolean;
    hospitalId?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatientList({
    allowedRoles = ["SuperAdmin", "GroupAdmin", "HospitalAdmin", "Doctor", "Receptionist"],
    readOnly = false,
    hospitalId,
}: PatientListProps) {
    const { addPatient, updatePatient, bloodGroups, states, getCities } = useData();
    const { user }     = useAuth();
    const { addToast } = useToast();

    let apiUrl = '/patients';
    if (user?.role === 'Patient') {
        apiUrl = `/patients?patient_user_id=${user.id}`;
    } else if (['HospitalAdmin', 'Receptionist', 'Doctor'].includes(user?.role || '') && user?.hospitalid) {
        const hid = String(user.hospitalid).replace(/\D/g, '');
        if (hid) apiUrl = `/patients?hospital_id=${hid}`;
    }

    const { data: apiPatients = [], isLoading: isPatientsLoading, isValidating: isRefreshing, mutate: fetchPatients } = useApi<any[]>(apiUrl);

    const [isRegisterOpen,  setIsRegisterOpen]  = useState(false);
    const [viewingPatient,  setViewingPatient]  = useState<any>(null);
    const [editingPatient,  setEditingPatient]  = useState<any>(null);
    const [isEditMode,      setIsEditMode]      = useState(false);
    const [isFilterOpen,    setIsFilterOpen]    = useState(false);
    const [formCityList,    setFormCityList]    = useState<City[]>([]);
    const [filterCityList,  setFilterCityList]  = useState<City[]>([]);
    const [actionLoading,   setActionLoading]   = useState<string | null>(null);

    const mappedPatients = React.useMemo<Patient[]>(() => {
        if (!Array.isArray(apiPatients)) return [];
        return apiPatients.map(p => ({
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
    }, [apiPatients]);

    const defaultFilters = { search: "", gender: "all", bloodGroup: "all", state: "all", city: "all", walkIn: "all" };
    const [tempFilters,    setTempFilters]    = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

    const effectiveHospitalId = hospitalId || (["HospitalAdmin", "Receptionist"].includes(user?.role || "") ? user?.hospitalid : undefined);
    const canRegister = !readOnly && ["SuperAdmin", "GroupAdmin", "HospitalAdmin", "Receptionist", "Doctor"].includes(user?.role || "");

    // ── Form ──────────────────────────────────────────────────────────────────

    const { control, handleSubmit, reset, watch, setValue, register, formState: { errors, isSubmitting } } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: { is_walk_in: false, gender: "Male" },
    });

    const selectedDob   = watch("dob");
    const selectedState = watch("state_id");
    const age = calculateAge(selectedDob);

    useEffect(() => {
        if (selectedState) getCities(selectedState).then(setFormCityList);
        else setFormCityList([]);
    }, [selectedState, getCities]);

    useEffect(() => {
        if (tempFilters.state && tempFilters.state !== "all") getCities(tempFilters.state).then(setFilterCityList);
        else setFilterCityList([]);
    }, [tempFilters.state, getCities]);

    // ── Data fetching ─────────────────────────────────────────────────────────

    const displayPatients = React.useMemo(() => {
        if (!effectiveHospitalId) return mappedPatients;
        return mappedPatients.filter(p => p.hospitalid === effectiveHospitalId.toString());
    }, [mappedPatients, effectiveHospitalId]);

    // ── Options ───────────────────────────────────────────────────────────────

    const bloodGroupOptions = bloodGroups.map(bg => ({ label: bg.bloodgroupname, value: bg.bloodgroupid }));
    const stateOptions      = (states || []).map(s => ({ label: s.state_name, value: s.state_id.toString() }));
    const cityOptions       = formCityList.map(c => ({ label: c.city_name, value: c.city_id.toString() }));
    const filterCityOptions = filterCityList.map(c => ({ label: c.city_name, value: c.city_id.toString() }));
    const genderOptions     = [{ label: "Male", value: "Male" }, { label: "Female", value: "Female" }, { label: "Other", value: "Other" }];

    // ── Filter logic ──────────────────────────────────────────────────────────

    const updateFilter = (key: keyof typeof tempFilters, value: string) =>
        setTempFilters(p => ({ ...p, [key]: value, ...(key === "state" ? { city: "all" } : {}) }));
    const applyFilters  = () => { setAppliedFilters(tempFilters); setIsFilterOpen(false); };
    const resetFilters  = () => { setTempFilters(defaultFilters); setAppliedFilters(defaultFilters); };
    const activeFilters = Object.entries(appliedFilters).filter(([k, v]) => v !== (defaultFilters as any)[k]).length;

    const filteredPatients = displayPatients.filter(p => {
        const { search, gender, bloodGroup, state, city, walkIn } = appliedFilters;
        return (
            (p.patientname?.toLowerCase().includes(search.toLowerCase()) ||
             p.patient_no?.toLowerCase().includes(search.toLowerCase()) ||
             p.phone_number?.includes(search) ||
             p.email?.toLowerCase().includes(search.toLowerCase())) &&
            (gender === "all"     || p.gender === gender) &&
            (bloodGroup === "all" || p.blood_group_id?.toString() === bloodGroup) &&
            (state === "all"      || p.state_id?.toString() === state) &&
            (city === "all"       || p.city_id?.toString() === city) &&
            (walkIn === "all"     || (walkIn === "yes" ? p.is_walk_in : !p.is_walk_in))
        );
    });

    // ── Modal handlers ────────────────────────────────────────────────────────

    const handleOpenRegister = () => {
        setIsEditMode(false); setEditingPatient(null);
        reset({ full_name: "", dob: "", gender: "Male", phone_number: "", email: "", address: "", pincode: "", emergency_contact_name: "", emergency_contact_number: "", is_walk_in: false, state_id: "", city_id: "", blood_group_id: "" });
        setIsRegisterOpen(true);
    };

    const handleView = async (patient: any) => {
        setActionLoading(`${patient.patientid}-view`);
        await new Promise(r => setTimeout(r, 400));
        setViewingPatient(patient);
        setActionLoading(null);
    };

    const handleOpenEdit = async (patient: any) => {
        setActionLoading(`${patient.patientid}-edit`);
        await new Promise(r => setTimeout(r, 400));
        setIsEditMode(true); setEditingPatient(patient);
        reset({
            full_name: patient.patientname,
            dob: patient.dob ? new Date(patient.dob).toISOString().split("T")[0] : "",
            gender: patient.gender as any,
            blood_group_id: patient.blood_group_id?.toString(),
            phone_number: patient.phone_number || "",
            email: patient.email || "",
            address: patient.address || "",
            city_id: patient.city_id?.toString(),
            state_id: patient.state_id?.toString(),
            pincode: patient.pincode || "",
            emergency_contact_name: patient.emergency_contact_name || "",
            emergency_contact_number: patient.emergency_contact_number || "",
            is_walk_in: patient.is_walk_in || false,
            hospital_group_id: patient.hospitalid ? parseInt(patient.hospitalid) : undefined,
        });
        setIsRegisterOpen(true);
        setActionLoading(null);
    };

    const onSubmit: SubmitHandler<PatientFormValues> = async (data) => {
        try {
            const payload = { ...data, gender: data.gender as any, city_id: data.city_id ? parseInt(data.city_id) : undefined, state_id: data.state_id ? parseInt(data.state_id) : undefined, hospital_group_id: 1 };
            if (isEditMode && editingPatient) {
                // Instant UI feedback
                setIsRegisterOpen(false);
                setActionLoading(`${editingPatient.patientid}-saving`);
                const r = await updatePatient(editingPatient.patientid, payload);
                if (!r?.success) throw new Error(r?.error || "Failed to update");
                addToast("Patient updated successfully", "success");
            } else {
                const r = await addPatient({ ...payload, patient_no: "" });
                if (!r.success) throw new Error(r.error);
                addToast("Patient registered successfully", "success");
            }
            await fetchPatients();
            if (!isEditMode) setIsRegisterOpen(false);
            setEditingPatient(null); reset();
        } catch (e: any) { addToast(e.message || "Operation failed", "error"); }
        finally { setActionLoading(null); }
    };

    const stateLabel = (id?: any) => stateOptions.find(s => s.value === id?.toString())?.label;

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');
                    .patient-root { font-family: 'DM Sans', sans-serif; }
                    .patient-root * { font-family: inherit; }
                    .patient-mono { font-family: 'DM Mono', monospace !important; }
                    .no-scroll::-webkit-scrollbar { display: none; }
                    .no-scroll { scrollbar-width: none; }
                `}</style>

                <div className="patient-root space-y-6 pb-10">

                    {/* ── Header ── */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Registry</span>
                            </div>
                            <h2 className="text-[28px] font-bold tracking-tight text-foreground leading-none">Patient Records</h2>
                            <p className="text-sm text-muted-foreground mt-1.5">Manage patient registration, history and demographics</p>
                        </div>
                        <div className="flex items-center gap-2 self-start">
                            <Tooltip content="Refresh">
                                <button onClick={() => fetchPatients()} disabled={isPatientsLoading || isRefreshing}
                                    className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-all">
                                    <RefreshCw className={cn("h-3.5 w-3.5", (isPatientsLoading || isRefreshing) && "animate-spin text-blue-500")} />
                                </button>
                            </Tooltip>
                            <button onClick={() => setIsFilterOpen(true)}
                                className={cn("relative inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium transition-all",
                                    isFilterOpen ? "bg-blue-600 text-white border-blue-600" : "border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                                <Filter className="h-3.5 w-3.5" /> Filter
                                {activeFilters > 0 && <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-background">{activeFilters}</span>}
                            </button>
                            {canRegister && (
                                <button onClick={handleOpenRegister}
                                    className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(37,99,235,0.35)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.45)] transition-all">
                                    <UserPlus className="h-4 w-4" /> New Patient
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Stat Cards ── */}
                    {isPatientsLoading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[0,1,2,3].map(i => <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}><StatCardSkeleton /></motion.div>)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total"      value={displayPatients.length}                     delay={0}    icon={Users}      iconBg="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900"         glow="bg-blue-400/20"    />
                            <StatCard label="Active"     value={displayPatients.filter(p=>p.isactive).length} delay={0.07} icon={UserCheck}  iconBg="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" glow="bg-emerald-400/20" />
                            <StatCard label="Walk-in"    value={displayPatients.filter(p=>p.is_walk_in).length} delay={0.14} icon={UserPlus}  iconBg="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900"      glow="bg-amber-400/20"   />
                            <StatCard label="Filtered"   value={filteredPatients.length}                    delay={0.21} icon={Filter}     iconBg="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900"    glow="bg-violet-400/20"  />
                        </div>
                    )}

                    {/* ── Search ── */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.35 }}>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input type="text" placeholder="Search by name, phone, email or UHID..."
                                value={tempFilters.search}
                                onChange={e => { updateFilter("search", e.target.value); setAppliedFilters(p => ({ ...p, search: e.target.value })); }}
                                className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </motion.div>

                    {/* ── Patient Grid ── */}
                    {isPatientsLoading ? (
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(8)].map((_, i) => <PatientCardSkeleton key={i} delay={i * 0.05} />)}
                        </div>
                    ) : filteredPatients.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border/40 bg-muted/10">
                            <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center mb-4">
                                <Users className="h-7 w-7 text-blue-400" />
                            </div>
                            <p className="text-base font-semibold text-foreground/80">No patients found</p>
                            <p className="text-sm text-muted-foreground mt-1">{activeFilters > 0 ? "Try adjusting your filters." : "Register your first patient."}</p>
                            {activeFilters > 0 && <button onClick={resetFilters} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Clear filters</button>}
                        </motion.div>
                    ) : (
                        <motion.div key={JSON.stringify(appliedFilters)} variants={containerVariants} initial="hidden" animate="show"
                            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            <AnimatePresence mode="popLayout">
                                {filteredPatients.map(p => (
                                    <PatientCard key={p.patientid} patient={p} bloodGroups={bloodGroups}
                                        onView={() => handleView(p)}
                                        onEdit={() => handleOpenEdit(p)}
                                        actionLoading={actionLoading}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>

                {/* ── Filter Sheet ── */}
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetContent side="right" className="w-full sm:max-w-sm p-0 border-l shadow-2xl bg-card flex flex-col patient-root">
                        <SheetHeader className="px-6 py-5 border-b bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center">
                                    <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <SheetTitle className="text-base font-bold">Filters</SheetTitle>
                                    <SheetDescription className="text-xs">Refine the patient list</SheetDescription>
                                </div>
                            </div>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto no-scroll p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
                                <Select value={tempFilters.gender} onValueChange={v => updateFilter("gender", v)}>
                                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Blood Group</label>
                                <SearchableSelect options={bloodGroupOptions} value={tempFilters.bloodGroup === "all" ? "" : tempFilters.bloodGroup} onChange={v => updateFilter("bloodGroup", v || "all")} placeholder="All Groups" className="w-full" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">State</label>
                                <SearchableSelect options={stateOptions} value={tempFilters.state === "all" ? "" : tempFilters.state} onChange={v => updateFilter("state", v || "all")} placeholder="All States" className="w-full" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">City</label>
                                <SearchableSelect options={filterCityOptions} value={tempFilters.city === "all" ? "" : tempFilters.city} onChange={v => updateFilter("city", v || "all")} placeholder="All Cities" disabled={!tempFilters.state || tempFilters.state === "all"} className="w-full" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Walk-in Status</label>
                                <Select value={tempFilters.walkIn} onValueChange={v => updateFilter("walkIn", v)}>
                                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="yes">Walk-in Only</SelectItem><SelectItem value="no">Registered Only</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t bg-muted/10 flex gap-2.5">
                            <button onClick={resetFilters} className="flex-1 h-9 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Reset</button>
                            <button onClick={applyFilters} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] transition-all">Apply</button>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* ── Register / Edit Dialog ── */}
                <Dialog open={isRegisterOpen} onOpenChange={open => !open && setIsRegisterOpen(false)}>
                    <DialogContent className="max-w-2xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden flex flex-col max-h-[90vh] patient-root">
                        {/* Gradient header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-7 pt-7 pb-6 shrink-0">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                                        {isEditMode ? <Pencil className="h-5 w-5 text-white" /> : <UserPlus className="h-5 w-5 text-white" />}
                                    </div>
                                    <div>
                                        <DialogTitle className="text-lg font-bold text-white">{isEditMode ? "Update Patient" : "Register Patient"}</DialogTitle>
                                        <DialogDescription className="text-blue-200 text-xs mt-0.5">{isEditMode ? "Modify patient details" : "Create a new patient record · UHID is auto-generated"}</DialogDescription>
                                    </div>
                                </div>
                                <button className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all" onClick={() => setIsRegisterOpen(false)}>
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 overflow-y-auto no-scroll px-7 py-6 space-y-7">

                                {/* Personal */}
                                <div>
                                    <SectionHeader icon={Users} label="Personal Information" color="text-blue-600 dark:text-blue-400" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Full Name" required error={errors.full_name?.message}>
                                                <div className="relative group">
                                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input {...register("full_name")} placeholder="e.g. Rahul Sharma" className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                                </div>
                                            </FormField>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 relative">
                                            <FormField label="Date of Birth" required error={errors.dob?.message}>
                                                <Controller control={control} name="dob" render={({ field }) => (
                                                    <DatePicker value={field.value} onChange={field.onChange} placeholder="Select DOB" className="w-full" maxDate={new Date().toISOString().split("T")[0]} />
                                                )} />
                                            </FormField>
                                            {age !== "" && (
                                                <span className="absolute right-0 top-0 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                    Age: {age}{Number(age) < 18 && <span className="text-amber-500 ml-1">(Minor)</span>}
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="Gender" required error={errors.gender?.message}>
                                                <Controller control={control} name="gender" render={({ field }) => (
                                                    <CustomDropdown options={genderOptions} value={field.value} onChange={field.onChange} placeholder="Select Gender" className="h-10 rounded-xl" />
                                                )} />
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="Blood Group">
                                                <Controller control={control} name="blood_group_id" render={({ field }) => (
                                                    <SearchableSelect options={bloodGroupOptions} value={field.value || ""} onChange={field.onChange} placeholder="Select" className="w-full" />
                                                )} />
                                            </FormField>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div>
                                    <SectionHeader icon={MapPin} label="Contact Details" color="text-indigo-600 dark:text-indigo-400" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <FormField label="Phone" error={errors.phone_number?.message}>
                                                <div className="relative group">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input {...register("phone_number")} placeholder="10-digit mobile" maxLength={10} className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm patient-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                                </div>
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="Email" error={errors.email?.message}>
                                                <div className="relative group">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input {...register("email")} placeholder="patient@email.com" className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                                </div>
                                            </FormField>
                                        </div>
                                        <div className="col-span-2">
                                            <FormField label="Street Address" required error={errors.address?.message}>
                                                <input {...register("address")} placeholder="House, Street, Area..." className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="State">
                                                <Controller control={control} name="state_id" render={({ field }) => (
                                                    <SearchableSelect options={stateOptions} value={field.value || ""} onChange={v => { field.onChange(v); setValue("city_id", ""); }} placeholder="Select State" className="w-full" />
                                                )} />
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="City">
                                                <Controller control={control} name="city_id" render={({ field }) => (
                                                    <SearchableSelect options={cityOptions} value={field.value || ""} onChange={field.onChange} placeholder={selectedState ? "Select City" : "State first"} disabled={!selectedState} className="w-full" />
                                                )} />
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="Pincode" required error={errors.pincode?.message}>
                                                <input {...register("pincode")} placeholder="000000" maxLength={6} className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm patient-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency */}
                                <div>
                                    <SectionHeader icon={AlertCircle} label="Emergency Info" color="text-rose-600 dark:text-rose-400" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <FormField label="Contact Name">
                                                <input {...register("emergency_contact_name")} placeholder="Relative's name" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="Contact Phone">
                                                <input {...register("emergency_contact_number")} placeholder="Emergency phone" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm patient-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                    </div>
                                </div>

                                {/* Walk-in toggle */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Walk-in Patient</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Mark as emergency / walk-in visit</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Controller control={control} name="is_walk_in" render={({ field }) => (
                                            <>
                                                <span className={cn("text-[11px] font-bold uppercase", field.value ? "text-amber-600" : "text-muted-foreground/50")}>
                                                    {field.value ? "Walk-in" : "Regular"}
                                                </span>
                                                <button type="button" onClick={() => field.onChange(!field.value)}
                                                    className={cn("relative h-6 w-11 rounded-full transition-colors duration-300 focus:outline-none", field.value ? "bg-amber-500" : "bg-muted")}>
                                                    <motion.span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                                                        animate={{ x: field.value ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                                </button>
                                            </>
                                        )} />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-2.5 shrink-0">
                                <button type="button" onClick={() => setIsRegisterOpen(false)} disabled={isSubmitting}
                                    className="h-9 px-5 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting}
                                    className="h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all">
                                    {isSubmitting
                                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</>
                                        : <><CheckCircle2 className="h-3.5 w-3.5" />{isEditMode ? "Save Changes" : "Register Patient"}</>
                                    }
                                </button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ── View Dialog ── */}
                <Dialog open={!!viewingPatient} onOpenChange={v => !v && setViewingPatient(null)}>
                    {viewingPatient && (
                        <DialogContent className="max-w-3xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden max-h-[90vh] flex flex-col patient-root">
                            {/* Gradient header */}
                            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-7 pt-7 pb-16 shrink-0">
                                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                                <div className="absolute bottom-0 left-24 h-16 w-16 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
                                <div className="relative z-10 flex items-center justify-between">
                                    <DialogTitle className="text-lg font-bold text-white">Patient Profile</DialogTitle>
                                    <button className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all" onClick={() => setViewingPatient(null)}>
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scroll">
                                <div className="px-7 pb-7 -mt-10 relative z-10">
                                    {/* Avatar row */}
                                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-7">
                                        <div className={cn("relative h-24 w-24 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-background shrink-0", getGrad(viewingPatient.patientname))}>
                                            {viewingPatient.patientname?.charAt(0)}
                                            <span className={cn("absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-background shadow", viewingPatient.isactive ? "bg-emerald-500" : "bg-slate-400")} />
                                        </div>
                                        <div className="flex-1 text-center sm:text-left sm:pb-1">
                                            <h2 className="text-2xl font-bold text-foreground">{viewingPatient.patientname}</h2>
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                                                {viewingPatient.patient_no && !viewingPatient.patient_no.startsWith("P-") && viewingPatient.patient_no !== "PENDING" ? (
                                                    <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-md text-[11px] font-bold patient-mono">{viewingPatient.patient_no}</span>
                                                ) : (
                                                    <span className="inline-block bg-muted/60 border border-border/50 text-muted-foreground px-2 py-0.5 rounded-md text-[9px] font-bold uppercase">No UHID</span>
                                                )}
                                                {bloodGroups.find(b => b.bloodgroupid === viewingPatient.blood_group_id?.toString())?.bloodgroupname && (
                                                    <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                                        <Droplet className="h-3 w-3" />{bloodGroups.find(b => b.bloodgroupid === viewingPatient.blood_group_id?.toString())?.bloodgroupname}
                                                    </span>
                                                )}
                                                {viewingPatient.is_walk_in && (
                                                    <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase">Walk-in</span>
                                                )}
                                                <span className="text-sm text-muted-foreground">
                                                    {viewingPatient.gender} · {calculateAge(viewingPatient.dob || "")} yrs
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setViewingPatient(null); handleOpenEdit(viewingPatient); }}
                                            className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all shrink-0">
                                            <Pencil className="h-3.5 w-3.5" /> Edit
                                        </button>
                                    </div>

                                    {/* Info grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Contact */}
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" />Contact</p>
                                            <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/40">
                                                <a href={`tel:${viewingPatient.phone_number}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                                    <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Phone className="h-4 w-4" /></div>
                                                    <div><p className="text-[10px] text-muted-foreground uppercase font-semibold">Phone</p><p className="text-sm font-semibold patient-mono">{viewingPatient.phone_number || "—"}</p></div>
                                                </a>
                                                <a href={`mailto:${viewingPatient.email}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                                    <div className="h-9 w-9 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors"><Mail className="h-4 w-4" /></div>
                                                    <div><p className="text-[10px] text-muted-foreground uppercase font-semibold">Email</p><p className="text-sm font-semibold truncate">{viewingPatient.email || "—"}</p></div>
                                                </a>
                                                <div className="flex items-center gap-3 p-3.5">
                                                    <div className="h-9 w-9 rounded-full bg-muted/60 border border-border/60 text-muted-foreground flex items-center justify-center shrink-0"><MapPin className="h-4 w-4" /></div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Address</p>
                                                        <p className="text-sm font-semibold truncate">{viewingPatient.address || "—"}</p>
                                                        <p className="text-xs text-muted-foreground patient-mono">{[stateLabel(viewingPatient.state_id), viewingPatient.pincode].filter(Boolean).join(" · ")}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Emergency */}
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><HeartPulse className="h-3 w-3 text-rose-500" />Emergency Contact</p>
                                            <div className={cn("rounded-xl border overflow-hidden h-[calc(100%-1.75rem)] flex items-center",
                                                viewingPatient.emergency_contact_name ? "border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/10" : "border-border/40 bg-muted/10")}>
                                                {viewingPatient.emergency_contact_name || viewingPatient.emergency_contact_number ? (
                                                    <div className="flex items-center justify-between w-full p-4 gap-3">
                                                        <div>
                                                            <p className="text-[10px] text-rose-500/70 uppercase font-bold tracking-wider mb-1">Full Name</p>
                                                            <p className="text-base font-bold text-foreground">{viewingPatient.emergency_contact_name || "—"}</p>
                                                            {viewingPatient.emergency_contact_number && (
                                                                <p className="text-sm text-muted-foreground patient-mono mt-0.5">{viewingPatient.emergency_contact_number}</p>
                                                            )}
                                                        </div>
                                                        {viewingPatient.emergency_contact_number && (
                                                            <a href={`tel:${viewingPatient.emergency_contact_number}`}
                                                                className="h-11 w-11 rounded-xl bg-white dark:bg-card border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 transition-colors shadow-sm shrink-0">
                                                                <Phone className="h-5 w-5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center w-full py-8 text-center opacity-50">
                                                        <AlertCircle className="h-7 w-7 text-rose-400/50 mb-2" />
                                                        <p className="text-sm font-semibold text-muted-foreground">No emergency contact</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                                <button onClick={() => setViewingPatient(null)} className="h-9 px-4 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Close</button>
                                <button onClick={() => { setViewingPatient(null); handleOpenEdit(viewingPatient); }}
                                    className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all">
                                    <Pencil className="h-3.5 w-3.5" /> Edit Profile
                                </button>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </>
        </RoleGuard>
    );
}
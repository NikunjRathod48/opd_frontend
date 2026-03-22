import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData, Doctor } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Plus, Search, Shield, Building, Eye, Pencil, Mail, Phone,
    User as UserIcon, X, Activity, Stethoscope, GraduationCap,
    Banknote, Calendar, Clock, Filter, EyeOff, Lock, FileText,
    Loader2, Users, UserCheck, UserX, RefreshCw, ChevronRight,
    CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DoctorScheduleModal } from "./doctor-schedule";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const doctorSchema = z.object({
    full_name:          z.string().min(1, "Full name required"),
    email:              z.string().email("Invalid email"),
    phone_number:       z.string().length(10, "Must be 10 digits").regex(/^\d+$/, "Numbers only"),
    password:           z.string().optional().refine(v => !v || /^\S*$/.test(v), "No spaces").refine(v => !v || v.length >= 6, "Min 6 chars"),
    gender:             z.enum(["Male", "Female", "Other"]),
    hospital_id:        z.string().min(1, "Hospital required"),
    department_id:      z.string().min(1, "Department required"),
    specialization_id:  z.string().min(1, "Specialization required"),
    qualification:      z.string().min(1, "Qualification required"),
    medical_license_no: z.string().min(1, "License required"),
    experience_years:   z.coerce.number().min(0),
    consultation_fees:  z.coerce.number().min(0),
    description:        z.string().optional(),
    is_available:       z.boolean().default(true),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

// ─── Motion variants ──────────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardVariants : import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 18, scale: 0.97 },
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

// ─── Skeleton primitives ──────────────────────────────────────────────────────

function Bone({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("animate-pulse rounded-xl bg-muted/60", className)} {...props} />;
}

function StatCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5">
            <Bone className="h-10 w-10 rounded-xl mb-4" />
            <Bone className="h-8 w-12 mb-2" />
            <Bone className="h-3 w-24" />
        </div>
    );
}

function DoctorCardSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
            className="rounded-3xl border border-border/50 bg-card overflow-hidden"
        >
            <Bone className="h-1.5 w-full rounded-none" />
            <div className="px-6 pt-7 pb-6 flex flex-col items-center gap-4">
                <Bone className="h-20 w-20 rounded-2xl" />
                <div className="w-full flex flex-col items-center gap-2">
                    <Bone className="h-5 w-36" />
                    <Bone className="h-5 w-24 rounded-full" />
                    <Bone className="h-4 w-28 rounded-full mt-1" />
                </div>
                <div className="w-full h-px bg-border/40" />
                <div className="w-full space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <Bone className="h-7 w-7 rounded-full shrink-0" />
                            <Bone className="h-3 flex-1" style={{ width: `${60 + i * 15}%` }} />
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconBg, glow, delay }: {
    label: string; value: number; icon: any; iconBg: string; glow: string; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 group hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300"
        >
            <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500", glow)} />
            <div className="relative z-10">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4 border", iconBg)}>
                    <Icon className="h-[18px] w-[18px]" />
                </div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground leading-none">{value}</p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">{label}</p>
            </div>
        </motion.div>
    );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({ doctor, onView, onEdit, onSchedule }: {
    doctor: Doctor; onView: () => void; onEdit: () => void; onSchedule: () => void;
}) {
    const grad = getGrad(doctor.doctorname);
    const isActive = doctor.isactive;

    return (
        <motion.div
            variants={cardVariants} layout
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="group relative rounded-3xl border border-border/50 bg-card overflow-hidden hover:border-border hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300"
        >
            {/* Status accent bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500", isActive ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-rose-400 to-rose-600")} />

            {/* Glow blob */}
            <div className={cn("absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none", isActive ? "bg-emerald-500" : "bg-rose-500")} />

            {/* Actions — reveal on hover */}
            <div className="absolute top-5 right-4 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                <Tooltip content="View" side="left">
                    <button onClick={onView} className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all">
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                </Tooltip>
                <Tooltip content="Edit" side="left">
                    <button onClick={e => { e.stopPropagation(); onEdit(); }} className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                </Tooltip>
                <Tooltip content="Schedule" side="left">
                    <button onClick={e => { e.stopPropagation(); onSchedule(); }} className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all">
                        <Calendar className="h-3.5 w-3.5" />
                    </button>
                </Tooltip>
            </div>

            {/* Card body */}
            <div className="pt-8 px-6 pb-6 flex flex-col items-center text-center relative z-10">
                {/* Avatar */}
                <div className="relative mb-4">
                    <div className={cn("h-20 w-20 rounded-2xl bg-gradient-to-br flex items-center justify-center overflow-hidden text-white text-2xl font-bold shadow-lg group-hover:scale-105 transition-transform duration-300", grad)}>
                        {doctor.profile_image_url ? <img src={doctor.profile_image_url} alt={doctor.doctorname} className="h-full w-full object-cover" /> : doctor.doctorname?.charAt(0) || "D"}
                    </div>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background shadow-sm", isActive ? "bg-emerald-500" : "bg-rose-500")} />
                </div>

                {/* Name + spec */}
                <p className="text-[17px] font-bold text-foreground/90 leading-tight truncate max-w-full px-2">{doctor.doctorname}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 text-[11px] font-semibold">
                    <Stethoscope className="h-3 w-3 opacity-70" /> {doctor.specializationName}
                </span>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 text-muted-foreground px-3 py-1 text-[11px] font-medium max-w-full">
                    <Building className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="truncate">{doctor.hospitalName}</span>
                </span>

                {/* Divider */}
                <div className="w-full h-px bg-border/40 my-4" />

                {/* Contact */}
                <div className="w-full space-y-2.5">
                    {doctor.email && (
                        <a href={`mailto:${doctor.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-3 rounded-xl hover:bg-muted/40 p-2 -mx-2 transition-all group/link">
                            <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover/link:bg-blue-500 group-hover/link:text-white transition-colors">
                                <Mail className="h-3 w-3" />
                            </div>
                            <span className="truncate text-muted-foreground group-hover/link:text-foreground font-medium transition-colors text-xs">{doctor.email}</span>
                        </a>
                    )}
                    {doctor.contact && (
                        <a href={`tel:${doctor.contact}`} onClick={e => e.stopPropagation()} className="flex items-center gap-3 rounded-xl hover:bg-muted/40 p-2 -mx-2 transition-all group/link">
                            <div className="h-7 w-7 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover/link:bg-violet-500 group-hover/link:text-white transition-colors">
                                <Phone className="h-3 w-3" />
                            </div>
                            <span className="text-muted-foreground group-hover/link:text-foreground font-medium transition-colors text-xs doctor-mono">{doctor.contact}</span>
                        </a>
                    )}
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <GraduationCap className="h-3 w-3" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium truncate">{doctor.qualification || "—"}</span>
                        <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 doctor-mono shrink-0">₹{doctor.fees || doctor.consultation_fees || 0}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Info Row (used in view dialog) ──────────────────────────────────────────

function InfoRow({ icon: Icon, color, label, value, mono = false }: {
    icon: any; color: string; label: string; value?: string | number; mono?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
            <div className={cn("h-9 w-9 rounded-full border flex items-center justify-center shrink-0", color)}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={cn("text-sm font-semibold truncate", mono && "doctor-mono")}>{value || "—"}</p>
            </div>
        </div>
    );
}

// ─── Field (used in form) ─────────────────────────────────────────────────────

function FormField({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
            {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DoctorList({ allowedRoles, hospitalId }: { allowedRoles?: string[]; hospitalId?: string }) {
    const { doctors, hospitals, specializations, refreshDoctors } = useData();
    const { addToast } = useToast();
    const { user }     = useAuth();

    const [fetchedDoctors,   setFetchedDoctors]   = useState<Doctor[]>(doctors);
    const [isLoading,        setIsLoading]        = useState(doctors.length === 0);
    const [isFilterOpen,     setIsFilterOpen]     = useState(false);
    const [isModalOpen,      setIsModalOpen]      = useState(false);
    const [modalMode,        setModalMode]        = useState<"add" | "edit" | "view">("add");
    const [selectedDoctor,   setSelectedDoctor]   = useState<Doctor | null>(null);
    const [activeTab,        setActiveTab]        = useState("personal");
    const [viewSchedule,     setViewSchedule]     = useState<any[]>([]);
    const [isLoadingSchedule,setIsLoadingSchedule]= useState(false);
    const [isScheduleOpen,   setIsScheduleOpen]   = useState(false);
    const [profileImage,     setProfileImage]     = useState<File | string | null>(null);
    const [showPassword,     setShowPassword]     = useState(false);
    const [hospitalDepts,    setHospitalDepts]    = useState<{ id: string; name: string }[]>([]);

    const defaultFilters = { generalSearch: "", status: "all", spec: "all", hospital: "all", gender: "all", dept: "all", qual: "all", expMin: "", expMax: "", feesMin: "", feesMax: "" };
    const [tempFilters,    setTempFilters]    = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

    const form = useForm<DoctorFormValues>({
        resolver: zodResolver(doctorSchema) as any,
        defaultValues: { full_name: "", email: "", phone_number: "", password: "", gender: "Male", hospital_id: "", department_id: "", specialization_id: "", qualification: "", medical_license_no: "", experience_years: 0, consultation_fees: 0, description: "", is_available: true },
    });

    useEffect(() => {
        if (doctors.length > 0) { setFetchedDoctors(doctors); setIsLoading(false); }
        else { const t = setTimeout(() => setIsLoading(false), 2000); return () => clearTimeout(t); }
    }, [doctors]);

    useEffect(() => {
        if (isModalOpen && modalMode === "view" && selectedDoctor) {
            setIsLoadingSchedule(true);
            const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
            fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/doctors/${selectedDoctor.doctorid}/availability`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : [])
                .then(data => setViewSchedule(Array.from({ length: 7 }, (_, i) => data.find((d: any) => d.day_of_week === i) || { day_of_week: i, is_available: false })))
                .catch(() => {})
                .finally(() => setIsLoadingSchedule(false));
        } else { setViewSchedule([]); }
    }, [isModalOpen, modalMode, selectedDoctor]);

    const selectedHospitalId = form.watch("hospital_id");
    useEffect(() => {
        if (!selectedHospitalId) { setHospitalDepts([]); return; }
        const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/doctors/departments/${selectedHospitalId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(data => setHospitalDepts(data.map((d: any) => ({ id: String(d.department_id), name: d.departments_master.department_name }))))
            .catch(() => {});
    }, [selectedHospitalId]);

    const effectiveHospitalId = hospitalId || (["HospitalAdmin", "Receptionist"].includes(user?.role || "") ? user?.hospitalid : undefined);

    const uniqueSpecs    = specializations.map(s => ({ label: s.specializationname || "", value: s.specializationid || "" }));
    const uniqueHospitals= hospitals.map(h => ({ label: h.hospitalname || "", value: h.hospitalid || "" }));
    const uniqueDepts    = Array.from(new Set(fetchedDoctors.map(d => JSON.stringify({ id: d.departmentid, name: d.departmentName || "General" })))).map(s => JSON.parse(s)).filter(d => d.id);
    const uniqueQuals    = Array.from(new Set(fetchedDoctors.map(d => d.qualification).filter((q): q is string => !!q)));

    const filteredDoctors = fetchedDoctors.filter(doc => {
        if (effectiveHospitalId && String(doc.hospitalid) !== String(effectiveHospitalId)) return false;
        const { generalSearch, status, spec, hospital, gender, dept, qual, expMin, expMax, feesMin, feesMax } = appliedFilters;
        const matchesSearch = doc.doctorname?.toLowerCase().includes(generalSearch.toLowerCase()) || doc.email?.toLowerCase().includes(generalSearch.toLowerCase()) || doc.contact?.includes(generalSearch);
        const exp = doc.experience || 0; const fees = doc.consultation_fees || doc.fees || 0;
        return (
            matchesSearch &&
            (status === "all" || (status === "active" ? doc.isactive : !doc.isactive)) &&
            (spec === "all" || doc.specializationid === spec) &&
            (hospital === "all" || doc.hospitalid === hospital) &&
            (gender === "all" || doc.gender === gender) &&
            (dept === "all" || doc.departmentid === dept) &&
            (qual === "all" || doc.qualification?.includes(qual)) &&
            (!expMin || exp >= Number(expMin)) && (!expMax || exp <= Number(expMax)) &&
            (!feesMin || fees >= Number(feesMin)) && (!feesMax || fees <= Number(feesMax))
        );
    });

    const updateFilter = (key: string, value: string) => setTempFilters(p => ({ ...p, [key]: value }));
    const applyFilters  = () => { setAppliedFilters(tempFilters); setIsFilterOpen(false); };
    const resetFilters  = () => { setTempFilters(defaultFilters); setAppliedFilters(defaultFilters); };
    const activeFilterCount = Object.entries(appliedFilters).filter(([k, v]) => v !== (defaultFilters as any)[k]).length;

    const handleOpenAdd = () => {
        form.reset({ full_name: "", email: "", phone_number: "", password: "", gender: "Male", hospital_id: "", department_id: "", specialization_id: "", qualification: "", medical_license_no: "", experience_years: 0, consultation_fees: 0, description: "", is_available: true });
        setProfileImage(null); setModalMode("add"); setActiveTab("personal"); setIsModalOpen(true);
    };
    const handleOpenEdit = (doc: Doctor) => {
        setSelectedDoctor(doc);
        form.reset({ full_name: doc.doctorname, email: doc.email || "", phone_number: doc.contact || "", password: "", gender: (doc.gender as any) || "Male", hospital_id: doc.hospitalid, department_id: doc.departmentid, specialization_id: doc.specializationid, qualification: doc.qualification || "", medical_license_no: doc.medical_license_no || "", experience_years: doc.experience || 0, consultation_fees: doc.fees || 0, description: "", is_available: doc.isactive });
        setProfileImage(doc.profile_image_url || null); setModalMode("edit"); setActiveTab("personal"); setIsModalOpen(true);
    };
    const handleOpenView = (doc: Doctor) => { setSelectedDoctor(doc); setProfileImage(doc.profile_image_url || null); setModalMode("view"); setIsModalOpen(true); };
    const handleCancel = () => { setIsModalOpen(false); setTimeout(() => { setModalMode("add"); setSelectedDoctor(null); }, 300); };

    const onSubmit = async (data: DoctorFormValues) => {
        if (modalMode === "add" && !data.password) { form.setError("password", { message: "Password required" }); return; }
        try {
            const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== "") fd.append(k, String(v)); });
            if (profileImage instanceof File) fd.append("file", profileImage);
            const url = modalMode === "add" ? `${process.env.NEXT_PUBLIC_API_URL || ""}/doctors` : `${process.env.NEXT_PUBLIC_API_URL || ""}/doctors/${selectedDoctor?.doctorid}`;
            const res = await fetch(url, { method: modalMode === "add" ? "POST" : "PUT", headers: { Authorization: `Bearer ${token}` }, body: fd });
            if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
            addToast(`Doctor ${modalMode === "add" ? "registered" : "updated"} successfully`, "success");
            await refreshDoctors(); handleCancel();
        } catch (error: any) { addToast(error.message, "error"); }
    };

    const onError = (errors: any) => {
        const personalFields    = ["full_name", "email", "phone_number", "password", "gender"];
        const professionalFields= ["hospital_id", "department_id", "specialization_id", "qualification", "medical_license_no"];
        if (personalFields.some(f => errors[f]))     { setActiveTab("personal");      addToast("Check Personal Details", "error"); }
        else if (professionalFields.some(f => errors[f])) { setActiveTab("professional"); addToast("Check Professional Info", "error"); }
        else                                           { setActiveTab("availability"); addToast("Check form for errors", "error"); }
    };

    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
                .doctor-root { font-family: 'DM Sans', sans-serif; }
                .doctor-root * { font-family: inherit; }
                .doctor-mono { font-family: 'DM Mono', monospace !important; }
                .tab-pill[data-state=active] { background: white; color: #1e293b; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
                .dark .tab-pill[data-state=active] { background: #1e293b; color: #f1f5f9; }
            `}</style>

            <div className="doctor-root space-y-6 pb-10">

                {/* ── Header ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Medical Staff</span>
                        </div>
                        <h2 className="text-[28px] font-bold tracking-tight text-foreground leading-none">Doctor Management</h2>
                        <p className="text-sm text-muted-foreground mt-1.5">Manage medical staff, qualifications and assignments</p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <button onClick={() => { setIsLoading(true); refreshDoctors().finally(() => setIsLoading(false)); }} disabled={isLoading}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-all">
                            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
                        </button>
                        <button onClick={() => setIsFilterOpen(true)}
                            className={cn("relative inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium transition-all",
                                isFilterOpen ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_12px_rgba(37,99,235,0.35)]" : "border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                            <Filter className="h-3.5 w-3.5" /> Filter
                            {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-background">{activeFilterCount}</span>}
                        </button>
                        <button onClick={handleOpenAdd}
                            className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(37,99,235,0.35)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.45)] transition-all">
                            <Plus className="h-4 w-4" /> Add Doctor
                        </button>
                    </div>
                </motion.div>

                {/* ── Stat Cards ── */}
                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[0,1,2,3].map(i => <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}><StatCardSkeleton /></motion.div>)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Total"    value={fetchedDoctors.length}                          delay={0}    icon={Users}     iconBg="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900"           glow="bg-blue-400/20"    />
                        <StatCard label="Active"   value={fetchedDoctors.filter(d=>d.isactive).length}    delay={0.07} icon={UserCheck} iconBg="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" glow="bg-emerald-400/20" />
                        <StatCard label="Inactive" value={fetchedDoctors.filter(d=>!d.isactive).length}   delay={0.14} icon={UserX}    iconBg="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900"             glow="bg-rose-400/20"    />
                        <StatCard label="Filtered" value={filteredDoctors.length}                         delay={0.21} icon={Filter}   iconBg="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900"   glow="bg-violet-400/20"  />
                    </div>
                )}

                {/* ── Search bar ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input type="text" placeholder="Search by name, email or contact..."
                            value={tempFilters.generalSearch}
                            onChange={e => { updateFilter("generalSearch", e.target.value); setAppliedFilters(p => ({ ...p, generalSearch: e.target.value })); }}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                </motion.div>

                {/* ── Doctor Cards ── */}
                {isLoading ? (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => <DoctorCardSkeleton key={i} delay={i * 0.05} />)}
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border/40 bg-muted/10">
                        <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center mb-4">
                            <Stethoscope className="h-7 w-7 text-blue-400" />
                        </div>
                        <p className="text-base font-semibold text-foreground/80">No doctors found</p>
                        <p className="text-sm text-muted-foreground mt-1">{activeFilterCount > 0 ? "Try adjusting your filters." : "Add your first doctor to get started."}</p>
                        {activeFilterCount > 0 && <button onClick={resetFilters} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Clear all filters</button>}
                    </motion.div>
                ) : (
                    <motion.div key={JSON.stringify(appliedFilters)} variants={containerVariants} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <AnimatePresence mode="popLayout">
                            {filteredDoctors.map(doc => (
                                <DoctorCard key={doc.doctorid} doctor={doc}
                                    onView={() => handleOpenView(doc)}
                                    onEdit={() => handleOpenEdit(doc)}
                                    onSchedule={() => { setSelectedDoctor(doc); setIsScheduleOpen(true); }}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* ── Filter Sheet ── */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent side="right" className="w-full sm:max-w-sm p-0 border-l shadow-2xl bg-card flex flex-col">
                    <SheetHeader className="px-6 py-5 border-b bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center">
                                <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <SheetTitle className="text-base font-bold">Filters</SheetTitle>
                                <SheetDescription className="text-xs">Refine the doctor list</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-140px)]">
                        <div className="p-6 space-y-5">
                            {[
                            { label: "Specialization", opts: uniqueSpecs, key: "spec" },
                            { label: "Hospital",       opts: uniqueHospitals, key: "hospital" },
                            { label: "Department",     opts: uniqueDepts.map(d => ({ label: d.name, value: d.id })), key: "dept" },
                            { label: "Qualification",  opts: uniqueQuals.map(q => ({ label: q, value: q })), key: "qual" },
                        ].map(({ label, opts, key }) => (
                            <div key={key} className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
                                <SearchableSelect options={opts} value={(tempFilters as any)[key] === "all" ? "" : (tempFilters as any)[key]} onChange={v => updateFilter(key, v || "all")} placeholder={`All ${label}s`} className="w-full h-10 rounded-xl" />
                            </div>
                        ))}
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                            <Select value={tempFilters.status} onValueChange={v => updateFilter("status", v)}>
                                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
                            <Select value={tempFilters.gender} onValueChange={v => updateFilter("gender", v)}>
                                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                            </Select>
                        </div>
                        {[
                            { label: "Experience (Yrs)", minKey: "expMin",  maxKey: "expMax"  },
                            { label: "Fees (₹)",         minKey: "feesMin", maxKey: "feesMax" },
                        ].map(({ label, minKey, maxKey }) => (
                            <div key={label} className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Min" value={(tempFilters as any)[minKey]} onChange={e => updateFilter(minKey, e.target.value)} className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    <span className="text-muted-foreground self-center">–</span>
                                    <input type="number" placeholder="Max" value={(tempFilters as any)[maxKey]} onChange={e => updateFilter(maxKey, e.target.value)} className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                </div>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                    <div className="px-6 py-5 border-t bg-muted/10 flex gap-2.5">
                        <button onClick={resetFilters} className="flex-1 h-9 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Reset</button>
                        <button onClick={applyFilters} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] transition-all">Apply</button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Add / Edit Dialog ── */}
            <Dialog open={isModalOpen && modalMode !== "view"} onOpenChange={open => !open && handleCancel()}>
                <DialogContent className="max-w-2xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden flex flex-col max-h-[90vh] doctor-root">
                    {/* Gradient header */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-7 pt-7 pb-6 shrink-0">
                        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                                    {modalMode === "edit" ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white">{modalMode === "edit" ? "Update Doctor Profile" : "Register New Doctor"}</DialogTitle>
                                    <DialogDescription className="text-blue-200 text-xs mt-0.5">{modalMode === "edit" ? "Modify professional details" : "Onboard new medical staff"}</DialogDescription>
                                </div>
                            </div>
                            <button className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all" onClick={handleCancel}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col flex-1 min-h-0">
                        <ScrollArea className="h-[60vh] sm:h-[65vh]">
                            <div className="px-7 py-6 space-y-6">
                                {/* Profile photo */}
                            <div className="flex flex-col items-center gap-2">
                                <ImageUpload value={profileImage} onChange={setProfileImage} variant="avatar" showActions label="" />
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Profile Photo</p>
                            </div>

                            {/* Tabs */}
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="w-full grid grid-cols-3 h-10 bg-muted/40 p-1 rounded-xl mb-6">
                                    {["personal", "professional", "availability"].map(t => (
                                        <TabsTrigger key={t} value={t} className="tab-pill rounded-lg text-xs font-semibold text-muted-foreground transition-all capitalize">
                                            {t}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Personal tab */}
                                <TabsContent value="personal" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Full Name" required error={form.formState.errors.full_name?.message}>
                                                <div className="relative group">
                                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input {...form.register("full_name")} placeholder="Dr. John Doe" className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                                                </div>
                                            </FormField>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Gender" required>
                                                <Select value={form.watch("gender")} onValueChange={v => form.setValue("gender", v as any)}>
                                                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                                                </Select>
                                            </FormField>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Email" required error={form.formState.errors.email?.message}>
                                                <div className="relative group">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input {...form.register("email")} type="email" placeholder="doctor@hospital.com" className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                                                </div>
                                            </FormField>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Phone" required error={form.formState.errors.phone_number?.message}>
                                                <div className="relative group">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input {...form.register("phone_number")} type="tel" maxLength={10} placeholder="9876543210" onInput={(e: any) => e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "")} className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                                                </div>
                                            </FormField>
                                        </div>
                                        <div className="col-span-2">
                                            <FormField label={`Password${modalMode === "edit" ? " (leave blank to keep current)" : ""}`} required={modalMode === "add"} error={form.formState.errors.password?.message}>
                                                <div className="relative group">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-violet-500 transition-colors pointer-events-none" />
                                                    <input {...form.register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" onKeyDown={e => { if (e.key === " ") e.preventDefault(); }} className="w-full h-10 pl-9 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all" />
                                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground/50 hover:text-violet-500 rounded-md transition-colors">
                                                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </FormField>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Professional tab */}
                                <TabsContent value="professional" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Hospital" required error={form.formState.errors.hospital_id?.message}>
                                                <SearchableSelect options={uniqueHospitals} value={form.watch("hospital_id")} onChange={v => { form.setValue("hospital_id", v); form.setValue("department_id", ""); }} placeholder="Select hospital" className="w-full" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Department" required error={form.formState.errors.department_id?.message}>
                                                <SearchableSelect options={hospitalDepts.map(d => ({ label: d.name, value: d.id }))} value={form.watch("department_id")} onChange={v => form.setValue("department_id", v)} placeholder={hospitalDepts.length ? "Select dept." : "Select hospital first"} disabled={!form.watch("hospital_id")} className="w-full" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Specialization" required error={form.formState.errors.specialization_id?.message}>
                                                <SearchableSelect options={uniqueSpecs} value={form.watch("specialization_id")} onChange={v => form.setValue("specialization_id", v)} placeholder="Select specialization" className="w-full" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <FormField label="Medical License No." required error={form.formState.errors.medical_license_no?.message}>
                                                <input {...form.register("medical_license_no")} placeholder="REG-XXXX" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm doctor-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-2">
                                            <FormField label="Qualification" required>
                                                <input {...form.register("qualification")} placeholder="e.g. MBBS, MD (Cardiology)" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="Experience (Yrs)">
                                                <input {...form.register("experience_years")} type="number" min="0" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                        <div className="col-span-1">
                                            <FormField label="Consultation Fees (₹)">
                                                <input {...form.register("consultation_fees")} type="number" min="0" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm doctor-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                            </FormField>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Availability tab */}
                                <TabsContent value="availability" className="mt-0 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-250">
                                    {/* Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Availability</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Toggle general availability for appointments</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn("text-[11px] font-bold uppercase", form.watch("is_available") ? "text-emerald-600" : "text-rose-600")}>
                                                {form.watch("is_available") ? "Available" : "Unavailable"}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => form.setValue("is_available", !form.watch("is_available"))}
                                                className={cn("relative h-6 w-11 rounded-full transition-colors duration-300 focus:outline-none", form.watch("is_available") ? "bg-emerald-500" : "bg-muted")}
                                            >
                                                <motion.span
                                                    className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                                                    animate={{ x: form.watch("is_available") ? 20 : 0 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Bio */}
                                    <FormField label="Biography / Description">
                                        <Textarea {...form.register("description")} placeholder="Brief professional biography..." className="rounded-xl min-h-[120px] resize-none text-sm" />
                                    </FormField>
                                </TabsContent>
                            </Tabs>
                            </div>
                        </ScrollArea>

                        {/* Footer with tab nav */}
                        <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                            <button type="button"
                                onClick={() => setActiveTab(activeTab === "availability" ? "professional" : "personal")}
                                className={cn("h-9 px-4 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all", activeTab === "personal" && "invisible")}>
                                Back
                            </button>
                            {activeTab === "availability" ? (
                                <button type="submit" disabled={form.formState.isSubmitting}
                                    className="h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all">
                                    {form.formState.isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    {modalMode === "add" ? "Register Doctor" : "Save Changes"}
                                </button>
                            ) : (
                                <button type="button"
                                    onClick={() => setActiveTab(activeTab === "personal" ? "professional" : "availability")}
                                    className="h-9 px-5 rounded-xl bg-foreground/90 hover:bg-foreground text-background text-sm font-semibold flex items-center gap-2 transition-all">
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── View Dialog ── */}
            <Dialog open={isModalOpen && modalMode === "view"} onOpenChange={open => !open && handleCancel()}>
                {selectedDoctor && (
                    <DialogContent className="max-w-4xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden max-h-[90vh] flex flex-col doctor-root">
                        {/* Gradient header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-7 pt-7 pb-16 shrink-0">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                            <div className="absolute bottom-0 left-24 h-16 w-16 rounded-full bg-indigo-400/20 blur-2xl" />
                            <div className="relative z-10 flex items-center justify-between">
                                <DialogTitle className="text-lg font-bold text-white">Doctor Profile</DialogTitle>
                                <button className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all" onClick={handleCancel}>
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <ScrollArea className="h-[65vh] sm:h-[70vh]">
                            <div className="px-7 pb-7 -mt-10 relative z-10">
                                {/* Avatar row */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-7">
                                    <div className="relative">
                                        <div className={cn("h-24 w-24 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-background overflow-hidden", getGrad(selectedDoctor.doctorname))}>
                                            {selectedDoctor.profile_image_url ? <img src={selectedDoctor.profile_image_url} alt={selectedDoctor.doctorname} className="h-full w-full object-cover" /> : selectedDoctor.doctorname?.charAt(0)}
                                        </div>
                                        <span className={cn("absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-background shadow", selectedDoctor.isactive ? "bg-emerald-500" : "bg-rose-500")} />
                                    </div>
                                    <div className="flex-1 text-center sm:text-left sm:pb-1">
                                        <h2 className="text-2xl font-bold text-foreground">{selectedDoctor.doctorname}</h2>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 text-[11px] font-semibold">
                                                <Stethoscope className="h-3 w-3" />{selectedDoctor.specializationName}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 text-[11px] font-semibold">
                                                <Building className="h-3 w-3" />{selectedDoctor.hospitalName}
                                            </span>
                                            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                                selectedDoctor.isactive ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400")}>
                                                {selectedDoctor.isactive ? <><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"/></span>Active</> : <><span className="h-1.5 w-1.5 rounded-full bg-rose-500"/>Inactive</>}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleOpenEdit(selectedDoctor)} className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all shrink-0">
                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                    </button>
                                </div>

                                {/* IDs */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {[{ l: "Doctor ID", v: selectedDoctor.doctorid }, { l: "User ID", v: selectedDoctor.userid }].map(({ l, v }) => (
                                        <span key={l} className="inline-flex items-center gap-2 rounded-lg bg-muted/60 border border-border/60 px-3 py-1.5 text-xs">
                                            <span className="font-bold text-muted-foreground uppercase tracking-wider">{l}:</span>
                                            <span className="font-semibold doctor-mono">{v}</span>
                                        </span>
                                    ))}
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Personal */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><UserIcon className="h-3 w-3" />Personal</p>
                                        <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/40">
                                            <a href={`mailto:${selectedDoctor.email}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                                <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Mail className="h-4 w-4" /></div>
                                                <div><p className="text-[10px] text-muted-foreground uppercase font-semibold">Email</p><p className="text-sm font-semibold truncate">{selectedDoctor.email || "—"}</p></div>
                                            </a>
                                            <a href={`tel:${selectedDoctor.contact}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                                <div className="h-9 w-9 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors"><Phone className="h-4 w-4" /></div>
                                                <div><p className="text-[10px] text-muted-foreground uppercase font-semibold">Phone</p><p className="text-sm font-semibold doctor-mono">{selectedDoctor.contact || "—"}</p></div>
                                            </a>
                                            <div className="flex items-center gap-3 p-3.5">
                                                <div className="h-9 w-9 rounded-full bg-muted/60 border border-border/60 text-muted-foreground flex items-center justify-center shrink-0"><UserIcon className="h-4 w-4" /></div>
                                                <div><p className="text-[10px] text-muted-foreground uppercase font-semibold">Gender</p><p className="text-sm font-semibold">{selectedDoctor.gender || "—"}</p></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Shield className="h-3 w-3" />Professional</p>
                                        <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/40">
                                            {[
                                                { icon: GraduationCap, color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400", label: "Qualification", value: selectedDoctor.qualification },
                                                { icon: FileText,      color: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",   label: "License No.",    value: selectedDoctor.medical_license_no, mono: true },
                                                { icon: Clock,         color: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",       label: "Experience",     value: `${selectedDoctor.experience || 0} Years` },
                                                { icon: Banknote,      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400", label: "Consultation",   value: `₹${selectedDoctor.fees || selectedDoctor.consultation_fees || 0}`, mono: true },
                                            ].map(({ icon: Icon, color, label, value, mono }) => (
                                                <div key={label} className="flex items-center gap-3 p-3.5">
                                                    <div className={cn("h-9 w-9 rounded-full border flex items-center justify-center shrink-0", color)}><Icon className="h-4 w-4" /></div>
                                                    <div><p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p><p className={cn("text-sm font-semibold", mono && "doctor-mono")}>{value || "—"}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Schedule */}
                                    <div className="sm:col-span-2 space-y-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" />Weekly Schedule</p>
                                        {isLoadingSchedule ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {[...Array(7)].map((_, i) => <Bone key={i} className="h-10 rounded-xl" />)}
                                            </div>
                                        ) : viewSchedule.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {viewSchedule.map((day: any) => (
                                                    <div key={day.day_of_week} className={cn("rounded-xl border p-2.5 text-center transition-colors", day.is_available ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900" : "bg-muted/20 border-border/40 opacity-50")}>
                                                        <p className="text-[11px] font-bold text-muted-foreground uppercase">{DAYS[day.day_of_week]}</p>
                                                        {day.is_available ? (
                                                            <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 doctor-mono mt-0.5">{day.start_time}–{day.end_time}</p>
                                                        ) : (
                                                            <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">Closed</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No schedule set.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Footer */}
                        <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                            <button onClick={handleCancel} className="h-9 px-4 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Close</button>
                            <div className="flex gap-2">
                                <button onClick={() => setIsScheduleOpen(true)} className="h-9 px-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2 hover:bg-emerald-100 transition-all">
                                    <Calendar className="h-3.5 w-3.5" /> Schedule
                                </button>
                                <button onClick={() => handleOpenEdit(selectedDoctor)} className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all">
                                    <Pencil className="h-3.5 w-3.5" /> Edit Profile
                                </button>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            {/* ── Schedule Modal ── */}
            <DoctorScheduleModal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} doctor={selectedDoctor} />
        </>
    );
}
"use client";

import { useState, useMemo } from "react";
import {
    Search, Plus, RefreshCw, Mail, Phone, UserCog,
    CheckCircle2, Filter, Eye, EyeOff, Pencil, Shield,
    User as UserIcon, X, Building2, Building, Lock,
    Users, UserCheck, UserX, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { ImageUpload } from "@/components/ui/image-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useApi } from "@/hooks/use-api";

import { useData, Receptionist } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

import { z } from "zod";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const passwordSchema = z.string()
    .min(6, "Min 6 characters").max(12, "Max 12 characters")
    .regex(/[A-Z]/, "Must contain uppercase").regex(/[a-z]/, "Must contain lowercase")
    .regex(/\d/, "Must contain a number").regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain special character")
    .regex(/^\S*$/, "Must not contain spaces");

const receptionistSchema = z.object({
    full_name:    z.string().min(2, "Min 2 characters"),
    email:        z.email("Invalid email"),
    phone_number: z.string().min(10, "Must be 10 digits").regex(/^\d+$/, "Numbers only"),
    hospital_id:  z.string().min(1, "Hospital required"),
    joining_date: z.string().min(1, "Joining date required"),
    password:     z.string().optional(),
});

const receptionistCreateSchema = receptionistSchema.extend({ password: passwordSchema });
const receptionistUpdateSchema  = receptionistSchema.extend({ password: passwordSchema.optional().or(z.literal("")) });

type ReceptionistFormValues = z.infer<typeof receptionistSchema>;

// ─── Motion variants ──────────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const cardVariants: import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    show:   { opacity: 1, y: 0,  scale: 1,    transition: { type: "spring", stiffness: 300, damping: 24 } },
};

// ─── Avatar gradient palette ──────────────────────────────────────────────────

const GRADIENTS = [
    "from-blue-500 to-cyan-500",    "from-violet-500 to-purple-500",
    "from-emerald-500 to-teal-500", "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500", "from-indigo-500 to-blue-500",
    "from-teal-500 to-emerald-500", "from-fuchsia-500 to-violet-500",
];
const getGrad = (name: string) => GRADIENTS[(name?.charCodeAt(0) || 0) % GRADIENTS.length];

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-xl bg-muted/60", className)} />;
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

function ReceptionistCardSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="rounded-3xl border border-border/50 bg-card overflow-hidden"
        >
            {/* top accent */}
            <Bone className="h-1.5 w-full rounded-none" />
            <div className="px-6 pt-7 pb-6 flex flex-col items-center gap-4">
                <Bone className="h-20 w-20 rounded-2xl" />
                <div className="w-full flex flex-col items-center gap-2">
                    <Bone className="h-5 w-36" />
                    <Bone className="h-5 w-20 rounded-full" />
                    <Bone className="h-4 w-28 rounded-full mt-1" />
                </div>
                <div className="w-full h-px bg-border/40" />
                <div className="w-full space-y-3">
                    {[0, 1].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <Bone className="h-8 w-8 rounded-full shrink-0" />
                            <Bone className="h-3.5 flex-1" />
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 group
                       hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300"
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

// ─── Receptionist Card ────────────────────────────────────────────────────────

function ReceptionistCard({ rec, getHospitalName, canManage, onView, onEdit, onToggle, actionLoading }: {
    rec: Receptionist; getHospitalName: (id?: string) => string;
    canManage: boolean; onView: () => void; onEdit: () => void; onToggle: () => void; actionLoading: string | null;
}) {
    const grad     = getGrad(rec.name);
    const isActive = rec.isactive;

    return (
        <motion.div
            variants={cardVariants}
            layout
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="group relative rounded-3xl border border-border/50 bg-card overflow-hidden
                       hover:border-border hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]
                       hover:-translate-y-1 transition-all duration-300"
        >
            {/* Status accent bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500",
                isActive ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-rose-400 to-rose-600"
            )} />

            {/* Background glow blob */}
            <div className={cn(
                "absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none",
                isActive ? "bg-emerald-500" : "bg-rose-500"
            )} />

            {/* Action buttons — hidden until hover */}
            {canManage && (
                <div className="absolute top-5 right-4 flex items-center gap-1.5 z-20
                                opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                    <Tooltip content="View">
                        <button onClick={onView} disabled={actionLoading !== null}
                            className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center
                                       text-muted-foreground hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all disabled:opacity-50">
                            {actionLoading === `${rec.receptionistid}-view` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                    </Tooltip>
                    <Tooltip content="Edit">
                        <button onClick={e => { e.stopPropagation(); onEdit(); }} disabled={actionLoading !== null}
                            className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center
                                       text-muted-foreground hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all disabled:opacity-50">
                            {actionLoading === `${rec.receptionistid}-edit` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" /> : <Pencil className="h-3.5 w-3.5" />}
                        </button>
                    </Tooltip>
                    <Tooltip content={isActive ? "Deactivate" : "Activate"}>
                        <button onClick={e => { e.stopPropagation(); onToggle(); }} disabled={actionLoading !== null}
                            className={cn(
                                "h-7 w-7 rounded-lg border shadow-sm flex items-center justify-center transition-all disabled:opacity-50",
                                isActive
                                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-100"
                                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-100"
                            )}>
                            {actionLoading === `${rec.receptionistid}-status` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" /> : (isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />)}
                        </button>
                    </Tooltip>
                </div>
            )}

            {/* Body */}
            <div className="pt-8 px-6 pb-6 flex flex-col items-center text-center relative z-10">
                {/* Avatar */}
                <div className="relative mb-4">
                    <div className={cn(
                        "h-20 w-20 rounded-2xl bg-gradient-to-br flex items-center justify-center overflow-hidden",
                        "text-white text-2xl font-bold shadow-lg group-hover:scale-105 transition-transform duration-300",
                        grad
                    )}>
                        {rec.profile_image_url
                            ? <img src={rec.profile_image_url} alt={rec.name} className="h-full w-full object-cover" />
                            : rec.name.charAt(0).toUpperCase()
                        }
                    </div>
                    <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background shadow-sm",
                        isActive ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                </div>

                {/* Name + role */}
                <p className="text-[17px] font-bold text-foreground/90 leading-tight truncate max-w-full px-2">{rec.name}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/8 border border-primary/15 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                    <UserCog className="h-3 w-3 opacity-70" />
                    Receptionist
                </span>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 text-muted-foreground px-3 py-1 text-[11px] font-medium max-w-full">
                    <Building2 className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="truncate">{getHospitalName(rec.hospitalid)}</span>
                </span>

                {/* Divider */}
                <div className="w-full h-px bg-border/40 my-4" />

                {/* Contact */}
                <div className="w-full space-y-2.5">
                    <a href={`mailto:${rec.email}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-3 rounded-xl hover:bg-muted/40 p-2 -mx-2 transition-all group/link">
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover/link:bg-blue-500 group-hover/link:text-white transition-colors">
                            <Mail className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate text-muted-foreground group-hover/link:text-foreground font-medium transition-colors text-xs">{rec.email}</span>
                    </a>
                    <a href={`tel:${rec.contact}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-3 rounded-xl hover:bg-muted/40 p-2 -mx-2 transition-all group/link">
                        <div className="h-8 w-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover/link:bg-violet-500 group-hover/link:text-white transition-colors">
                            <Phone className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-muted-foreground group-hover/link:text-foreground font-medium transition-colors text-xs rec-mono">{rec.contact}</span>
                    </a>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReceptionistList() {
    const { hospitals, updateReceptionist } = useData();
    const { user }     = useAuth();
    const { addToast } = useToast();

    const { data: apiRecs = [], isLoading: isRecsLoading, isValidating: isRefreshing, mutate: refreshReceptionists } = useApi<any[]>('/hospitals/receptionists');

    const [isFilterOpen,  setIsFilterOpen]  = useState(false);
    const [isModalOpen,   setIsModalOpen]   = useState(false);
    const [modalMode,     setModalMode]     = useState<"add" | "edit">("add");
    const [isViewOpen,    setIsViewOpen]    = useState(false);
    const [isSubmitting,  setIsSubmitting]  = useState(false);
    const [showPassword,  setShowPassword]  = useState(false);
    const [selectedRec,   setSelectedRec]   = useState<Receptionist | null>(null);
    const [profileImage,  setProfileImage]  = useState<File | null>(null);
    const [profileDisplay, setProfileDisplay] = useState<File | string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const receptionists = useMemo<Receptionist[]>(() => apiRecs.map((u: any) => {
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
    }), [apiRecs]);

    // Filters
    const [generalSearch,    setGeneralSearch]    = useState("");
    const [searchName,       setSearchName]       = useState("");
    const [searchEmail,      setSearchEmail]      = useState("");
    const [searchContact,    setSearchContact]    = useState("");
    const [searchHospitalId, setSearchHospitalId] = useState("");
    const [searchStatus,     setSearchStatus]     = useState("all");
    const [startDate,        setStartDate]        = useState("");
    const [endDate,          setEndDate]          = useState("");
    const [activeFilters,    setActiveFilters]    = useState({
        general: "", name: "", email: "", contact: "", hospitalId: "", status: "all", start: "", end: "",
    });

    const form = useForm<ReceptionistFormValues>({
        resolver: zodResolver(modalMode === "add" ? receptionistCreateSchema : receptionistUpdateSchema) as any,
        defaultValues: { full_name: "", email: "", phone_number: "", joining_date: new Date().toISOString().split("T")[0], hospital_id: "", password: "" },
    });

    const canManage    = ["SuperAdmin", "GroupAdmin", "HospitalAdmin"].includes(user?.role || "");
    const myGroupId    = user?.hospitalgroupid?.toString();
    const myHospitals  = user?.role === "SuperAdmin" ? hospitals : hospitals.filter(h => h.hospitalgroupid === myGroupId);
    const getHospitalName = (id?: string) => hospitals.find(h => h.hospitalid === id)?.hospitalname || "Unknown";
    const myRecs       = receptionists.filter(r => myHospitals.some(h => h.hospitalid === r.hospitalid));

    const filteredRecs = useMemo(() => myRecs.filter(rec => {
        const { general, name, email, contact, hospitalId, status, start, end } = activeFilters;
        if (general) {
            const q = general.toLowerCase();
            if (!rec.name.toLowerCase().includes(q) && !rec.email.toLowerCase().includes(q) &&
                !rec.contact.includes(q) && !getHospitalName(rec.hospitalid).toLowerCase().includes(q)) return false;
        }
        if (name     && !rec.name.toLowerCase().includes(name.toLowerCase()))   return false;
        if (email    && !rec.email.toLowerCase().includes(email.toLowerCase())) return false;
        if (contact  && !rec.contact.includes(contact))                          return false;
        if (hospitalId && rec.hospitalid !== hospitalId)                         return false;
        if (status !== "all" && (status === "active" ? !rec.isactive : rec.isactive)) return false;
        if (start || end) {
            const d = new Date(rec.joiningDate || ""); d.setHours(0,0,0,0);
            if (start) { const s = new Date(start); s.setHours(0,0,0,0); if (d < s) return false; }
            if (end)   { const e = new Date(end);   e.setHours(0,0,0,0); if (d > e) return false; }
        }
        return true;
    }), [myRecs, activeFilters]);

    const hospitalOptions = myHospitals.map(h => ({ label: h.hospitalname, value: h.hospitalid }));
    const uniqueNames     = Array.from(new Set(myRecs.map(r => r.name))).map(n => ({ label: n, value: n }));
    const uniqueEmails    = Array.from(new Set(myRecs.map(r => r.email))).map(e => ({ label: e, value: e }));
    const uniqueContacts  = Array.from(new Set(myRecs.map(r => r.contact))).filter(Boolean).map(p => ({ label: p, value: p }));

    const applyFilters = () => setActiveFilters({ general: generalSearch, name: searchName, email: searchEmail, contact: searchContact, hospitalId: searchHospitalId, status: searchStatus, start: startDate, end: endDate });
    const resetFilters = () => {
        setGeneralSearch(""); setSearchName(""); setSearchEmail(""); setSearchContact("");
        setSearchHospitalId(""); setSearchStatus("all"); setStartDate(""); setEndDate("");
        setActiveFilters({ general: "", name: "", email: "", contact: "", hospitalId: "", status: "all", start: "", end: "" });
    };

    const handleOpenAdd = () => {
        setModalMode("add"); setSelectedRec(null); setProfileImage(null); setProfileDisplay(null);
        form.reset({ full_name: "", email: "", phone_number: "", password: "", joining_date: new Date().toISOString().split("T")[0], hospital_id: canManage && myHospitals.length === 1 ? myHospitals[0].hospitalid : "", });
        setIsModalOpen(true);
    };

    const handleOpenEdit = async (rec: Receptionist) => {
        setActionLoading(`${rec.receptionistid}-edit`);
        await new Promise(r => setTimeout(r, 400));
        setModalMode("edit"); setSelectedRec(rec); setProfileImage(null); setProfileDisplay(rec.profile_image_url || null);
        form.reset({ full_name: rec.name, email: rec.email, phone_number: rec.contact, joining_date: rec.joiningDate, hospital_id: rec.hospitalid, password: "" });
        setIsModalOpen(true);
        setActionLoading(null);
    };

    const handleView = async (rec: Receptionist) => {
        setActionLoading(`${rec.receptionistid}-view`);
        await new Promise(r => setTimeout(r, 400));
        setSelectedRec(rec); setIsViewOpen(true);
        setActionLoading(null);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setTimeout(() => { setModalMode("add"); form.reset(); setProfileImage(null); setProfileDisplay(null); setSelectedRec(null); }, 300);
    };

    const handleToggleStatus = async (rec: Receptionist) => {
        try {
            await updateReceptionist(rec.receptionistid, { isactive: !rec.isactive });
            addToast(`Receptionist ${rec.isactive ? "deactivated" : "activated"}`, "success");
        } catch { addToast("Failed to update status", "error"); }
    };

    const onSubmit: SubmitHandler<ReceptionistFormValues> = async values => {
        setIsSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("full_name",    values.full_name);
            fd.append("email",        values.email);
            fd.append("phone_number", values.phone_number);
            fd.append("joining_date", values.joining_date);
            if (values.hospital_id)       fd.append("hospital_id",       values.hospital_id);
            else if (user?.hospitalid)    fd.append("hospital_id",       user.hospitalid);
            if (user?.hospitalgroupid)    fd.append("hospital_group_id", user.hospitalgroupid);
            if (values.password)          fd.append("password",          values.password);
            if (profileImage)             fd.append("file",              profileImage);

            if (modalMode === "add") {
                await api.post("/auth/register-receptionist", fd);
                addToast("Receptionist registered successfully", "success");
            } else if (selectedRec) {
                await api.put(`/hospitals/receptionist/${selectedRec.receptionistid}`, fd);
                addToast("Receptionist updated successfully", "success");
            }
            await refreshReceptionists?.();
            setIsModalOpen(false);
        } catch (error: any) {
            addToast(error.response?.data?.message || error.message || "Operation failed", "error");
        } finally { setIsSubmitting(false); }
    };

    const activeFilterCount = Object.entries(activeFilters).filter(([k, v]) => k === "status" ? v !== "all" : !!v).length;

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
                .rec-root { font-family: 'DM Sans', sans-serif; }
                .rec-root * { font-family: inherit; }
                .rec-mono { font-family: 'DM Mono', monospace !important; }
                .pill-sel { background: white; color: #1e293b; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
                .dark .pill-sel { background: #1e293b; color: #f1f5f9; }
            `}</style>

            <div className="rec-root space-y-6 pb-10">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Staff Management</span>
                        </div>
                        <h2 className="text-[28px] font-bold tracking-tight text-foreground leading-none">Receptionists</h2>
                        <p className="text-sm text-muted-foreground mt-1.5">Manage front desk staff and access controls</p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <button
                            onClick={() => refreshReceptionists()}
                            disabled={isRecsLoading || isRefreshing}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-all"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", (isRecsLoading || isRefreshing) && "animate-spin text-blue-500")} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className={cn(
                                "relative inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium transition-all",
                                isFilterOpen
                                    ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_12px_rgba(37,99,235,0.35)]"
                                    : "border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-background">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        {canManage && (
                            <button
                                onClick={handleOpenAdd}
                                className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(37,99,235,0.35)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.45)] transition-all"
                            >
                                <Plus className="h-4 w-4" /> Add Receptionist
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* ── Stat Cards ── */}
                {isRecsLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[0,1,2,3].map(i => (
                            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                <StatCardSkeleton />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Total"    value={myRecs.length}                         delay={0}    icon={Users}     iconBg="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900"           glow="bg-blue-400/20"    />
                        <StatCard label="Active"   value={myRecs.filter(r=>r.isactive).length}   delay={0.07} icon={UserCheck} iconBg="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" glow="bg-emerald-400/20" />
                        <StatCard label="Inactive" value={myRecs.filter(r=>!r.isactive).length}  delay={0.14} icon={UserX}    iconBg="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900"             glow="bg-rose-400/20"    />
                        <StatCard label="Filtered" value={filteredRecs.length}                   delay={0.21} icon={Filter}   iconBg="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900"   glow="bg-violet-400/20"  />
                    </div>
                )}

                {/* ── Search bar ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by name, email, contact, hospital..."
                            value={generalSearch}
                            onChange={e => { setGeneralSearch(e.target.value); setActiveFilters(p => ({ ...p, general: e.target.value })); }}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                </motion.div>

                {/* ── Cards Grid ── */}
                {isRecsLoading ? (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => <ReceptionistCardSkeleton key={i} delay={i * 0.05} />)}
                    </div>
                ) : filteredRecs.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border/40 bg-muted/10"
                    >
                        <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center mb-4">
                            <UserCog className="h-7 w-7 text-blue-400" />
                        </div>
                        <p className="text-base font-semibold text-foreground/80">No receptionists found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {activeFilterCount > 0 ? "Try adjusting your filters." : "Add your first receptionist to get started."}
                        </p>
                        {activeFilterCount > 0 && (
                            <button onClick={resetFilters} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Clear all filters</button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key={JSON.stringify(activeFilters)}
                        variants={containerVariants} initial="hidden" animate="show"
                        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredRecs.map(rec => (
                                <ReceptionistCard
                                    key={rec.receptionistid}
                                    rec={rec}
                                    getHospitalName={getHospitalName}
                                    canManage={canManage}
                                    onView={() => handleView(rec)}
                                    onEdit={() => handleOpenEdit(rec)}
                                    onToggle={() => handleToggleStatus(rec)}
                                    actionLoading={actionLoading}
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
                                <SheetDescription className="text-xs">Refine the receptionist list</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
                            <SearchableSelect options={uniqueNames} value={searchName} onChange={setSearchName} placeholder="Select name..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                            <SearchableSelect options={uniqueEmails} value={searchEmail} onChange={setSearchEmail} placeholder="Select email..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</label>
                            <SearchableSelect options={uniqueContacts} value={searchContact} onChange={setSearchContact} placeholder="Select contact..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hospital</label>
                            <SearchableSelect options={hospitalOptions} value={searchHospitalId} onChange={setSearchHospitalId} placeholder="Select hospital..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                            <Select value={searchStatus} onValueChange={v => setSearchStatus(v)}>
                                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From</label>
                                <DatePicker value={startDate} onChange={setStartDate} placeholder="Start" maxDate={endDate} className="h-10 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</label>
                                <DatePicker value={endDate} onChange={setEndDate} placeholder="End" minDate={startDate} className="h-10 rounded-xl" />
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-5 border-t bg-muted/10 flex gap-2.5">
                        <button onClick={resetFilters} className="flex-1 h-9 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Reset</button>
                        <button onClick={() => { applyFilters(); setIsFilterOpen(false); }} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] transition-all">Apply</button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Add / Edit Dialog ── */}
            <Dialog open={isModalOpen} onOpenChange={open => !open && handleCancel()}>
                <DialogContent className="max-w-2xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden flex flex-col max-h-[90vh]">
                    {/* Gradient header */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-7 pt-7 pb-6 shrink-0">
                        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute bottom-0 left-24 h-16 w-16 rounded-full bg-indigo-400/20 blur-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                                    {modalMode === "edit" ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white">{modalMode === "edit" ? "Update Receptionist" : "New Receptionist"}</DialogTitle>
                                    <DialogDescription className="text-blue-200 text-xs mt-0.5">{modalMode === "edit" ? "Modify staff details" : "Onboard new front desk staff"}</DialogDescription>
                                </div>
                            </div>
                            <button className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all" onClick={handleCancel}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7">
                            {/* Profile photo */}
                            <div className="flex flex-col items-center gap-2">
                                <ImageUpload value={profileImage || profileDisplay} onChange={f => setProfileImage(f)} variant="avatar" showActions label="" />
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Profile Photo</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                {/* Personal */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-5 w-5 rounded-md bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                                            <UserIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Personal Details</span>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Full Name",     name: "full_name",    type: "text",  placeholder: "John Doe",         icon: UserIcon },
                                            { label: "Email Address", name: "email",        type: "email", placeholder: "name@clinic.com",  icon: Mail    },
                                            { label: "Phone Number",  name: "phone_number", type: "tel",   placeholder: "98765 00000",      icon: Phone   },
                                        ].map(field => (
                                            <div key={field.name} className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                    {field.label} <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <input
                                                        {...form.register(field.name as any)}
                                                        type={field.type}
                                                        placeholder={field.placeholder}
                                                        maxLength={field.name === "phone_number" ? 10 : undefined}
                                                        onInput={field.name === "phone_number" ? (e: any) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "") : undefined}
                                                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-all"
                                                    />
                                                </div>
                                                {(form.formState.errors as any)[field.name] && (
                                                    <p className="text-[11px] text-rose-500 font-medium">{(form.formState.errors as any)[field.name]?.message}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Access */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-5 w-5 rounded-md bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                                            <Shield className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assignment & Access</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hospital Branch <span className="text-rose-500">*</span></label>
                                            <SearchableSelect options={hospitalOptions} value={form.watch("hospital_id")} onChange={v => form.setValue("hospital_id", v, { shouldValidate: true })} placeholder="Select hospital" className="w-full" disabled={modalMode === "edit"} />
                                            {form.formState.errors.hospital_id && <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.hospital_id.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Joining Date <span className="text-rose-500">*</span></label>
                                            <Controller control={form.control} name="joining_date" render={({ field }) => (
                                                <DatePicker value={field.value} onChange={field.onChange} className="w-full h-10 rounded-xl" />
                                            )} />
                                            {form.formState.errors.joining_date && <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.joining_date.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Password {modalMode === "add" && <span className="text-rose-500">*</span>}
                                            </label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-violet-500 transition-colors pointer-events-none" />
                                                <input
                                                    {...form.register("password")}
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={modalMode === "edit" ? "Leave blank to keep current" : "••••••••"}
                                                    onKeyDown={e => { if (e.key === " ") e.preventDefault(); }}
                                                    className="w-full h-10 pl-9 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 hover:border-violet-300 transition-all"
                                                />
                                                <button type="button" onClick={() => setShowPassword(p => !p)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground/50 hover:text-violet-500 rounded-md transition-colors">
                                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">Must include uppercase, lowercase, number &amp; special character</p>
                                            {form.formState.errors.password && <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.password.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex justify-end gap-2.5 shrink-0">
                            <button type="button" onClick={handleCancel} className="h-9 px-5 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Cancel</button>
                            <button type="submit" disabled={isSubmitting || (!form.formState.isDirty && !profileImage)}
                                className="h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.4)] flex items-center gap-2 transition-all">
                                {isSubmitting ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving...</> : <><CheckCircle2 className="h-3.5 w-3.5" />{modalMode === "edit" ? "Save Changes" : "Register"}</>}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── View Dialog ── */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                {selectedRec && (
                    <DialogContent className="max-w-xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden max-h-[90vh] overflow-y-auto">
                        {/* Gradient header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-7 pt-7 pb-16">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                            <div className="absolute bottom-0 left-24 h-16 w-16 rounded-full bg-indigo-400/20 blur-2xl" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white">Receptionist Profile</DialogTitle>
                                    <DialogDescription className="text-blue-200 text-xs mt-0.5">View full details</DialogDescription>
                                </div>
                                <button className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all" onClick={() => setIsViewOpen(false)}>
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="px-7 pb-7 -mt-10 relative z-10">
                            {/* Avatar overlap */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-7">
                                <div className="relative">
                                    <div className={cn("h-24 w-24 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-background overflow-hidden", getGrad(selectedRec.name))}>
                                        {selectedRec.profile_image_url
                                            ? <img src={selectedRec.profile_image_url} alt={selectedRec.name} className="h-full w-full object-cover" />
                                            : selectedRec.name.charAt(0).toUpperCase()
                                        }
                                    </div>
                                    <span className={cn("absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-background shadow", selectedRec.isactive ? "bg-emerald-500" : "bg-rose-500")} />
                                </div>
                                <div className="flex-1 text-center sm:text-left sm:pb-1">
                                    <h2 className="text-2xl font-bold text-foreground leading-tight">{selectedRec.name}</h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 border border-primary/15 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                                            <UserCog className="h-3 w-3 opacity-70" /> Receptionist
                                        </span>
                                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                            selectedRec.isactive
                                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                                                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400"
                                        )}>
                                            {selectedRec.isactive
                                                ? <><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>Active</>
                                                : <><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Inactive</>
                                            }
                                        </span>
                                    </div>
                                </div>
                                {canManage && (
                                    <button onClick={() => { setIsViewOpen(false); handleOpenEdit(selectedRec); }}
                                        className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all shrink-0">
                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                    </button>
                                )}
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Contact */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" />Contact</p>
                                    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/40">
                                        <a href={`mailto:${selectedRec.email}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                            <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Email</p>
                                                <p className="text-sm font-semibold truncate">{selectedRec.email}</p>
                                            </div>
                                        </a>
                                        <a href={`tel:${selectedRec.contact}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                            <div className="h-9 w-9 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Phone</p>
                                                <p className="text-sm font-semibold rec-mono">{selectedRec.contact}</p>
                                            </div>
                                        </a>
                                    </div>
                                </div>

                                {/* Identity */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Shield className="h-3 w-3" />Identity</p>
                                    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/40">
                                        <div className="p-3.5">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Receptionist ID</p>
                                            <p className="text-sm font-semibold rec-mono">{selectedRec.receptionistid}</p>
                                        </div>
                                        <div className="p-3.5">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Joined</p>
                                            <p className="text-sm font-semibold">{selectedRec.joiningDate ? new Date(selectedRec.joiningDate as string).toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hospital */}
                                <div className="sm:col-span-2 space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Building className="h-3 w-3" />Employment</p>
                                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Hospital Branch</p>
                                            <p className="text-base font-bold text-foreground">{getHospitalName(selectedRec.hospitalid)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </>
    );
}
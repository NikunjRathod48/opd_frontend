"use client";

import { useState, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData, User } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    Plus, Search, Shield, Building, Eye, Pencil, Mail, Phone,
    User as UserIcon, X, Building2, EyeOff, Filter, CheckCircle2,
    RefreshCw, Users, UserCheck, UserX, Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useApi } from "@/hooks/use-api";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const passwordSchema = z.string()
    .min(6, "Min 6 characters")
    .max(12, "Max 12 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/\d/, "Must contain a number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain special character");

const adminSchema = z.object({
    name:        z.string().min(2, "Min 2 characters"),
    email:       z.email("Invalid email"),
    phoneno:     z.string().length(10, "Must be 10 digits").regex(/^\d+$/, "Numbers only"),
    hospitalid:  z.string().min(1, "Hospital required"),
    joiningDate: z.string().min(1, "Joining date required"),
    isactive:    z.boolean().default(true),
    password:    z.string().optional(),
});

const adminCreateSchema = adminSchema.extend({ password: passwordSchema });
const adminUpdateSchema = adminSchema.extend({ password: passwordSchema.optional().or(z.literal("")) });

type AdminFormValues = z.infer<typeof adminSchema>;

// ─── Motion variants ──────────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const cardVariants : import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    show: (i: number) => ({
        opacity: 1, 
        y: 0,  
        scale: 1,    
        transition: { delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 } 
    }),
};

// ─── Gradient palette per initial letter ─────────────────────────────────────

const avatarGradients = [
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-indigo-500 to-blue-500",
    "from-teal-500 to-emerald-500",
    "from-fuchsia-500 to-violet-500",
];
const getGrad = (name: string) => avatarGradients[(name?.charCodeAt(0) || 0) % avatarGradients.length];

// ─── Skeleton Components ──────────────────────────────────────────────────────

function SkeletonPulse({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-xl bg-muted/60", className)} />;
}

function StatCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5">
            <SkeletonPulse className="h-10 w-10 rounded-xl mb-4" />
            <SkeletonPulse className="h-8 w-16 mb-2" />
            <SkeletonPulse className="h-3 w-24" />
        </div>
    );
}

function AdminCardSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="rounded-3xl border border-border/50 bg-card overflow-hidden"
        >
            {/* Top accent */}
            <div className="h-1.5 w-full bg-muted/60 animate-pulse" />

            <div className="p-6 flex flex-col items-center gap-4">
                {/* Avatar */}
                <SkeletonPulse className="h-20 w-20 rounded-2xl" />
                {/* Name */}
                <div className="w-full flex flex-col items-center gap-2">
                    <SkeletonPulse className="h-5 w-36" />
                    <SkeletonPulse className="h-5 w-24 rounded-full" />
                    <SkeletonPulse className="h-4 w-32 rounded-full mt-1" />
                </div>
                {/* Divider */}
                <div className="w-full h-px bg-border/40" />
                {/* Contact rows */}
                <div className="w-full space-y-3">
                    <div className="flex items-center gap-3">
                        <SkeletonPulse className="h-8 w-8 rounded-full shrink-0" />
                        <SkeletonPulse className="h-3.5 flex-1" />
                    </div>
                    <div className="flex items-center gap-3">
                        <SkeletonPulse className="h-8 w-8 rounded-full shrink-0" />
                        <SkeletonPulse className="h-3.5 w-28" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label, value, icon: Icon, iconBg, glow, delay,
}: {
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
            <div className={cn(
                "absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                glow
            )} />
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

// ─── Admin Card ───────────────────────────────────────────────────────────────

function AdminCard({
    admin, index, getHospitalName, onView, onEdit, onToggle, actionLoading
}: {
    admin: User; index: number; getHospitalName: (id?: string) => string;
    onView: () => void; onEdit: () => void; onToggle: () => void; actionLoading: string | null;
}) {
    const grad    = getGrad(admin.name);
    const isActive = admin.isactive;

    return (
        <motion.div
            custom={index}
            variants={cardVariants}
            layout
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="group relative rounded-3xl border border-border/50 bg-card overflow-hidden
                       hover:border-border hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]
                       hover:-translate-y-1 transition-all duration-300"
        >
            {/* Status accent bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500",
                isActive
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                    : "bg-gradient-to-r from-rose-400 to-rose-600"
            )} />

            {/* Background glow blob */}
            <div className={cn(
                "absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none",
                isActive ? "bg-emerald-500" : "bg-rose-500"
            )} />

            {/* Action buttons */}
            <div className="absolute top-5 right-4 flex items-center gap-1.5 z-20
                            opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                <Tooltip content="View Profile">
                    <button
                        onClick={onView}
                        disabled={actionLoading !== null}
                        className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm
                                   flex items-center justify-center text-muted-foreground
                                   hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50
                                   dark:hover:bg-blue-950/40 transition-all disabled:opacity-50"
                    >
                        {actionLoading === `${admin.userid}-view` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                </Tooltip>
                <Tooltip content="Edit">
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(); }}
                        disabled={actionLoading !== null}
                        className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm
                                   flex items-center justify-center text-muted-foreground
                                   hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50
                                   dark:hover:bg-violet-950/40 transition-all disabled:opacity-50"
                    >
                        {actionLoading === `${admin.userid}-edit` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" /> : <Pencil className="h-3.5 w-3.5" />}
                    </button>
                </Tooltip>
                <Tooltip content={isActive ? "Deactivate" : "Activate"}>
                    <button
                        onClick={e => { e.stopPropagation(); onToggle(); }}
                        disabled={actionLoading !== null}
                        className={cn(
                            "h-7 w-7 rounded-lg border shadow-sm flex items-center justify-center transition-all disabled:opacity-50",
                            isActive
                                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-100"
                                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-100"
                        )}
                    >
                        {actionLoading === `${admin.userid}-toggle` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />)}
                    </button>
                </Tooltip>
            </div>

            {/* Card body */}
            <div className="pt-8 px-6 pb-6 flex flex-col items-center text-center relative z-10">
                {/* Avatar */}
                <div className="relative mb-4">
                    <div className="h-20 w-20 rounded-2xl p-0.5 bg-gradient-to-br shadow-lg" style={{ background: "var(--tw-gradient-from)" }}>
                        <div className={cn(
                            "h-full w-full rounded-[14px] bg-gradient-to-br flex items-center justify-center overflow-hidden",
                            "text-white text-2xl font-bold shadow-inner group-hover:scale-105 transition-transform duration-300",
                            grad
                        )}>
                            {admin.profile_image_url ? (
                                <img src={admin.profile_image_url} alt={admin.name} className="h-full w-full object-cover" />
                            ) : (
                                admin.name.charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>
                    {/* Active indicator */}
                    <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background shadow-sm",
                        isActive ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                </div>

                {/* Name + role */}
                <p className="text-[17px] font-bold text-foreground/90 leading-tight truncate max-w-full px-2">
                    {admin.name}
                </p>

                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/8 border border-primary/15
                                 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                    <Shield className="h-3 w-3 opacity-70" />
                    Hospital Admin
                </span>

                {/* Hospital */}
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50
                                 text-muted-foreground px-3 py-1 text-[11px] font-medium max-w-full">
                    <Building2 className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="truncate">{getHospitalName(admin.hospitalid)}</span>
                </span>

                {/* Divider */}
                <div className="w-full h-px bg-border/40 my-4" />

                {/* Contact */}
                <div className="w-full space-y-2.5">
                    <a
                        href={`mailto:${admin.email}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-3 text-sm rounded-xl hover:bg-muted/40 p-2 -mx-2 transition-all group/link"
                    >
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20
                                        text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0
                                        group-hover/link:bg-blue-500 group-hover/link:text-white transition-colors">
                            <Mail className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate text-muted-foreground group-hover/link:text-foreground font-medium transition-colors text-xs">
                            {admin.email}
                        </span>
                    </a>
                    <a
                        href={`tel:${admin.phoneno}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-3 text-sm rounded-xl hover:bg-muted/40 p-2 -mx-2 transition-all group/link"
                    >
                        <div className="h-8 w-8 rounded-full bg-violet-500/10 border border-violet-500/20
                                        text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0
                                        group-hover/link:bg-violet-500 group-hover/link:text-white transition-colors">
                            <Phone className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-muted-foreground group-hover/link:text-foreground font-medium transition-colors text-xs admin-mono">
                            {admin.phoneno}
                        </span>
                    </a>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HospitalAdminList() {
    const { hospitals, updateAdmin, toggleAdminStatus } = useData();
    const { user }      = useAuth();
    const { addToast }  = useToast();

    const { data: apiAdmins = [], isLoading: isAdminsLoading, isValidating: isRefreshing, mutate: refreshAdmins } = useApi<any[]>('/hospitals/admins');

    const [isModalOpen,    setIsModalOpen]    = useState(false);
    const [modalMode,      setModalMode]      = useState<"add" | "edit">("add");
    const [isViewOpen,     setIsViewOpen]     = useState(false);
    const [selectedAdmin,  setSelectedAdmin]  = useState<User | null>(null);
    const [isSubmitting,   setIsSubmitting]   = useState(false);
    const [showPassword,   setShowPassword]   = useState(false);
    const [isFilterOpen,   setIsFilterOpen]   = useState(false);
    const [actionLoading,  setActionLoading]  = useState<string | null>(null);

    const admins = useMemo<User[]>(() => apiAdmins.map((u: any) => {
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
    }), [apiAdmins]);

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
        general: "", name: "", email: "", contact: "",
        hospitalId: "", status: "all", start: "", end: "",
    });

    const form = useForm<AdminFormValues>({
        resolver: zodResolver(modalMode === "add" ? adminCreateSchema : adminUpdateSchema) as any,
        defaultValues: {
            name: "", email: "", phoneno: "", hospitalid: "", password: "",
            joiningDate: new Date().toISOString().split("T")[0], isactive: true,
        },
        mode: "onChange",
    });
    const [profileImage,        setProfileImage]        = useState<File | null>(null);
    const [profileImageDisplay, setProfileImageDisplay] = useState<File | string | null>(null);

    const myGroupId   = user?.hospitalgroupid?.toString();
    const myHospitals = hospitals.filter(h => myGroupId ? h.hospitalgroupid.toString() === myGroupId : true);
    const hospAdmins  = admins.filter(a =>
        a.role === "HospitalAdmin" && myHospitals.some(h => h.hospitalid === a.hospitalid)
    );

    const getHospitalName = (id?: string) =>
        hospitals.find(h => h.hospitalid === id)?.hospitalname || "Unknown";

    const filteredAdmins = hospAdmins.filter(a => {
        const { general, name, email, contact, hospitalId, status, start, end } = activeFilters;
        if (general) {
            const q = general.toLowerCase();
            const hn = getHospitalName(a.hospitalid).toLowerCase();
            if (!a.userid.toLowerCase().includes(q) && !a.name.toLowerCase().includes(q) &&
                !a.email.toLowerCase().includes(q) && !a.phoneno.includes(q) && !hn.includes(q)) return false;
        }
        if (name     && !a.name.toLowerCase().includes(name.toLowerCase()))   return false;
        if (email    && !a.email.toLowerCase().includes(email.toLowerCase())) return false;
        if (contact  && !a.phoneno.includes(contact))                          return false;
        if (hospitalId && a.hospitalid !== hospitalId)                         return false;
        if (status !== "all" && (status === "active" ? !a.isactive : a.isactive)) return false;
        if (start || end) {
            const d = new Date(a.joiningDate || ""); d.setHours(0, 0, 0, 0);
            if (start) { const s = new Date(start); s.setHours(0,0,0,0); if (d < s) return false; }
            if (end)   { const e = new Date(end);   e.setHours(0,0,0,0); if (d > e) return false; }
        }
        return true;
    });

    const hospitalOptions = myHospitals.map(h => ({ label: h.hospitalname, value: h.hospitalid }));
    const uniqueNames    = Array.from(new Set(hospAdmins.map(a => a.name))).map(n => ({ label: n, value: n }));
    const uniqueEmails   = Array.from(new Set(hospAdmins.map(a => a.email))).map(e => ({ label: e, value: e }));
    const uniqueContacts = Array.from(new Set(hospAdmins.map(a => a.phoneno))).filter(Boolean).map(p => ({ label: p, value: p }));

    const handleOpenAdd = () => {
        setModalMode("add");
        form.reset({ name: "", email: "", phoneno: "", hospitalid: "", password: "", joiningDate: new Date().toISOString().split("T")[0], isactive: true });
        setProfileImage(null); setProfileImageDisplay(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = async (admin: User) => {
        setActionLoading(`${admin.userid}-edit`);
        await new Promise(r => setTimeout(r, 400));
        setSelectedAdmin(admin); setModalMode("edit");
        form.reset({ name: admin.name, email: admin.email, phoneno: admin.phoneno, hospitalid: admin.hospitalid || "", isactive: admin.isactive, password: "", joiningDate: admin.joiningDate || new Date().toISOString().split("T")[0] });
        setProfileImage(null); setProfileImageDisplay(admin.profile_image_url || null);
        setIsModalOpen(true);
        setActionLoading(null);
    };

    const handleView = async (admin: User) => {
        setActionLoading(`${admin.userid}-view`);
        await new Promise(r => setTimeout(r, 400));
        setSelectedAdmin(admin); setIsViewOpen(true);
        setActionLoading(null);
    };

    const handleToggle = async (admin: User) => {
        setActionLoading(`${admin.userid}-toggle`);
        try {
            await toggleAdminStatus(admin.userid);
            addToast(`Admin ${admin.isactive ? "deactivated" : "activated"}`, "success");
            await refreshAdmins();
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setTimeout(() => { setModalMode("add"); form.reset(); setProfileImage(null); setProfileImageDisplay(null); setSelectedAdmin(null); }, 300);
    };

    const applyFilters = () => setActiveFilters({ general: generalSearch, name: searchName, email: searchEmail, contact: searchContact, hospitalId: searchHospitalId, status: searchStatus, start: startDate, end: endDate });
    const resetFilters = () => {
        setGeneralSearch(""); setSearchName(""); setSearchEmail(""); setSearchContact(""); setSearchHospitalId(""); setSearchStatus("all"); setStartDate(""); setEndDate("");
        setActiveFilters({ general: "", name: "", email: "", contact: "", hospitalId: "", status: "all", start: "", end: "" });
    };

    const onSubmit: SubmitHandler<AdminFormValues> = async data => {
        if (!data.hospitalid) { addToast("Please select a hospital", "error"); return; }
        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append("full_name",    data.name);
            payload.append("email",        data.email);
            payload.append("phone_number", data.phoneno);
            payload.append("hospital_id",  data.hospitalid);
            if (myGroupId)        payload.append("hospital_group_id", myGroupId);
            if (data.joiningDate) payload.append("joining_date", new Date(data.joiningDate).toISOString());
            if (data.password)    payload.append("password", data.password);
            if (profileImage)     payload.append("file", profileImage);

            if (modalMode === "edit" && selectedAdmin) {
                await updateAdmin(selectedAdmin.userid, { ...data, profile_image_url: selectedAdmin.profile_image_url });
                addToast("Admin updated successfully", "success");
            } else {
                await import("@/lib/api").then(m => m.api.post("/auth/register-hospital-admin", payload));
                addToast("Admin created successfully", "success");
            }
            if (refreshAdmins) await refreshAdmins();
            setIsModalOpen(false);
        } catch (error: any) {
            addToast(error.message || "Failed to save admin", "error");
        } finally { setIsSubmitting(false); }
    };

    const activeFilterCount = Object.entries(activeFilters).filter(([k, v]) => k === "status" ? v !== "all" : !!v).length;

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
                .admin-root { font-family: 'DM Sans', sans-serif; }
                .admin-root * { font-family: inherit; }
                .admin-mono { font-family: 'DM Mono', monospace !important; }
                .pill-sel { background: white; color: #1e293b; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
                .dark .pill-sel { background: #1e293b; color: #f1f5f9; }
            `}</style>

            <div className="admin-root space-y-6 pb-10">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Management</span>
                        </div>
                        <h2 className="text-[28px] font-bold tracking-tight text-foreground leading-none">Hospital Admins</h2>
                        <p className="text-sm text-muted-foreground mt-1.5">Manage administrators across your hospital branches</p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <button
                            onClick={() => refreshAdmins()}
                            disabled={isAdminsLoading || isRefreshing}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-background
                                       text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50
                                       disabled:opacity-50 transition-all"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", (isAdminsLoading || isRefreshing) && "animate-spin text-indigo-500")} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className={cn(
                                "relative inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium transition-all",
                                isFilterOpen
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_2px_12px_rgba(99,102,241,0.35)]"
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
                        <button
                            onClick={handleOpenAdd}
                            className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700
                                       text-white text-sm font-semibold
                                       shadow-[0_2px_12px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)]
                                       transition-all"
                        >
                            <Plus className="h-4 w-4" /> Add Admin
                        </button>
                    </div>
                </motion.div>

                {/* ── Stat Cards ── */}
                {isAdminsLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[0, 1, 2, 3].map(i => (
                            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                <StatCardSkeleton />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Total Admins" value={hospAdmins.length}              delay={0}    icon={Users}     iconBg="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900"         glow="bg-blue-400/20"    />
                        <StatCard label="Active"       value={hospAdmins.filter(a=>a.isactive).length}  delay={0.07} icon={UserCheck} iconBg="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" glow="bg-emerald-400/20" />
                        <StatCard label="Inactive"     value={hospAdmins.filter(a=>!a.isactive).length} delay={0.14} icon={UserX}    iconBg="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900"          glow="bg-rose-400/20"    />
                        <StatCard label="Filtered"     value={filteredAdmins.length}          delay={0.21} icon={Filter}   iconBg="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900"   glow="bg-violet-400/20"  />
                    </div>
                )}

                {/* ── Search ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by name, email, hospital..."
                            value={generalSearch}
                            onChange={e => { setGeneralSearch(e.target.value); setActiveFilters(p => ({ ...p, general: e.target.value })); }}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm
                                       placeholder:text-muted-foreground/60 focus:outline-none
                                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </motion.div>

                {/* ── Cards Grid ── */}
                {isAdminsLoading ? (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <AdminCardSkeleton key={i} delay={i * 0.05} />
                        ))}
                    </div>
                ) : filteredAdmins.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border/40 bg-muted/10"
                    >
                        <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mb-4">
                            <Shield className="h-7 w-7 text-indigo-400" />
                        </div>
                        <p className="text-base font-semibold text-foreground/80">No admins found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {activeFilterCount > 0 ? "Try adjusting your filters." : "Add your first hospital admin to get started."}
                        </p>
                        {activeFilterCount > 0 && (
                            <button onClick={resetFilters} className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                                Clear all filters
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key={JSON.stringify(activeFilters)}
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredAdmins.map((admin, index) => (
                                <AdminCard
                                    key={admin.userid}
                                    admin={admin}
                                    index={index}
                                    getHospitalName={getHospitalName}
                                    onView={() => handleView(admin)}
                                    onEdit={() => handleOpenEdit(admin)}
                                    onToggle={() => handleToggle(admin)}
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
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center">
                                <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <SheetTitle className="text-base font-bold">Filters</SheetTitle>
                                <SheetDescription className="text-xs">Refine the admin list</SheetDescription>
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
                        <button onClick={() => { applyFilters(); setIsFilterOpen(false); }} className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all">Apply</button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Add / Edit Dialog ── */}
            <Dialog open={isModalOpen} onOpenChange={open => !open && handleCancel()}>
                <DialogContent className="max-w-2xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden flex flex-col max-h-[90vh]">
                    {/* Gradient header */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 px-7 pt-7 pb-6 shrink-0">
                        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute bottom-0 left-24 h-16 w-16 rounded-full bg-blue-400/20 blur-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                                    {modalMode === "edit" ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white">
                                        {modalMode === "edit" ? "Update Administrator" : "New Administrator"}
                                    </DialogTitle>
                                    <DialogDescription className="text-indigo-200 text-xs mt-0.5">
                                        {modalMode === "edit" ? "Modify access privileges" : "System onboarding"}
                                    </DialogDescription>
                                </div>
                            </div>
                            <button
                                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                                onClick={handleCancel}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7">

                            {/* Profile Photo */}
                            <div className="flex flex-col items-center gap-2">
                                <ImageUpload value={profileImage || profileImageDisplay} onChange={f => setProfileImage(f)} variant="avatar" showActions label="" />
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Profile Photo</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                {/* Personal */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-5 w-5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                                            <UserIcon className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Personal Details</span>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Full Name", name: "name", type: "text", placeholder: "Dr. Sarah Smith", icon: UserIcon },
                                            { label: "Email Address", name: "email", type: "email", placeholder: "name@hospital.com", icon: Mail },
                                            { label: "Phone Number", name: "phoneno", type: "tel", placeholder: "98765 00000", icon: Phone },
                                        ].map(field => (
                                            <div key={field.name} className="space-y-1.5">
                                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                    {field.label} <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                                                    <input
                                                        {...form.register(field.name as any)}
                                                        type={field.type}
                                                        placeholder={field.placeholder}
                                                        maxLength={field.name === "phoneno" ? 10 : undefined}
                                                        onInput={field.name === "phoneno" ? (e: any) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "") : undefined}
                                                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm
                                                                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                                                                   hover:border-indigo-300 transition-all"
                                                    />
                                                </div>
                                                {(form.formState.errors as any)[field.name] && (
                                                    <p className="text-[11px] text-rose-500 font-medium">{(form.formState.errors as any)[field.name]?.message}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Access Control */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-5 w-5 rounded-md bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                                            <Shield className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Access Control</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Hospital Branch <span className="text-rose-500">*</span>
                                            </label>
                                            <SearchableSelect
                                                options={hospitalOptions}
                                                value={form.watch("hospitalid")}
                                                onChange={v => form.setValue("hospitalid", v, { shouldDirty: true, shouldValidate: true })}
                                                placeholder="Select hospital"
                                                className="w-full"
                                                disabled={modalMode === "edit"}
                                            />
                                            {form.formState.errors.hospitalid && <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.hospitalid.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Joining Date <span className="text-rose-500">*</span>
                                            </label>
                                            <DatePicker
                                                value={form.watch("joiningDate")}
                                                onChange={d => form.setValue("joiningDate", d, { shouldDirty: true, shouldValidate: true })}
                                                maxDate={new Date().toISOString().split("T")[0]}
                                                className="w-full h-10 rounded-xl"
                                            />
                                            {form.formState.errors.joiningDate && <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.joiningDate.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Password {modalMode === "add" && <span className="text-rose-500">*</span>}
                                            </label>
                                            <div className="relative group">
                                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-violet-500 transition-colors pointer-events-none" />
                                                <input
                                                    {...form.register("password")}
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={modalMode === "edit" ? "Leave blank to keep current" : "••••••••"}
                                                    className="w-full h-10 pl-9 pr-10 rounded-xl border border-input bg-background text-sm
                                                               focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                                               hover:border-violet-300 transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(p => !p)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center
                                                               text-muted-foreground/50 hover:text-violet-500 hover:bg-violet-50 rounded-md transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                            {form.formState.errors.password && <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.password.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex justify-end gap-2.5 shrink-0">
                            <button type="button" onClick={handleCancel} className="h-9 px-5 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || (!form.formState.isDirty && !profileImage)}
                                className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold
                                           shadow-[0_2px_8px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]
                                           flex items-center gap-2 transition-all"
                            >
                                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {isSubmitting ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Account"}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── View Profile Dialog ── */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                {selectedAdmin && (
                    <DialogContent className="max-w-2xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden max-h-[90vh] overflow-y-auto">
                        {/* Gradient header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 px-7 pt-7 pb-16">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                            <div className="absolute bottom-0 left-24 h-16 w-16 rounded-full bg-blue-400/20 blur-2xl" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white">Admin Profile</DialogTitle>
                                    <DialogDescription className="text-indigo-200 text-xs mt-0.5">View full details</DialogDescription>
                                </div>
                                <button
                                    className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                                    onClick={() => setIsViewOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="px-7 pb-7 -mt-10 relative z-10">
                            {/* Avatar card overlapping header */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-7">
                                <div className="relative">
                                    <div className={cn(
                                        "h-24 w-24 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                                        "text-white text-3xl font-bold shadow-xl ring-4 ring-background overflow-hidden",
                                        getGrad(selectedAdmin.name)
                                    )}>
                                        {selectedAdmin.profile_image_url
                                            ? <img src={selectedAdmin.profile_image_url} alt={selectedAdmin.name} className="h-full w-full object-cover" />
                                            : selectedAdmin.name.charAt(0).toUpperCase()
                                        }
                                    </div>
                                    <span className={cn(
                                        "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-background shadow",
                                        selectedAdmin.isactive ? "bg-emerald-500" : "bg-rose-500"
                                    )} />
                                </div>
                                <div className="flex-1 text-center sm:text-left sm:pb-1">
                                    <h2 className="text-2xl font-bold text-foreground leading-tight">{selectedAdmin.name}</h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 border border-primary/15 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                                            <Shield className="h-3 w-3 opacity-70" /> Hospital Admin
                                        </span>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                            selectedAdmin.isactive
                                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                                                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400"
                                        )}>
                                            {selectedAdmin.isactive ? (
                                                <><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>Active</>
                                            ) : (
                                                <><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Inactive</>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setIsViewOpen(false); handleOpenEdit(selectedAdmin); }}
                                    className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                                               shadow-[0_2px_8px_rgba(99,102,241,0.3)] flex items-center gap-2 transition-all shrink-0"
                                >
                                    <Pencil className="h-3.5 w-3.5" /> Edit Profile
                                </button>
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Contact */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="h-3 w-3" /> Contact Details
                                    </p>
                                    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/40">
                                        <a href={`mailto:${selectedAdmin.email}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                            <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Email</p>
                                                <p className="text-sm font-semibold truncate">{selectedAdmin.email}</p>
                                            </div>
                                        </a>
                                        <a href={`tel:${selectedAdmin.phoneno}`} className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                                            <div className="h-9 w-9 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Phone</p>
                                                <p className="text-sm font-semibold admin-mono">{selectedAdmin.phoneno}</p>
                                            </div>
                                        </a>
                                    </div>
                                </div>

                                {/* Identity */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Shield className="h-3 w-3" /> Identity
                                    </p>
                                    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden divide-y divide-border/40">
                                        <div className="p-3.5">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">User ID</p>
                                            <p className="text-sm font-semibold admin-mono">{selectedAdmin.userid}</p>
                                        </div>
                                        <div className="p-3.5">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Joined</p>
                                            <p className="text-sm font-semibold">{selectedAdmin.joiningDate ? new Date(selectedAdmin.joiningDate).toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hospital */}
                                <div className="sm:col-span-2 space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Building className="h-3 w-3" /> Employment
                                    </p>
                                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Hospital Branch</p>
                                            <p className="text-base font-bold text-foreground">{getHospitalName(selectedAdmin.hospitalid)}</p>
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
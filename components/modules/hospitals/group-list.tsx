
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogHeader,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Building,
    Building2,
    Phone,
    Mail,
    MapPin,
    Plus,
    Pencil,
    Eye,
    Search,
    Filter,
    X,
    Loader2,
    ArrowRight,
    FileText,
    Shield,
    Activity,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Hash,
    ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface HospitalGroup {
    hospital_group_id: number;
    group_name: string;
    group_code: string;
    description: string;
    registration_no: string;
    contact_phone: string;
    contact_email: string;
    address?: string;
    is_active: boolean;
    users_hospital_groups_created_byTousers?: { full_name: string };
    employees?: {
        users_employees_user_idTousers: {
            user_id: number;
            full_name: string;
            email: string;
            phone_number: string;
            profile_image_url: string;
            is_active: boolean;
        };
    }[];
    created_at: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const groupSchema = z.object({
    group_name: z.string().min(1, "Group Name is required").max(100),
    group_code: z.string().min(1, "Group Code is required").max(10).toUpperCase(),
    description: z.string().optional(),
    registration_no: z.string().optional(),
    contact_phone: z
        .string()
        .length(10, "Phone must be exactly 10 digits")
        .regex(/^\d+$/, "Phone must be numeric"),
    contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
});
type GroupFormValues = z.infer<typeof groupSchema>;

// ── Gradient palette for group avatars ────────────────────────────────────────
const gradients = [
    "from-violet-500 to-indigo-500",
    "from-blue-500 to-cyan-400",
    "from-emerald-500 to-teal-400",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-fuchsia-500 to-violet-400",
    "from-teal-500 to-emerald-400",
    "from-indigo-500 to-blue-400",
];
const getGradient = (name: string) =>
    gradients[(name?.charCodeAt(0) || 0) % gradients.length];

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 p-5 animate-pulse space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-700 w-3/4" />
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 w-1/3" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 w-full" />
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 w-5/6" />
            </div>
            <div className="h-9 rounded-xl bg-slate-100 dark:bg-slate-800 w-full" />
        </div>
    );
}

// ── Modal Header Banner (shared) ───────────────────────────────────────────────
function ModalBanner({
    icon,
    title,
    subtitle,
    onClose,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onClose: () => void;
}) {
    return (
        <div className="h-28 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 relative overflow-hidden shrink-0">
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute top-6 right-16 h-24 w-24 rounded-full bg-violet-400/20 blur-2xl" />
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-50 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors backdrop-blur-md"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-5 left-6 flex items-center gap-3 z-10">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg shrink-0">
                    {icon}
                </div>
                <div>
                    <DialogTitle className="text-xl font-bold text-white tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-blue-100/80 text-sm font-medium mt-0.5">{subtitle}</DialogDescription>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function GroupList() {
    const { user, getRoleBasePath } = useAuth();
    const { addToast } = useToast();

    const [hospitalGroups, setHospitalGroups] = useState<HospitalGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [filterName, setFilterName] = useState("");
    const [filterCode, setFilterCode] = useState("");
    const [filterEmail, setFilterEmail] = useState("");
    const [filterPhone, setFilterPhone] = useState("");
    const [filterRegNo, setFilterRegNo] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDate, setFilterDate] = useState("");

    const [appliedFilters, setAppliedFilters] = useState({ name: "", code: "", email: "", phone: "", regNo: "", status: "all", date: "" });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [viewingGroup, setViewingGroup] = useState<HospitalGroup | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    const [viewingAdmin, setViewingAdmin] = useState<any | null>(null);
    const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

    const form = useForm<GroupFormValues>({
        resolver: zodResolver(groupSchema),
        defaultValues: { group_name: "", group_code: "", description: "", registration_no: "", contact_phone: "", contact_email: "" },
    });

    // ── Data ────────────────────────────────────────────────────────────────────
    const fetchGroups = async () => {
        setIsLoading(true);
        try {
            const data = await api.get<HospitalGroup[]>("/hospital-groups");
            setHospitalGroups(data);
        } catch {
            addToast("Failed to load hospital groups", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchGroups(); }, []);

    // ── Filtering ───────────────────────────────────────────────────────────────
    const filteredGroups = useMemo(() => {
        let result = hospitalGroups;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(g =>
                g.group_name.toLowerCase().includes(q) ||
                g.group_code.toLowerCase().includes(q) ||
                g.contact_email?.toLowerCase().includes(q) ||
                g.contact_phone?.includes(q)
            );
        }

        if (appliedFilters.name) {
            const q = appliedFilters.name.toLowerCase();
            result = result.filter(g => g.group_name.toLowerCase().includes(q));
        }
        if (appliedFilters.code) {
            const q = appliedFilters.code.toLowerCase();
            result = result.filter(g => g.group_code.toLowerCase().includes(q));
        }
        if (appliedFilters.email) {
            const q = appliedFilters.email.toLowerCase();
            result = result.filter(g => g.contact_email?.toLowerCase().includes(q));
        }
        if (appliedFilters.phone) {
            result = result.filter(g => g.contact_phone?.includes(appliedFilters.phone));
        }
        if (appliedFilters.regNo) {
            const q = appliedFilters.regNo.toLowerCase();
            result = result.filter(g => g.registration_no?.toLowerCase().includes(q));
        }
        if (appliedFilters.status !== "all") {
            const isActiveFilter = appliedFilters.status === "active";
            result = result.filter(g => g.is_active === isActiveFilter);
        }
        if (appliedFilters.date) {
            result = result.filter(g => {
                if (!g.created_at) return false;
                const gDate = new Date(g.created_at).toISOString().split('T')[0];
                return gDate === appliedFilters.date;
            });
        }

        return result;
    }, [hospitalGroups, searchQuery, appliedFilters]);

    // ── Stats ───────────────────────────────────────────────────────────────────
    const totalCount = hospitalGroups.length;
    const activeCount = hospitalGroups.filter(g => g.is_active).length;

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleOpenAdd = () => {
        setIsEditing(false);
        setEditingId(null);
        form.reset({ group_name: "", group_code: "", description: "", registration_no: "", contact_phone: "", contact_email: "" });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (group: HospitalGroup) => {
        setIsEditing(true);
        setEditingId(group.hospital_group_id);
        form.reset({
            group_name: group.group_name,
            group_code: group.group_code,
            description: group.description || "",
            registration_no: group.registration_no || "",
            contact_phone: group.contact_phone || "",
            contact_email: group.contact_email || "",
        });
        setIsModalOpen(true);
    };

    const onSubmit = async (data: GroupFormValues) => {
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/hospital-groups/${editingId}`, data);
            } else {
                await api.post("/hospital-groups", data);
            }
            addToast(`Hospital Group ${isEditing ? "updated" : "created"} successfully`, "success");
            setIsModalOpen(false);
            fetchGroups();
        } catch (error: any) {
            addToast(error.message || "Failed to save group", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent pb-1">
                        Hospital Groups
                    </h2>
                    <p className="text-muted-foreground/80 font-medium text-lg mt-1">
                        Manage hospital networks and group organisations.
                    </p>
                </div>
                <div className="flex items-center gap-3 self-start">
                    <Button
                        variant="outline"
                        onClick={() => setIsFilterOpen(true)}
                        className="gap-2 rounded-xl h-11 px-5 border-slate-200 dark:border-slate-800 font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-all duration-300"
                    >
                        <Filter className="h-4 w-4" /> Filters
                    </Button>
                    <Button
                        variant="outline"
                        onClick={fetchGroups}
                        disabled={isLoading}
                        className="gap-2 rounded-xl h-11 px-4 border-slate-200 dark:border-slate-800 font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    {user?.role === "SuperAdmin" && (
                        <Button
                            onClick={handleOpenAdd}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl px-6 h-11 text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-105 active:scale-95 font-semibold"
                        >
                            <Plus className="mr-2 h-5 w-5" /> Add Group
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Groups",   value: totalCount,             icon: <Building className="h-5 w-5" />,      color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600" },
                    { label: "Active Groups",  value: activeCount,            icon: <CheckCircle2 className="h-5 w-5" />,  color: "from-emerald-500 to-teal-500",  bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
                    { label: "Inactive",       value: totalCount - activeCount, icon: <XCircle className="h-5 w-5" />,    color: "from-slate-400 to-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/60 text-slate-500" },
                    { label: "Matching Filter", value: filteredGroups.length, icon: <Filter className="h-5 w-5" />,       color: "from-blue-500 to-cyan-500",     bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className={cn("inline-flex items-center justify-center h-10 w-10 rounded-xl mb-3", stat.bg)}>
                                {stat.icon}
                            </div>
                            <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{stat.value}</div>
                            <div className="text-xs font-semibold text-muted-foreground mt-0.5">{stat.label}</div>
                            <div className={cn("absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-10", stat.color)} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Search Bar & Active Filters ── */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, code, email or phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Active Filter Pills */}
                {(searchQuery || appliedFilters.name || appliedFilters.code || appliedFilters.email || appliedFilters.phone || appliedFilters.regNo || appliedFilters.status !== "all" || appliedFilters.date) && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">Active Filters:</span>
                        
                        {searchQuery && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Search: <span className="font-bold ml-1">{searchQuery}</span>
                               <button onClick={() => setSearchQuery("")} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        {appliedFilters.name && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Name: <span className="font-bold ml-1">{appliedFilters.name}</span>
                               <button onClick={() => { setAppliedFilters(p => ({...p, name: ""})); setFilterName(""); }} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        {appliedFilters.code && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Code: <span className="font-bold ml-1">{appliedFilters.code}</span>
                               <button onClick={() => { setAppliedFilters(p => ({...p, code: ""})); setFilterCode(""); }} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        {appliedFilters.email && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Email: <span className="font-bold ml-1">{appliedFilters.email}</span>
                               <button onClick={() => { setAppliedFilters(p => ({...p, email: ""})); setFilterEmail(""); }} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        {appliedFilters.phone && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Phone: <span className="font-bold ml-1">{appliedFilters.phone}</span>
                               <button onClick={() => { setAppliedFilters(p => ({...p, phone: ""})); setFilterPhone(""); }} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        {appliedFilters.regNo && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Reg No: <span className="font-bold ml-1">{appliedFilters.regNo}</span>
                               <button onClick={() => { setAppliedFilters(p => ({...p, regNo: ""})); setFilterRegNo(""); }} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        {appliedFilters.status !== "all" && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Status: <span className="font-bold ml-1 capitalize">{appliedFilters.status}</span>
                               <button onClick={() => { setAppliedFilters(p => ({...p, status: "all"})); setFilterStatus("all"); }} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        {appliedFilters.date && (
                           <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                               Date: <span className="font-bold ml-1">{appliedFilters.date}</span>
                               <button onClick={() => { setAppliedFilters(p => ({...p, date: ""})); setFilterDate(""); }} className="ml-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"><X className="h-3 w-3" /></button>
                           </Badge>
                        )}
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                setSearchQuery("");
                                setFilterName(""); setFilterCode(""); setFilterEmail(""); setFilterPhone("");
                                setFilterRegNo(""); setFilterStatus("all"); setFilterDate("");
                                setAppliedFilters({ name: "", code: "", email: "", phone: "", regNo: "", status: "all", date: "" });
                            }} 
                            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                            Clear All
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Cards Grid ── */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : filteredGroups.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-black/20"
                >
                    <div className="h-20 w-20 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
                        <Building className="h-9 w-9 text-violet-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No hospital groups found</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {searchQuery ? "Try adjusting your search." : "Create your first hospital group to get started."}
                    </p>
                    {searchQuery && (
                        <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-5 rounded-xl">Clear Search</Button>
                    )}
                </motion.div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <AnimatePresence mode="popLayout">
                        {filteredGroups.map((group, i) => {
                            const grad = getGradient(group.group_name);
                            const initials = group.group_code.substring(0, 2).toUpperCase();
                            return (
                                <motion.div
                                    key={group.hospital_group_id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.04 }}
                                    layout
                                >
                                    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                                        {/* Decorative blob */}
                                        <div className={cn("absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity blur-2xl", grad)} />

                                        {/* Action buttons */}
                                        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                                            <button
                                                title="View Details"
                                                onClick={() => { setViewingGroup(group); setIsViewOpen(true); }}
                                                className="h-8 w-8 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-slate-500 hover:text-violet-600 flex items-center justify-center backdrop-blur-md transition-colors shadow-sm"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            {user?.role === "SuperAdmin" && (
                                                <button
                                                    title="Edit Group"
                                                    onClick={e => { e.stopPropagation(); handleOpenEdit(group); }}
                                                    className="h-8 w-8 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 hover:text-indigo-600 flex items-center justify-center backdrop-blur-md transition-colors shadow-sm"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Card body */}
                                        <div className="p-5 flex-1 flex flex-col gap-4">
                                            {/* Identity */}
                                            <div className="flex items-center gap-3 pr-20">
                                                <div className={cn("h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0 group-hover:scale-105 transition-transform", grad)}>
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{group.group_name}</p>
                                                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200 dark:border-violet-800 font-mono">
                                                        <Hash className="h-2.5 w-2.5" />{group.group_code}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Contact info */}
                                            <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40 p-3 space-y-2">
                                                {group.contact_email ? (
                                                    <a href={`mailto:${group.contact_email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 transition-colors min-w-0">
                                                        <Mail className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                                                        <span className="truncate">{group.contact_email}</span>
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 italic"><Mail className="h-3.5 w-3.5" /> No email</div>
                                                )}
                                                {group.contact_phone ? (
                                                    <a href={`tel:${group.contact_phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors">
                                                        <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                                        <span className="font-mono">{group.contact_phone}</span>
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 italic"><Phone className="h-3.5 w-3.5" /> No phone</div>
                                                )}
                                            </div>

                                            {/* View Branches CTA */}
                                            <div className="mt-auto pt-1">
                                                <Link
                                                    href={`${getRoleBasePath(user?.role)}/hospitals?group=${group.hospital_group_id}`}
                                                    className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-900/30 dark:hover:to-indigo-900/30 border border-violet-200/60 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 text-xs font-bold transition-all group/btn"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    View Branches
                                                    <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Filter Side Sheet ── */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent border-l-0 shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl flex flex-col p-0 [&>button]:hidden">
                    <SheetHeader className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <SheetTitle className="flex items-center gap-2 text-xl font-extrabold">
                                    <Filter className="h-5 w-5 text-violet-600" /> Filters
                                </SheetTitle>
                                <SheetDescription>Search and narrow down hospital groups</SheetDescription>
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 mt-0.5"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </SheetHeader>
                    <div className="flex-1 px-8 py-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search by Name</Label>
                            <Input placeholder="Group name..." value={filterName} onChange={e => setFilterName(e.target.value)} className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Code</Label>
                            <Input placeholder="e.g. APOLLO" value={filterCode} onChange={e => setFilterCode(e.target.value)} className="h-10 rounded-xl font-mono uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                            <Input placeholder="admin@group.com" value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                            <Input placeholder="Contact number..." value={filterPhone} onChange={e => setFilterPhone(e.target.value)} className="h-10 rounded-xl font-mono" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registration No.</Label>
                            <Input placeholder="e.g. REG-123" value={filterRegNo} onChange={e => setFilterRegNo(e.target.value)} className="h-10 rounded-xl font-mono uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Created Date</Label>
                            <DatePicker 
                                value={filterDate} 
                                onChange={setFilterDate} 
                                placeholder="Select a date" 
                            />
                        </div>
                    </div>
                    <div className="sticky bottom-0 px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3 z-10">
                        <Button variant="outline" onClick={() => { 
                            setSearchQuery(""); 
                            setFilterName(""); setFilterCode(""); setFilterEmail(""); setFilterPhone(""); 
                            setFilterRegNo(""); setFilterStatus("all"); setFilterDate("");
                            setAppliedFilters({ name: "", code: "", email: "", phone: "", regNo: "", status: "all", date: "" });
                            setIsFilterOpen(false); 
                        }} className="flex-1 rounded-xl h-11">Clear All</Button>
                        <Button onClick={() => {
                            setAppliedFilters({ name: filterName, code: filterCode, email: filterEmail, phone: filterPhone, regNo: filterRegNo, status: filterStatus, date: filterDate });
                            setIsFilterOpen(false);
                        }} className="flex-1 rounded-xl h-11 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700">Apply</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Add / Edit Modal ── */}
            <Dialog open={isModalOpen} onOpenChange={open => { if (!open) setIsModalOpen(false); }}>
                <DialogContent className="max-w-[820px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl rounded-3xl [&>button]:hidden">
                    <ModalBanner
                        icon={isEditing ? <Pencil className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                        title={isEditing ? "Edit Hospital Group" : "New Hospital Group"}
                        subtitle={isEditing ? "Update network details" : "Create a new hospital network"}
                        onClose={() => setIsModalOpen(false)}
                    />
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden" style={{ maxHeight: "calc(85vh - 7rem)" }}>
                        <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">

                            {/* Core Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 text-violet-600" /> Core Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/40">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Group Name <span className="text-red-500">*</span></Label>
                                        <Input {...form.register("group_name")} placeholder="e.g. Apollo Hospitals" className="h-10 rounded-xl bg-background/70 border-border/50 focus:bg-background transition-all" />
                                        {form.formState.errors.group_name && <p className="text-xs text-red-500 font-medium">{form.formState.errors.group_name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Group Code <span className="text-red-500">*</span></Label>
                                        <Input {...form.register("group_code")} placeholder="e.g. APL" className="h-10 rounded-xl bg-background/70 border-border/50 focus:bg-background transition-all font-mono uppercase" />
                                        {form.formState.errors.group_code && <p className="text-xs text-red-500 font-medium">{form.formState.errors.group_code.message}</p>}
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                                        <Textarea {...form.register("description")} placeholder="Brief overview of the hospital group..." className="bg-background/70 border-border/50 focus:bg-background transition-all min-h-[80px] rounded-xl resize-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Legal & Contact */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-violet-600" /> Legal & Contact
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/40">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Registration No.</Label>
                                        <Input {...form.register("registration_no")} placeholder="e.g. REG-2024-001" className="h-10 rounded-xl bg-background/70 border-border/50 focus:bg-background transition-all font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Phone <span className="text-red-500">*</span></Label>
                                        <Input {...form.register("contact_phone")} placeholder="10-digit number" maxLength={10} onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ""); }} className="h-10 rounded-xl bg-background/70 border-border/50 focus:bg-background transition-all font-mono" />
                                        {form.formState.errors.contact_phone && <p className="text-xs text-red-500 font-medium">{form.formState.errors.contact_phone.message}</p>}
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Email</Label>
                                        <Input {...form.register("contact_email")} type="email" placeholder="admin@group.com" className="h-10 rounded-xl bg-background/70 border-border/50 focus:bg-background transition-all" />
                                        {form.formState.errors.contact_email && <p className="text-xs text-red-500 font-medium">{form.formState.errors.contact_email.message}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 md:px-8 py-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3 justify-end items-center shrink-0">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="px-6 rounded-xl h-11 font-medium">Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="px-8 rounded-xl h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEditing ? "Updating..." : "Creating..."}
                                    </>
                                ) : (
                                    isEditing ? "Update Group" : "Create Group"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── View Details Modal ── */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-[820px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl rounded-3xl [&>button]:hidden">
                    {viewingGroup && (
                        <>
                            <ModalBanner
                                icon={<Building className="h-6 w-6" />}
                                title={viewingGroup.group_name}
                                subtitle={`Code: ${viewingGroup.group_code} · Hospital Network`}
                                onClose={() => setIsViewOpen(false)}
                            />
                            <div className="flex flex-col overflow-hidden" style={{ maxHeight: "calc(85vh - 7rem)" }}>
                                <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">

                                    {/* Admin card */}
                                    <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20 p-5">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <Shield className="h-20 w-20 rotate-12" />
                                        </div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-3">Assigned Group Admin</h3>
                                        {viewingGroup.employees && viewingGroup.employees.length > 0 ? (
                                            <div
                                                className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-violet-200/40 dark:border-violet-800/30 cursor-pointer hover:bg-white/80 dark:hover:bg-slate-900/80 transition-colors group/admin max-w-md"
                                                onClick={() => { setViewingAdmin(viewingGroup.employees![0].users_employees_user_idTousers); setIsAdminViewOpen(true); }}
                                            >
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 overflow-hidden">
                                                    {viewingGroup.employees[0].users_employees_user_idTousers.profile_image_url
                                                        ? <img src={viewingGroup.employees[0].users_employees_user_idTousers.profile_image_url} alt="" className="h-full w-full object-cover" />
                                                        : viewingGroup.employees[0].users_employees_user_idTousers.full_name?.charAt(0)
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground group-hover/admin:text-violet-600 transition-colors truncate flex items-center gap-1">
                                                        {viewingGroup.employees[0].users_employees_user_idTousers.full_name}
                                                        <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover/admin:opacity-100 group-hover/admin:translate-x-0 transition-all" />
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">{viewingGroup.employees[0].users_employees_user_idTousers.email}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-3 rounded-xl border border-dashed border-muted-foreground/30 text-xs text-muted-foreground italic flex items-center gap-2 max-w-xs">
                                                <XCircle className="h-3.5 w-3.5" /> No admin assigned to this group
                                            </div>
                                        )}
                                    </div>

                                    {/* Details grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Contact */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-violet-600" /> Contact Details</h3>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 p-4 space-y-3">
                                                {[
                                                    { label: "Email", value: viewingGroup.contact_email, href: `mailto:${viewingGroup.contact_email}`, icon: <Mail className="h-3.5 w-3.5 shrink-0" /> },
                                                    { label: "Phone", value: viewingGroup.contact_phone, href: `tel:${viewingGroup.contact_phone}`, icon: <Phone className="h-3.5 w-3.5 shrink-0" /> },
                                                ].map(info => (
                                                    <div key={info.label}>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{info.label}</p>
                                                        {info.value ? (
                                                            <a href={info.href!} className="flex items-center gap-1.5 text-sm font-semibold hover:text-violet-600 transition-colors">
                                                                {info.icon} {info.value}
                                                            </a>
                                                        ) : <span className="text-sm italic text-muted-foreground">N/A</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Legal */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-violet-600" /> Legal & Registration</h3>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 p-4 space-y-3">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Registration No.</p>
                                                    <p className="font-mono text-sm font-bold bg-background border border-border/50 px-2.5 py-1.5 rounded-lg w-fit">
                                                        {viewingGroup.registration_no || "N/A"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                                                        viewingGroup.is_active
                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                                                    )}>
                                                        {viewingGroup.is_active
                                                            ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</>
                                                            : <><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Inactive</>
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {viewingGroup.description && (
                                            <div className="md:col-span-2 space-y-3">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-violet-600" /> Description</h3>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 p-4 text-sm text-muted-foreground leading-relaxed">
                                                    {viewingGroup.description}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 md:px-8 py-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3 justify-end shrink-0">
                                    <Button variant="outline" onClick={() => setIsViewOpen(false)} className="px-6 rounded-xl h-11 font-medium">Close</Button>
                                    {user?.role === "SuperAdmin" && (
                                        <Button
                                            onClick={() => { setIsViewOpen(false); handleOpenEdit(viewingGroup); }}
                                            className="px-8 rounded-xl h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all font-semibold"
                                        >
                                            <Pencil className="h-4 w-4 mr-2" /> Edit Group
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Admin Profile Modal ── */}
            <Dialog open={isAdminViewOpen} onOpenChange={setIsAdminViewOpen}>
                <DialogContent className="max-w-[400px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl rounded-3xl [&>button]:hidden">
                    <DialogTitle className="sr-only">Admin Profile</DialogTitle>
                    <div className="h-24 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 relative overflow-hidden">
                        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute top-4 right-12 h-16 w-16 rounded-full bg-violet-400/20 blur-xl" />
                        <button onClick={() => setIsAdminViewOpen(false)} className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors backdrop-blur-md">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="px-6 pb-6 flex flex-col items-center -mt-12 text-center">
                        <div className="h-24 w-24 rounded-full shadow-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden ring-4 ring-background relative z-10">
                            {viewingAdmin?.profile_image_url
                                ? <img src={viewingAdmin.profile_image_url} alt="Admin" className="h-full w-full object-cover" />
                                : viewingAdmin?.full_name?.charAt(0)
                            }
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-foreground">{viewingAdmin?.full_name}</h3>
                        <span className={cn("mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                            viewingAdmin?.is_active
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", viewingAdmin?.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                            {viewingAdmin?.is_active ? "Active Group Admin" : "Inactive"}
                        </span>

                        <div className="w-full mt-5 space-y-2 text-left">
                            {[
                                { label: "Email", value: viewingAdmin?.email, href: `mailto:${viewingAdmin?.email}`, icon: <Mail className="h-4 w-4 text-violet-600" /> },
                                { label: "Phone", value: viewingAdmin?.phone_number, href: `tel:${viewingAdmin?.phone_number}`, icon: <Phone className="h-4 w-4 text-emerald-600" /> },
                            ].map(row => (
                                <div key={row.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40">
                                    <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0">{row.icon}</div>
                                    <div className="min-w-0 overflow-hidden">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{row.label}</p>
                                        <a href={row.href} className="text-sm font-semibold truncate block hover:text-violet-600 transition-colors">{row.value || "N/A"}</a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" onClick={() => setIsAdminViewOpen(false)} className="mt-5 w-full rounded-xl h-10">Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

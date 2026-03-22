"use client";

import { useEffect, useState } from "react";
import { useData } from "@/context/data-context";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Building2, MapPin, Phone, Activity, Eye, X, ArrowLeft, ArrowRight, Pencil, Bed, User as UserIcon, Mail, Clock, Calendar, Check, FileText, Hash, Filter, ChevronDown, ChevronUp, RotateCcw, Shield, RefreshCw, Building, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { AddHospitalModal } from "./add-hospital-modal";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface HospitalListProps {
    allowedRoles?: UserRole[];
    readOnly?: boolean;
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.07 }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { stiffness: 300, damping: 24 } }
};

export function HospitalList({ allowedRoles = ['SuperAdmin', 'GroupAdmin'], readOnly = false }: HospitalListProps) {
    const { user, getRoleBasePath } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const groupId = searchParams.get('group');
    const { addToast } = useToast();

    // Context Data
    const { hospitalGroups, admins } = useData();

    // Local State
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter Logic States
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Search States
    const [generalSearch, setGeneralSearch] = useState("");
    const [searchName, setSearchName] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchPhone, setSearchPhone] = useState("");
    const [searchIs24x7, setSearchIs24x7] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Active Filter State
    const [activeFilters, setActiveFilters] = useState({
        general: "",
        name: "",
        email: "",
        phone: "",
        is24x7: "all",
        start: "",
        end: ""
    });

    // Modal States
    const [viewingHospital, setViewingHospital] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<any | null>(null);

    // Admin View State
    const [viewingAdmin, setViewingAdmin] = useState<any | null>(null);
    const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

    const isSuperAdmin = user?.role === 'SuperAdmin';
    const isGroupAdmin = user?.role === 'GroupAdmin';
    const canAdd = !readOnly && isGroupAdmin;
    const canEdit = !readOnly && isGroupAdmin;

    // Fetch Hospitals
    const fetchHospitals = async () => {
        setIsLoading(true);
        try {
            const data = await api.get<any[]>('/hospitals');
            setHospitals(data);
        } catch (error) {
            console.error("Failed to fetch hospitals", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHospitals();
    }, []);

    const groupName = groupId ? hospitalGroups.find(g => String(g.hospitalgroupid) === String(groupId))?.groupname : null;

    // Filtering Logic
    const filteredHospitals = hospitals.filter(h => {
        if (groupId && String(h.hospital_group_id) !== String(groupId) && String(h.hospitalgroupid) !== String(groupId)) return false;
        if (isGroupAdmin && user?.hospitalgroupid && String(h.hospital_group_id) !== String(user.hospitalgroupid) && String(h.hospitalgroupid) !== String(user.hospitalgroupid)) return false;

        const { general, name, email, phone, is24x7, start, end } = activeFilters;

        let matchesGeneral = true;
        if (general) {
            const query = general.toLowerCase();
            matchesGeneral = (
                h.hospital_name?.toLowerCase().includes(query) ||
                h.hospital_code?.toLowerCase().includes(query) ||
                h.receptionist_contact?.includes(query) ||
                h.contact_phone?.includes(query) ||
                h.contact_email?.toLowerCase().includes(query) ||
                h.cities?.city_name?.toLowerCase().includes(query) ||
                h.states?.state_name?.toLowerCase().includes(query)
            );
        }

        const matchesName = !name || h.hospital_name?.toLowerCase().includes(name.toLowerCase());
        const matchesEmail = !email || h.contact_email?.toLowerCase().includes(email.toLowerCase());
        const matchesPhone = !phone || (h.receptionist_contact?.includes(phone) || h.contact_phone?.includes(phone));
        const matches24x7 = is24x7 === "all" || (is24x7 === "yes" && h.is_24by7) || (is24x7 === "no" && !h.is_24by7);

        let matchesDate = true;
        if (start || end) {
            const hDate = h.opening_date ? h.opening_date.split('T')[0] : "";
            if (start && hDate < start) matchesDate = false;
            if (end && hDate > end) matchesDate = false;
        }

        return matchesGeneral && matchesName && matchesEmail && matchesPhone && matches24x7 && matchesDate;
    });

    // Unique Options for Selects
    const uniqueNames = Array.from(new Set(hospitals.map(h => h.hospital_name))).filter(Boolean).map(n => ({ label: n as string, value: n as string }));
    const uniqueEmails = Array.from(new Set(hospitals.map(h => h.contact_email).filter(Boolean))).map(e => ({ label: e as string, value: e as string }));
    const uniquePhones = Array.from(new Set(hospitals.flatMap(h => [h.receptionist_contact, h.contact_phone]).filter(Boolean))).map(p => ({ label: p as string, value: p as string }));

    const handleEdit = (hospital: any) => {
        setEditingHospital(hospital);
        setIsAddModalOpen(true);
    };

    const handleAdd = () => {
        setEditingHospital(null);
        setIsAddModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return "—";
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return timeString;
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    const applyFilters = () => {
        setActiveFilters({
            general: generalSearch,
            name: searchName,
            email: searchEmail,
            phone: searchPhone,
            is24x7: searchIs24x7,
            start: startDate,
            end: endDate
        });
    };

    const resetFilters = () => {
        setGeneralSearch(""); setSearchName(""); setSearchEmail("");
        setSearchPhone(""); setSearchIs24x7("all"); setStartDate(""); setEndDate("");
        setActiveFilters({ general: "", name: "", email: "", phone: "", is24x7: "all", start: "", end: "" });
    };

    const hasActiveFilters = Object.values(activeFilters).some(v => v !== "" && v !== "all");

    // Stats
    const totalCount = hospitals.filter(h => {
        if (groupId && String(h.hospital_group_id) !== String(groupId)) return false;
        if (isGroupAdmin && user?.hospitalgroupid && String(h.hospital_group_id) !== String(user.hospitalgroupid)) return false;
        return true;
    }).length;
    const active24x7 = hospitals.filter(h => {
        if (groupId && String(h.hospital_group_id) !== String(groupId)) return false;
        if (isGroupAdmin && user?.hospitalgroupid && String(h.hospital_group_id) !== String(user.hospitalgroupid)) return false;
        return h.is_24by7;
    }).length;

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {groupId && (
                            <Tooltip content="Go Back">
                                <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl border-dashed shrink-0">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Tooltip>
                        )}
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                {groupName ? `${groupName} Branches` : "Network Branches"}
                            </h2>
                            <p className="text-muted-foreground font-medium mt-1">
                                {groupName ? `Manage locations for ${groupName}` : "Oversee all hospital locations nationwide"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={cn("gap-2 rounded-xl h-11 px-5 font-semibold relative", hasActiveFilters && "border-blue-400 text-blue-700 dark:text-blue-300")}
                        >
                            <Filter className="h-4 w-4" /> Filters
                            {hasActiveFilters && <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">!</span>}
                        </Button>
                        <Button variant="outline" size="icon" onClick={fetchHospitals} disabled={isLoading} className="h-11 w-11 rounded-xl">
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin text-blue-600 dark:text-blue-400")} />
                        </Button>
                        {canAdd && (
                            <Button onClick={handleAdd} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl px-6 h-11 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 font-semibold">
                                <Plus className="mr-2 h-5 w-5" /> Add Branch
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Branches", value: totalCount, icon: <Building2 className="h-5 w-5" />, color: "from-blue-500 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
                        { label: "24×7 Open", value: active24x7, icon: <Activity className="h-5 w-5" />, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
                        { label: "Standard Hours", value: totalCount - active24x7, icon: <Clock className="h-5 w-5" />, color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-900/20 text-amber-600" },
                        { label: "Matching Filter", value: filteredHospitals.length, icon: <Filter className="h-5 w-5" />, color: "from-violet-500 to-purple-500", bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600" },
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

                {/* ── Search Bar ── */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, code, email, city..."
                        value={generalSearch}
                        onChange={e => setGeneralSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
                        className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base"
                    />
                    {generalSearch && (
                        <button onClick={() => { setGeneralSearch(""); setActiveFilters(p => ({ ...p, general: "" })); }} className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* ── Filter Panel ── */}
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0 border-l border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                        <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <SheetTitle className="text-lg font-bold">Advanced Filters</SheetTitle>
                                    <SheetDescription className="text-xs">Narrow down the list of branches</SheetDescription>
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
                                <SearchableSelect options={uniqueNames} value={searchName} onChange={setSearchName} placeholder="Select Name..." className="w-full h-11 rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                                <SearchableSelect options={uniqueEmails} value={searchEmail} onChange={setSearchEmail} placeholder="Select Email..." className="w-full h-11 rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact No</Label>
                                <SearchableSelect options={uniquePhones} value={searchPhone} onChange={setSearchPhone} placeholder="Select Contact..." className="w-full h-11 rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">24×7 Status</Label>
                                <Select value={searchIs24x7} onValueChange={(val: any) => setSearchIs24x7(val)}>
                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="yes">Yes, 24×7</SelectItem>
                                        <SelectItem value="no">Standard Hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opened From</Label>
                                    <DatePicker value={startDate} onChange={setStartDate} placeholder="Start Date" maxDate={endDate} className="h-11 rounded-xl" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opened To</Label>
                                    <DatePicker value={endDate} onChange={setEndDate} placeholder="End Date" minDate={startDate} className="h-11 rounded-xl" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex items-center gap-4">
                            <Button variant="outline" onClick={() => { resetFilters(); setIsFilterOpen(false); }} className="flex-1 h-11 rounded-xl font-medium">Clear All</Button>
                            <Button onClick={() => { applyFilters(); setIsFilterOpen(false); }} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20">Apply Filters</Button>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* ── Active Filter Pills ── */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">Active Filters:</span>
                        {activeFilters.name && (
                            <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-xl font-medium">
                                Name: <span className="font-bold ml-1">{activeFilters.name}</span>
                                <button onClick={() => { setSearchName(""); setActiveFilters(p => ({ ...p, name: "" })); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.email && (
                            <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-xl font-medium">
                                Email: <span className="font-bold ml-1">{activeFilters.email}</span>
                                <button onClick={() => { setSearchEmail(""); setActiveFilters(p => ({ ...p, email: "" })); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.phone && (
                            <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-xl font-medium">
                                Phone: <span className="font-bold ml-1">{activeFilters.phone}</span>
                                <button onClick={() => { setSearchPhone(""); setActiveFilters(p => ({ ...p, phone: "" })); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.is24x7 !== "all" && (
                            <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-xl font-medium">
                                24×7: <span className="font-bold ml-1 capitalize">{activeFilters.is24x7 === "yes" ? "Open" : "Standard"}</span>
                                <button onClick={() => { setSearchIs24x7("all"); setActiveFilters(p => ({ ...p, is24x7: "all" })); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800">Clear All</Button>
                    </div>
                )}

                {/* ── Cards Grid ── */}
                {isLoading ? (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 pb-10">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 overflow-hidden">
                                <div className="h-2 bg-slate-100 dark:bg-slate-800" />
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-12 w-12 rounded-xl" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-3/4 rounded-lg" />
                                            <Skeleton className="h-3 w-1/2 rounded-lg" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-24 w-full rounded-xl" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-9 flex-1 rounded-xl" />
                                        <Skeleton className="h-9 flex-1 rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <motion.div
                        key={JSON.stringify(activeFilters)}
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 pb-10"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredHospitals.map((hospital) => {
                                const is24x7 = hospital.is_24by7;
                                const name = hospital.hospital_name || hospital.hospitalname;
                                const code = hospital.hospital_code || hospital.hospitalcode;
                                const email = hospital.contact_email || hospital.contactemail;
                                const phone = hospital.receptionist_contact || hospital.contactno;
                                const city = hospital.cities?.city_name || hospital.city;
                                const state = hospital.states?.state_name || hospital.state;
                                const hospitalId = hospital.hospital_id || hospital.hospitalid;

                                return (
                                    <motion.div
                                        key={hospitalId}
                                        variants={item}
                                        initial="hidden"
                                        animate="show"
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        layout
                                    >
                                        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                                            {/* Top accent bar */}
                                            <div className={cn("h-1.5 w-full", is24x7 ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-amber-400 to-orange-400")} />

                                            {/* Quick action buttons */}
                                            <div className="absolute top-4 right-3 flex gap-1.5 z-10">
                                                <Tooltip content="View Details">
                                                    <button
                                                        onClick={() => setViewingHospital(hospital)}
                                                        className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                </Tooltip>
                                                {canEdit && (
                                                    <Tooltip content="Edit Branch">
                                                        <button
                                                            onClick={() => handleEdit(hospital)}
                                                            className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>

                                            {/* Card header */}
                                            <div className="flex items-start gap-4 p-5 pb-3">
                                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0 pr-20">
                                                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">{name}</h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Hash className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                                        <span className="text-xs text-muted-foreground font-mono font-semibold uppercase tracking-wider truncate">{code}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            <div className="px-5 pb-3">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                                                    is24x7
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                                                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                                                )}>
                                                    <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", is24x7 ? "bg-emerald-500" : "bg-amber-500")} />
                                                    {is24x7 ? "24×7 Emergency" : "Standard Hours"}
                                                </span>
                                            </div>

                                            {/* Info block */}
                                            <div className="mx-4 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/40 divide-y divide-slate-200/60 dark:divide-slate-700/40 overflow-hidden">
                                                {email && (
                                                    <a href={`mailto:${email}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 transition-colors group/row">
                                                        <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
                                                            <Mail className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground group-hover/row:text-foreground transition-colors truncate font-medium">{email}</span>
                                                    </a>
                                                )}
                                                {phone && (
                                                    <a href={`tel:${phone}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50/60 dark:hover:bg-violet-900/20 transition-colors group/row">
                                                        <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 shrink-0">
                                                            <Phone className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground group-hover/row:text-foreground transition-colors font-medium">{phone}</span>
                                                    </a>
                                                )}
                                                {(city || state) && (
                                                    <div className="flex items-center gap-2.5 px-3 py-2">
                                                        <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground font-medium truncate">{[city, state].filter(Boolean).join(", ")}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {filteredHospitals.length === 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full flex flex-col items-center justify-center p-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-800/60 text-center">
                                <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <Building2 className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground/80">No branches found</h3>
                                <p className="text-muted-foreground mt-2 max-w-sm">No hospitals match your current filters.</p>
                                <Button variant="outline" onClick={resetFilters} className="mt-6 rounded-xl px-6">Clear Filters</Button>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ── Add/Edit Modal ── */}
                <AddHospitalModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={fetchHospitals}
                    initialGroupId={groupId ? Number(groupId) : undefined}
                    initialData={editingHospital}
                />

                {/* ── View Details Modal ── */}
                <Dialog open={!!viewingHospital} onOpenChange={(open) => !open && setViewingHospital(null)}>
                    <DialogContent className="max-w-[820px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl rounded-[2rem] [&>button]:hidden flex flex-col max-h-[90vh]">
                        {viewingHospital && (
                            <>
                                {/* Banner */}
                                <div className="h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden shrink-0">
                                    <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.3),_transparent_60%)]" />
                                    <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                                    <div className="absolute top-4 right-12 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl" />

                                    {/* Close */}
                                    <div className="absolute top-3 right-3 z-10">
                                        <button onClick={() => setViewingHospital(null)} className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Identity strip */}
                                    <div className="absolute bottom-4 left-6 flex items-center gap-4 z-10">
                                        <div className="h-14 w-14 rounded-2xl ring-4 ring-white/30 shadow-2xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                                            <Building2 className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <DialogTitle className="text-xl font-extrabold text-white tracking-tight">
                                                    {viewingHospital.hospital_name}
                                                </DialogTitle>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/25 backdrop-blur-sm font-mono">
                                                    {viewingHospital.hospital_code}
                                                </span>
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-sm",
                                                    viewingHospital.is_24by7
                                                        ? "bg-emerald-500/20 text-white border-emerald-400/50"
                                                        : "bg-amber-500/20 text-white border-amber-400/50"
                                                )}>
                                                    <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", viewingHospital.is_24by7 ? "bg-emerald-300" : "bg-amber-300")} />
                                                    {viewingHospital.is_24by7 ? "24×7 Emergency" : "Standard Hours"}
                                                </span>
                                            </div>
                                            <DialogDescription className="text-blue-100/80 text-sm mt-0.5">Detailed operational overview</DialogDescription>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable content */}
                                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                                    <div className="p-6 space-y-6">

                                        {/* Assigned Admin */}
                                        {(() => {
                                            const assignedAdmin = admins.find(a => Number(a.hospitalid) === Number(viewingHospital.hospital_id));
                                            return (
                                                <div className="space-y-3">
                                                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                        <Shield className="h-3.5 w-3.5 text-indigo-500" /> Assigned Administrator
                                                    </h3>
                                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-4">
                                                        {assignedAdmin ? (
                                                            <div
                                                                className="flex items-center gap-4 cursor-pointer hover:bg-background/60 p-3 rounded-xl transition-colors group/admin"
                                                                onClick={() => { setViewingAdmin(assignedAdmin); setIsAdminViewOpen(true); }}
                                                            >
                                                                <div className="h-12 w-12 rounded-full border-2 border-white dark:border-slate-800 shadow-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                                                    {assignedAdmin.profile_image_url
                                                                        ? <img src={assignedAdmin.profile_image_url} alt={assignedAdmin.name} className="h-full w-full object-cover" />
                                                                        : <span className="text-lg font-bold text-muted-foreground">{assignedAdmin.name?.charAt(0)}</span>
                                                                    }
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-foreground group-hover/admin:text-indigo-600 transition-colors flex items-center gap-1 truncate">
                                                                        {assignedAdmin.name}
                                                                        <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover/admin:opacity-100 group-hover/admin:translate-x-0 transition-all duration-300" />
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground truncate">{assignedAdmin.email}</p>
                                                                </div>
                                                                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs">Hospital Admin</Badge>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground italic">
                                                                <AlertCircle className="h-4 w-4" /> No administrator assigned
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Description */}
                                        {viewingHospital.description && (
                                            <div className="bg-muted/30 p-4 rounded-2xl text-sm leading-relaxed text-muted-foreground border border-border/50">
                                                {viewingHospital.description}
                                            </div>
                                        )}

                                        {/* 2-col grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                            {/* Location */}
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Location Details
                                                </h3>
                                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-3">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</span>
                                                        <p className="font-medium text-sm">{viewingHospital.address || "—"}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">City / State</span>
                                                            <p className="font-medium text-sm">
                                                                {viewingHospital.cities?.city_name || "—"}, {viewingHospital.states?.state_name || "—"}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pincode</span>
                                                            <p className="font-mono font-bold text-sm">{viewingHospital.pincode || "—"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact */}
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <Phone className="h-3.5 w-3.5 text-blue-500" /> Contact Information
                                                </h3>
                                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-3">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reception</span>
                                                        <a href={`tel:${viewingHospital.receptionist_contact}`} className="flex items-center gap-2 group/link">
                                                            <div className="h-6 w-6 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                                                                <Phone className="h-3 w-3" />
                                                            </div>
                                                            <span className="text-sm font-semibold group-hover/link:text-blue-600 transition-colors">{viewingHospital.receptionist_contact || "—"}</span>
                                                        </a>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {viewingHospital.contact_email && (
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
                                                                <a href={`mailto:${viewingHospital.contact_email}`} className="flex items-center gap-2 group/link">
                                                                    <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                                                        <Mail className="h-3 w-3" />
                                                                    </div>
                                                                    <span className="text-sm font-semibold group-hover/link:text-blue-600 transition-colors truncate">{viewingHospital.contact_email}</span>
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Operations */}
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Operations
                                                </h3>
                                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("p-2 rounded-xl", viewingHospital.is_24by7 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                                                            {viewingHospital.is_24by7 ? <Activity className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{viewingHospital.is_24by7 ? "24×7 Emergency" : "Standard Hours"}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {viewingHospital.is_24by7 ? "Open round the clock" : `${formatTime(viewingHospital.opening_time)} – ${formatTime(viewingHospital.closing_time)}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-border/50 space-y-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Established</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                            </div>
                                                            <p className="text-sm font-medium">{formatDate(viewingHospital.opening_date)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Compliance */}
                                            {(viewingHospital.registration_no || viewingHospital.license_no || viewingHospital.gst_no) && (
                                                <div className="space-y-3">
                                                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                        <FileText className="h-3.5 w-3.5 text-violet-500" /> Compliance
                                                    </h3>
                                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 grid grid-cols-2 gap-3">
                                                        {viewingHospital.registration_no && (
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reg No.</span>
                                                                <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{viewingHospital.registration_no}</p>
                                                            </div>
                                                        )}
                                                        {viewingHospital.license_no && (
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">License</span>
                                                                <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{viewingHospital.license_no}</p>
                                                            </div>
                                                        )}
                                                        {viewingHospital.gst_no && (
                                                            <div className="space-y-1 col-span-2">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GST No.</span>
                                                                <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{viewingHospital.gst_no}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-5 border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0 flex gap-3 justify-end">
                                    <Button variant="outline" onClick={() => setViewingHospital(null)} className="px-6 h-10 rounded-xl font-medium">Close</Button>
                                    {canEdit && (
                                        <Button
                                            onClick={() => { setViewingHospital(null); setEditingHospital(viewingHospital); setIsAddModalOpen(true); }}
                                            className="px-8 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <Pencil className="h-4 w-4 mr-2" /> Edit Branch
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ── Nested Admin View Modal ── */}
                <Dialog open={isAdminViewOpen} onOpenChange={setIsAdminViewOpen}>
                    <DialogContent className="max-w-[420px] w-full p-0 border-none shadow-2xl bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden [&>button]:hidden flex flex-col max-h-[85vh]">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Admin Details</DialogTitle>
                        </DialogHeader>

                        {/* Banner */}
                        <div className="h-28 bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 relative overflow-hidden shrink-0">
                            <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.3),_transparent_60%)]" />
                            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                            <div className="absolute top-4 right-10 h-16 w-16 rounded-full bg-purple-400/20 blur-xl" />
                            <div className="absolute top-3 right-3 z-10">
                                <button onClick={() => setIsAdminViewOpen(false)} className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Avatar overlapping */}
                        <div className="px-6 flex flex-col items-center -mt-12 text-center pb-6">
                            <div className="h-24 w-24 rounded-full shadow-xl bg-muted flex items-center justify-center overflow-hidden ring-4 ring-background border-2 border-white dark:border-slate-800">
                                {viewingAdmin?.profile_image_url
                                    ? <img src={viewingAdmin.profile_image_url} alt={viewingAdmin.name} className="h-full w-full object-cover" />
                                    : <span className="text-2xl font-bold text-muted-foreground">{viewingAdmin?.name?.charAt(0)}</span>
                                }
                            </div>
                            <h3 className="mt-3 text-xl font-extrabold text-foreground">{viewingAdmin?.name}</h3>
                            <Badge className="mt-1 bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full px-3">Hospital Admin</Badge>

                            <div className="w-full mt-5 space-y-2.5 text-left">
                                {[
                                    { icon: <Mail className="h-4 w-4 text-blue-600" />, bg: "bg-blue-500/10", label: "Email", value: viewingAdmin?.email, href: `mailto:${viewingAdmin?.email}` },
                                    { icon: <Phone className="h-4 w-4 text-violet-600" />, bg: "bg-violet-500/10", label: "Phone", value: viewingAdmin?.phoneno, href: `tel:${viewingAdmin?.phoneno}` },
                                    { icon: <Activity className="h-4 w-4 text-emerald-600" />, bg: "bg-emerald-500/10", label: "Status", value: null, isActive: viewingAdmin?.isactive },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", row.bg)}>
                                            {row.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{row.label}</p>
                                            {row.href
                                                ? <a href={row.href} className="text-sm font-semibold truncate block hover:text-indigo-600 transition-colors">{row.value}</a>
                                                : row.isActive !== undefined
                                                    ? <p className={cn("text-sm font-bold", row.isActive ? "text-emerald-600" : "text-red-500")}>{row.isActive ? "Active" : "Inactive"}</p>
                                                    : <p className="text-sm font-semibold">{row.value}</p>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </RoleGuard>
    );
}

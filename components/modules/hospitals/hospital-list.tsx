"use client";

import { useEffect, useState } from "react";
import { useData, Hospital, User } from "@/context/data-context";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Building2, MapPin, Phone, Activity, Eye, X, ArrowLeft, ArrowRight, Pencil, Bed, User as UserIcon, Mail, Clock, Calendar, Check, FileText, Hash, Filter, ChevronDown, ChevronUp, RotateCcw, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { AddHospitalModal } from "./add-hospital-modal";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
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
        transition: {
            staggerChildren: 0.1
        }
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

    // Filter Logic States (Simplified to match Admin List pattern)
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Search States
    const [generalSearch, setGeneralSearch] = useState("");
    const [searchName, setSearchName] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchPhone, setSearchPhone] = useState("");
    const [searchIs24x7, setSearchIs24x7] = useState<string>("all");
    const [startDate, setStartDate] = useState(""); // Opening Date From
    const [endDate, setEndDate] = useState(""); // Opening Date To

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
        // Group Filter Logic
        if (groupId && String(h.hospital_group_id) !== String(groupId) && String(h.hospitalgroupid) !== String(groupId)) return false;
        if (isGroupAdmin && user?.hospitalgroupid && String(h.hospital_group_id) !== String(user.hospitalgroupid) && String(h.hospitalgroupid) !== String(user.hospitalgroupid)) return false;

        const { general, name, email, phone, is24x7, start, end } = activeFilters;

        // 1. General Search
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

        // 2. Specific Fields
        const matchesName = !name || h.hospital_name?.toLowerCase().includes(name.toLowerCase());
        const matchesEmail = !email || h.contact_email?.toLowerCase().includes(email.toLowerCase());
        const matchesPhone = !phone || (h.receptionist_contact?.includes(phone) || h.contact_phone?.includes(phone));

        const matches24x7 = is24x7 === "all" ||
            (is24x7 === "yes" && h.is_24by7) ||
            (is24x7 === "no" && !h.is_24by7);

        // 3. Date Range (Opening Date)
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
        setGeneralSearch("");
        setSearchName("");
        setSearchEmail("");
        setSearchPhone("");
        setSearchIs24x7("all");
        setStartDate("");
        setEndDate("");

        setActiveFilters({
            general: "",
            name: "",
            email: "",
            phone: "",
            is24x7: "all",
            start: "",
            end: ""
        });
    };

    const hasActiveFilters = Object.values(activeFilters).some(value => value !== "" && value !== "all");

    if (isLoading && hospitals.length === 0) {
        return <Loader size="lg" text="Loading branches..." className="py-20" />;
    }

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="space-y-6">
                {/* Page Header with Decor */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        {groupId && (
                            <Tooltip content="Back to Groups">
                                <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl border-dashed">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Tooltip>
                        )}
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent pb-1">
                                {groupName ? `${groupName} Branches` : "Network Branches"}
                            </h2>
                            <p className="text-muted-foreground/80 font-medium text-lg mt-1">
                                {groupName ? `Manage locations for ${groupName}` : "Oversee all hospital locations nationwide"}
                            </p>
                        </div>
                    </div>

                    {/* Filter Toggle & Add Button Row */}
                    <div className="flex items-center justify-end gap-3 relative z-20">
                        <Button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            variant={isFilterOpen ? "secondary" : "outline"}
                            className={cn(
                                "gap-2 rounded-xl h-11 px-5 transition-all text-sm font-semibold border-white/20 hover:bg-white/10",
                                isFilterOpen ? "bg-white/20 text-foreground border-white/30" : "bg-white/5 backdrop-blur-sm"
                            )}
                        >
                            <Filter className="h-4 w-4" /> Filters
                            {hasActiveFilters && (
                                <div className="h-2 w-2 rounded-full bg-blue-500 absolute top-2 right-2 animate-pulse" />
                            )}
                        </Button>

                        {canAdd && (
                            <Tooltip content="Add New Branch" className="w-auto">
                                <Button onClick={handleAdd} size="lg" className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl px-8 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 text-base font-semibold text-white h-11">
                                    <Plus className="mr-2 h-5 w-5" /> Add Branch
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </div>
                {/* Floating Glassmorphism Filter Panel */}
                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="mb-8 z-10 relative"
                        >
                            <div className="bg-white/60 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-border dark:border-border/50 shadow-neo-xl">
                                {/* Header and Close Button */}
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-blue-600" /> Advanced Filters
                                    </h3>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setIsFilterOpen(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {/* General Search */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">General Search</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Hospital Name, Code..."
                                                value={generalSearch}
                                                onChange={(e) => setGeneralSearch(e.target.value)}
                                                className="h-10 pl-9 bg-background/50 border-white/20 focus:bg-background transition-all rounded-xl shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Name</Label>
                                        <SearchableSelect
                                            options={uniqueNames}
                                            value={searchName}
                                            onChange={setSearchName}
                                            placeholder="Select Name..."
                                            className="w-full h-10 rounded-xl"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Email</Label>
                                        <SearchableSelect
                                            options={uniqueEmails}
                                            value={searchEmail}
                                            onChange={setSearchEmail}
                                            placeholder="Select Email..."
                                            className="w-full h-10 rounded-xl"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Contact No</Label>
                                        <SearchableSelect
                                            options={uniquePhones}
                                            value={searchPhone}
                                            onChange={setSearchPhone}
                                            placeholder="Select Contact..."
                                            className="w-full h-10 rounded-xl"
                                        />
                                    </div>

                                    {/* 24x7 Status */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">24x7 Status</Label>
                                        <Select value={searchIs24x7} onValueChange={(val: any) => setSearchIs24x7(val)}>
                                            <SelectTrigger className="h-10 bg-background/50 border-input transition-all rounded-xl w-full shadow-sm">
                                                <SelectValue placeholder="All Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="yes">Yes, 24x7</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date Range Start */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Opened From</Label>
                                        <DatePicker
                                            value={startDate}
                                            onChange={setStartDate}
                                            placeholder="Start Date"
                                            maxDate={endDate}
                                            className="h-10 rounded-xl bg-background/50 shadow-sm"
                                        />
                                    </div>

                                    {/* Date Range End */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Opened To</Label>
                                        <DatePicker
                                            value={endDate}
                                            onChange={setEndDate}
                                            placeholder="End Date"
                                            minDate={startDate}
                                            className="h-10 rounded-xl bg-background/50 shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Filter Actions */}
                                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border/40">
                                    <Button
                                        variant="ghost"
                                        onClick={resetFilters}
                                        className="text-muted-foreground hover:text-foreground h-11 px-6 rounded-xl"
                                    >
                                        Clear All
                                    </Button>
                                    <Button
                                        onClick={applyFilters}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 h-11 px-8 font-semibold"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grid */}
                <motion.div
                    key={JSON.stringify(activeFilters)}
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 pb-10"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredHospitals.map((hospital) => (
                            <motion.div 
                                key={hospital.hospital_id || hospital.hospitalid} 
                                variants={item} 
                                initial="hidden"
                                animate="show"
                                exit="hidden"
                                layout 
                            >
                                <Card
                                    className="group relative h-full overflow-hidden bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border-[1.5px] border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(15,23,42,0.3)] hover:-translate-y-1 transition-all duration-300 rounded-[2rem] w-full"
                                >
                                    {/* Decorative Gradient Blob */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-bl-[3rem] -z-10 transition-all group-hover:bg-primary/10 dark:group-hover:bg-primary/20" />

                                    {/* Action Buttons - Top Right */}
                                    <div className="absolute top-3 right-3 flex gap-2 z-10 transition-opacity duration-300">
                                        <Tooltip content="View Branch Dashboard">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                                onClick={() => router.push(`/admin/hospitals/${hospital.hospital_id || hospital.hospitalid}`)}
                                            >
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </Tooltip>
                                        {canEdit && (
                                            <Tooltip content="Edit Branch">
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                                    onClick={() => handleEdit(hospital)}
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </Tooltip>
                                        )}
                                    </div>

                                    {/* Status Strip (Left) */}
                                    <div className={`absolute top-5 left-0 w-1 rounded-r-full h-8 transition-all duration-300 ${hospital.is_24by7 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]"}`} />

                                    <CardHeader className="flex flex-col items-center text-center gap-2 pb-0 pt-5 px-5">
                                        <div className="relative">
                                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center p-1 group-hover:scale-105 transition-transform duration-500 ease-in-out shadow-sm">
                                                <Building2 className="h-8 w-8 text-primary/80" />
                                            </div>
                                            {/* <Tooltip content={hospital.is_24by7 ? "24x7 Operational" : "Standard Hours"} side="bottom">
                                                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[2px] border-background dark:border-slate-900 flex items-center justify-center ${hospital.is_24by7 ? "bg-emerald-500 text-white" : "bg-orange-400 text-white"}`}>
                                                    {hospital.is_24by7 ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                </div>
                                            </Tooltip> */}
                                        </div>

                                        <div className="space-y-0.5 w-full overflow-hidden">
                                            <CardTitle className="text-lg font-bold truncate text-foreground dark:text-slate-100 group-hover:text-primary transition-colors">
                                                {hospital.hospital_name || hospital.hospitalname}
                                            </CardTitle>
                                            <CardDescription className="flex items-center justify-center gap-1.5 truncate text-xs font-medium text-muted-foreground/80 dark:text-slate-400 bg-muted/30 dark:bg-slate-800/50 py-0.5 px-2.5 rounded-full mx-auto w-fit max-w-full">
                                                <Hash className="h-3 w-3 shrink-0" />
                                                <span className="truncate uppercase tracking-wider">{hospital.hospital_code || hospital.hospitalcode}</span>
                                            </CardDescription>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-3 pt-3 px-5 pb-5">
                                        {/* Info Block */}
                                        <div className="space-y-1.5 bg-background/40 dark:bg-slate-800/30 p-2.5 rounded-2xl border border-border/50 dark:border-slate-700/50">
                                            <div className="flex items-center gap-2.5 text-xs group/link hover:bg-background/80 dark:hover:bg-slate-700/50 p-1.5 rounded-xl transition-all">
                                                <div className="h-7 w-7 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                                    <Mail className="h-3.5 w-3.5" />
                                                </div>
                                                <a href={`mailto:${hospital.contact_email || hospital.contactemail}`} className="truncate text-muted-foreground dark:text-slate-400 group-hover/link:text-foreground font-medium transition-colors">
                                                    {hospital.contact_email || hospital.contactemail}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-xs group/link hover:bg-background/80 dark:hover:bg-slate-700/50 p-1.5 rounded-xl transition-all">
                                                <div className="h-7 w-7 rounded-full bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                                                    <Phone className="h-3.5 w-3.5" />
                                                </div>
                                                <a href={`tel:${hospital.receptionist_contact || hospital.contactno}`} className="truncate text-muted-foreground dark:text-slate-400 group-hover/link:text-foreground font-medium transition-colors">
                                                    {hospital.receptionist_contact || hospital.contactno}
                                                </a>
                                            </div>
                                            {(hospital.city || hospital.state || hospital.cities?.city_name) && (
                                                <div className="flex items-center gap-2.5 text-xs p-1.5 rounded-xl transition-all">
                                                    <div className="h-7 w-7 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="truncate text-muted-foreground dark:text-slate-400 font-medium">
                                                        {[hospital.cities?.city_name || hospital.city, hospital.states?.state_name || hospital.state].filter(Boolean).join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {filteredHospitals.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="col-span-full flex flex-col items-center justify-center p-16 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-border/50 text-center"
                        >
                            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-muted/50 to-background shadow-inner flex items-center justify-center mb-6">
                                <Building2 className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground/80">No branches found</h3>
                            <p className="text-muted-foreground text-center max-w-sm mt-3 text-lg">
                                We couldn't find any hospitals matching your filters.
                            </p>
                            <Button variant="outline" size="lg" onClick={resetFilters} className="mt-8 rounded-full px-8">
                                Clear Filters
                            </Button>
                        </motion.div>
                    )}
                </motion.div>

                {/* Add/Edit Modal */}
                <AddHospitalModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={fetchHospitals}
                    initialGroupId={groupId ? Number(groupId) : undefined}
                    initialData={editingHospital}
                />

                {/* View Details Modal */}
                <Dialog open={!!viewingHospital} onOpenChange={(open) => !open && setViewingHospital(null)}>
                    <DialogContent className="max-w-[850px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl block select-none rounded-[2.5rem] [&>button]:hidden">
                        {viewingHospital && (
                            <>
                                {/* Header */}
                                <div className="h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden shrink-0">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                                    <div className="absolute top-4 right-4 z-10">
                                        <Button size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md" onClick={() => setViewingHospital(null)}>
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    {/* Abstract shapes */}
                                    <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                                    <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl"></div>

                                    <div className="absolute bottom-6 left-8 flex items-center gap-4 z-10">
                                        <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                                            <Building2 className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                                                    {viewingHospital.hospital_name}
                                                </DialogTitle>
                                                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-sm">
                                                    {viewingHospital.hospital_code}
                                                </Badge>
                                            </div>
                                            <DialogDescription className="text-blue-100/90 text-sm font-medium mt-1">
                                                Detailed operational overview
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col flex-1 overflow-hidden h-[calc(85vh-7rem)]">
                                    <div className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">

                                        {/* Admin Card */}
                                        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 p-5 group/card hover:shadow-lg transition-all duration-300">
                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/card:opacity-20 transition-opacity">
                                                <Shield className="h-24 w-24 rotate-12" />
                                            </div>

                                            <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mb-1">Assigned Administrator</h3>
                                                    <p className="text-xs text-muted-foreground max-w-md">The primary point of contact managing operations for this branch.</p>
                                                </div>

                                                {(() => {
                                                    const assignedAdmin = admins.find(a => Number(a.hospitalid) === Number(viewingHospital.hospital_id));
                                                    return assignedAdmin ? (
                                                        <div
                                                            className="flex items-center gap-4 bg-background/60 backdrop-blur-md p-3 rounded-xl border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-background/80 transition-colors group/admin min-w-[280px]"
                                                            onClick={() => {
                                                                setViewingAdmin(assignedAdmin);
                                                                setIsAdminViewOpen(true);
                                                            }}
                                                        >
                                                            <div className="h-12 w-12 rounded-full border-2 border-white dark:border-gray-800 shadow-md overflow-hidden relative bg-muted flex items-center justify-center">
                                                                {assignedAdmin.profile_image_url ? (
                                                                    <img src={assignedAdmin.profile_image_url} alt={assignedAdmin.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <span className="text-lg font-bold text-muted-foreground">{assignedAdmin.name?.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-foreground group-hover/admin:text-indigo-600 transition-colors flex items-center gap-1 truncate">
                                                                    {assignedAdmin.name}
                                                                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover/admin:opacity-100 group-hover/admin:translate-x-0 transition-all duration-300" />
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">{assignedAdmin.email}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="px-4 py-3 bg-muted/40 rounded-xl border border-dashed border-muted-foreground/30 text-xs text-muted-foreground flex items-center gap-2 italic min-w-[200px] justify-center">
                                                            <X className="h-3 w-3" /> No Admin Assigned
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {viewingHospital.description && (
                                            <div className="bg-muted/30 p-5 rounded-2xl text-sm leading-relaxed text-muted-foreground border border-border/50">
                                                {viewingHospital.description}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Location */}
                                            <div className="space-y-5">
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-primary" /> Location Details
                                                </h3>
                                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Address</span>
                                                        <p className="font-medium text-sm">{viewingHospital.address}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">City/State</span>
                                                            <p className="font-medium text-sm">
                                                                {viewingHospital.cities?.city_name || viewingHospital.city_id || "-"}, {viewingHospital.states?.state_name || viewingHospital.state_id || "-"}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Pincode</span>
                                                            <p className="font-medium text-sm">{viewingHospital.pincode}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact */}
                                            <div className="space-y-5">
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-primary" /> Contact Information
                                                </h3>
                                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Reception</span>
                                                        <a href={`tel:${viewingHospital.receptionist_contact}`} className="block font-medium text-sm hover:text-primary hover:underline transition-colors w-fit">
                                                            {viewingHospital.receptionist_contact}
                                                        </a>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {viewingHospital.contact_phone && (
                                                            <div className="space-y-1">
                                                                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Office</span>
                                                                <a href={`tel:${viewingHospital.contact_phone}`} className="block font-medium text-sm hover:text-primary hover:underline transition-colors w-fit">
                                                                    {viewingHospital.contact_phone}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {viewingHospital.contact_email && (
                                                            <div className="space-y-1">
                                                                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Email</span>
                                                                <a href={`mailto:${viewingHospital.contact_email}`} className="block font-medium text-sm hover:text-primary hover:underline transition-colors truncate w-full">
                                                                    {viewingHospital.contact_email}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Operations */}
                                            <div className="space-y-5">
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-primary" /> Operations
                                                </h3>
                                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("p-2 rounded-lg", viewingHospital.is_24by7 ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600")}>
                                                            {viewingHospital.is_24by7 ? <Activity className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{viewingHospital.is_24by7 ? "24x7 Emergency" : "Standard Hours"}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {viewingHospital.is_24by7 ? "Open round the clock" : `${viewingHospital.opening_time} - ${viewingHospital.closing_time}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-border/50">
                                                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Established</span>
                                                        <p className="font-medium text-sm mt-0.5">{formatDate(viewingHospital.opening_date)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Legal */}
                                            <div className="space-y-5">
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" /> Compliance
                                                </h3>
                                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 grid grid-cols-2 gap-4">
                                                    {viewingHospital.registration_no && (
                                                        <div className="space-y-1">
                                                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Reg No.</span>
                                                            <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{viewingHospital.registration_no}</p>
                                                        </div>
                                                    )}
                                                    {viewingHospital.license_no && (
                                                        <div className="space-y-1">
                                                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">License</span>
                                                            <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{viewingHospital.license_no}</p>
                                                        </div>
                                                    )}
                                                    {viewingHospital.gst_no && (
                                                        <div className="space-y-1 col-span-2">
                                                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">GST No.</span>
                                                            <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{viewingHospital.gst_no}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-6 border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0 flex gap-3 justify-end items-center z-20">
                                        <Button variant="outline" onClick={() => setViewingHospital(null)} className="px-6 rounded-xl border-border/50 hover:bg-muted/50 transition-colors h-11 font-medium text-muted-foreground hover:text-foreground">
                                            Close
                                        </Button>
                                        {canEdit && (
                                            <Button
                                                onClick={() => {
                                                    setViewingHospital(null);
                                                    setEditingHospital(viewingHospital);
                                                    setIsAddModalOpen(true);
                                                }}
                                                className="px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 transition-all text-white font-semibold h-11 hover:scale-105 active:scale-95"
                                            >
                                                Edit Branch
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div >


            {/* Nested Admin View Modal */}
            < Dialog open={isAdminViewOpen} onOpenChange={setIsAdminViewOpen} >
                <DialogContent className="max-w-[400px] w-full p-0 border-none shadow-2xl bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden [&>button]:hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Admin Details</DialogTitle>
                    </DialogHeader>
                    <div className="h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        {/* Abstract shapes */}
                        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                        <div className="absolute top-4 right-10 h-16 w-16 rounded-full bg-purple-400/20 blur-xl"></div>

                        <div className="absolute top-2 right-2 z-10">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors backdrop-blur-md" onClick={() => setIsAdminViewOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="px-6 flex flex-col items-center -mt-12 text-center pb-6">
                        <div className="h-24 w-24 rounded-full shadow-xl bg-muted flex items-center justify-center overflow-hidden ring-4 ring-background/20 backdrop-blur-sm">
                            {viewingAdmin?.profile_image_url ? (
                                <img src={viewingAdmin.profile_image_url} alt={viewingAdmin.name} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-muted-foreground">{viewingAdmin?.name?.charAt(0)}</span>
                            )}
                        </div>
                        <h3 className="mt-3 text-xl font-bold">{viewingAdmin?.name}</h3>
                        <Badge variant="secondary" className="mt-1">Hospital Admin</Badge>

                        <div className="w-full mt-6 space-y-3 text-left">
                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Email</p>
                                    <a href={`mailto:${viewingAdmin?.email}`} className="text-sm font-semibold truncate block hover:text-primary transition-colors">{viewingAdmin?.email}</a>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
                                    <Phone className="h-4 w-4 text-primary" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Phone</p>
                                    <a href={`tel:${viewingAdmin?.phoneno}`} className="text-sm font-semibold truncate block hover:text-primary transition-colors">{viewingAdmin?.phoneno}</a>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
                                    <Activity className="h-4 w-4 text-primary" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Status</p>
                                    <p className={`text-sm font-bold ${viewingAdmin?.isactive ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {viewingAdmin?.isactive ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >
        </RoleGuard >
    );
}

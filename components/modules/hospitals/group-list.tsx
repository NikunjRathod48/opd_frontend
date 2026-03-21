
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Phone, Mail, MapPin, ArrowRight, X, Plus, Pencil, Eye, Users, Stethoscope, Activity, Building2, Shield, FileText, Filter, RotateCcw, Search, Loader2, Check, Truck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DeliveryButton } from "../../ui/delivery-button";
import { Loader } from "@/components/ui/loader";

// Define the API Interface
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
    users_hospital_groups_created_byTousers?: {
        full_name: string;
    };
    employees?: {
        users_employees_user_idTousers: {
            user_id: number;
            full_name: string;
            email: string;
            phone_number: string;
            profile_image_url: string;
            is_active: boolean;
        }
    }[];
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { stiffness: 300, damping: 24 } }
};

const groupSchema = z.object({
    group_name: z.string().min(1, "Group Name is required").max(100),
    group_code: z.string().min(1, "Group Code is required").max(10).toUpperCase(),
    description: z.string().optional(),
    registration_no: z.string().optional(),
    contact_phone: z.string()
        .length(10, "Phone number must be exactly 10 digits")
        .regex(/^\d+$/, "Phone number must be numeric"),
    contact_email: z.string().email("Invalid email address").optional().or(z.literal('')),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export function GroupList() {
    const { user, getRoleBasePath } = useAuth();
    const { addToast } = useToast();
    const [hospitalGroups, setHospitalGroups] = useState<HospitalGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter Logic States
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Search States
    const [generalSearch, setGeneralSearch] = useState("");
    const [searchName, setSearchName] = useState("");
    const [searchCode, setSearchCode] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchPhone, setSearchPhone] = useState("");

    // Active Filter State
    const [activeFilters, setActiveFilters] = useState({
        general: "",
        name: "",
        code: "",
        email: "",
        phone: ""
    });

    // Edit/Add State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const form = useForm<GroupFormValues>({
        resolver: zodResolver(groupSchema),
        defaultValues: {
            group_name: "",
            group_code: "",
            description: "",
            registration_no: "",
            contact_phone: "",
            contact_email: "",
        }
    });

    // View State
    const [viewingGroup, setViewingGroup] = useState<HospitalGroup | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Admin View State
    const [viewingAdmin, setViewingAdmin] = useState<any | null>(null);
    const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

    // Fetch Data
    const fetchGroups = async () => {
        setIsLoading(true);
        try {
            const data = await api.get<HospitalGroup[]>("/hospital-groups");
            setHospitalGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
            addToast("Failed to load hospital groups", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    // Filter Logic
    const filteredGroups = hospitalGroups.filter(g => {
        const { general, name, code, email, phone } = activeFilters;

        // 1. General Search
        let matchesGeneral = true;
        if (general) {
            const query = general.toLowerCase();
            matchesGeneral = (
                g.group_name.toLowerCase().includes(query) ||
                g.group_code.toLowerCase().includes(query) ||
                (!!g.contact_email && g.contact_email.toLowerCase().includes(query)) ||
                (!!g.contact_phone && g.contact_phone.includes(query))
            );
        }

        const matchesName = !name || g.group_name === name;
        const matchesCode = !code || g.group_code.toLowerCase().includes(code.toLowerCase());
        const matchesEmail = !email || g.contact_email === email;
        const matchesPhone = !phone || g.contact_phone === phone;

        return matchesGeneral && matchesName && matchesCode && matchesEmail && matchesPhone;
    });

    // Unique Options
    const uniqueNames = Array.from(new Set(hospitalGroups.map(g => g.group_name))).filter(Boolean).map(n => ({ label: n, value: n }));
    const uniqueEmails = Array.from(new Set(hospitalGroups.map(g => g.contact_email).filter(Boolean))).map(e => ({ label: e, value: e }));
    const uniquePhones = Array.from(new Set(hospitalGroups.map(g => g.contact_phone).filter(Boolean))).map(p => ({ label: p, value: p }));

    const applyFilters = () => {
        setActiveFilters({
            general: generalSearch,
            name: searchName,
            code: searchCode,
            email: searchEmail,
            phone: searchPhone
        });
    };

    const resetFilters = () => {
        setGeneralSearch("");
        setSearchName("");
        setSearchCode("");
        setSearchEmail("");
        setSearchPhone("");
        setActiveFilters({
            general: "",
            name: "",
            code: "",
            email: "",
            phone: ""
        });
    };

    const hasActiveFilters = Object.values(activeFilters).some(value => value !== "");

    const handleOpenAdd = () => {
        setIsEditing(false);
        setEditingId(null);
        form.reset({
            group_name: "",
            group_code: "",
            description: "",
            registration_no: "",
            contact_phone: "",
            contact_email: "",
        });
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

    const handleOpenView = (group: HospitalGroup) => {
        setViewingGroup(group);
        setIsViewModalOpen(true);
    };

    const handleOpenAdminView = (adminUser: any) => {
        // Transform data if needed or just pass the user object from employees array
        setViewingAdmin(adminUser);
        setIsAdminViewOpen(true);
    };



    const onSubmit = async (data: GroupFormValues) => {
        setIsSubmitting(true);
        try {
            // Artificial delay to show full 3D animation (Loading + Driving phases)
            await new Promise(resolve => setTimeout(resolve, 4500));

            if (isEditing) {
                await api.put(`/hospital-groups/${editingId}`, data);
            } else {
                await api.post("/hospital-groups", data);
            }

            setIsSubmitting(false);
            setIsSuccess(true);

            addToast(`Hospital Group ${isEditing ? 'updated' : 'created'} successfully`, "success");

            // Wait for success animation before closing
            setTimeout(() => {
                setIsModalOpen(false);
                setIsSuccess(false);
                fetchGroups(); // Refresh data
            }, 1000);

        } catch (error: any) {
            setIsSubmitting(false);
            addToast(error.message, "error");
        }
    };

    if (isLoading && hospitalGroups.length === 0) {
        return <Loader size="lg" text="Loading groups..." className="py-20" />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header with Decor */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent pb-1">
                        Hospital Groups
                    </h2>
                    <p className="text-muted-foreground/80 font-medium text-lg mt-1">Manage hospital networks and groups</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0 relative z-20">
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

                    {user?.role === 'SuperAdmin' && (
                        <Tooltip content="Add New Group">
                            <Button onClick={handleOpenAdd} size="lg" className="w-full md:w-auto shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 text-base font-semibold text-white h-11">
                                <Plus className="mr-2 h-5 w-5" /> Add Group
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
                                            placeholder="Group Name, Code..."
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

                                {/* Code */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Group Code</Label>
                                    <Input
                                        placeholder="e.g. APOLLO"
                                        value={searchCode}
                                        onChange={(e) => setSearchCode(e.target.value)}
                                        className="h-10 bg-background/50 border-white/20 focus:bg-background transition-all rounded-xl shadow-sm uppercase font-mono"
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
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10"
            >
                <AnimatePresence mode="popLayout">
                    {filteredGroups.map((group) => (
                        <motion.div
                            key={group.hospital_group_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            layout
                        >
                            <Card
                                className="group relative h-full overflow-hidden bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border-[1.5px] border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(15,23,42,0.3)] hover:-translate-y-1 transition-all duration-300 rounded-[2rem] w-full"
                            >
                                {/* Decorative Gradient Blob */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-bl-[3rem] -z-10 transition-all group-hover:bg-primary/10 dark:group-hover:bg-primary/20" />

                                {/* Action Buttons - Top Right and Always Visible as per Standard */}
                                <div className="absolute top-3 right-3 flex gap-2 z-10 transition-opacity duration-300">
                                    <Tooltip content="View Details">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                            onClick={() => handleOpenView(group)}
                                        >
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </Tooltip>
                                    {user?.role === 'SuperAdmin' && (
                                        <Tooltip content="Edit Group">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEdit(group);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </Tooltip>
                                    )}
                                </div>

                                <CardHeader className="flex flex-row items-center gap-4 pb-2 pt-6 px-6">
                                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-[1px] border-white/20 shadow-inner flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform duration-300 font-bold text-lg backdrop-blur-sm">
                                        {group.group_code.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="space-y-1 overflow-hidden">
                                        <CardTitle className="text-lg font-bold truncate text-foreground dark:text-slate-100 group-hover:text-primary transition-colors">{group.group_name}</CardTitle>
                                        <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/10 rounded-full px-2.5 py-0.5 text-[10px] tracking-wide">
                                            {group.group_code}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-2 px-6 pb-6">
                                    <div className="space-y-2 bg-background/40 dark:bg-slate-800/30 p-3 rounded-2xl border border-border/50 dark:border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email</p>
                                                {group.contact_email ? (
                                                    <a href={`mailto:${group.contact_email}`} className="text-xs font-medium truncate block hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>{group.contact_email}</a>
                                                ) : <span className="text-xs italic text-muted-foreground">N/A</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 shrink-0">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</p>
                                                {group.contact_phone ? (
                                                    <a href={`tel:${group.contact_phone}`} className="text-xs font-medium truncate block hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>{group.contact_phone}</a>
                                                ) : <span className="text-xs italic text-muted-foreground">N/A</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                                        <Tooltip content={`View all branches for ${group.group_name}`}>
                                            <Button asChild className="w-full rounded-xl group/btn bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-primary border-primary/20 hover:border-primary/30 shadow-none border h-10 font-semibold" variant="outline">
                                                <Link
                                                    href={`${getRoleBasePath(user?.role)}/hospitals?group=${group.hospital_group_id}`}
                                                    className="flex items-center justify-center gap-2"
                                                >
                                                    View Branches
                                                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                                </Link>
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredGroups.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-full flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-border/50 text-center"
                    >
                        <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-muted/50 to-background shadow-inner flex items-center justify-center mb-4">
                            <Building className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground/80">No hospital groups found</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-2">
                            Try adjusting your filters or search criteria.
                        </p>
                        <Button variant="outline" onClick={resetFilters} className="mt-6 rounded-xl px-6">
                            <RotateCcw className="mr-2 h-4 w-4" /> Clear filters
                        </Button>
                    </motion.div>
                )}
            </motion.div>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={(open) => {
                if (!open) setIsModalOpen(false);
            }}>
                <DialogContent className="max-w-[850px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl block select-none rounded-3xl sm:rounded-[2.5rem] [&>button]:hidden">
                    {/* Header */}
                    <div className="h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute top-4 right-4 z-50">
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Abstract shapes */}
                        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                        <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl"></div>

                        <div className="absolute bottom-6 left-8 flex items-center gap-4 z-10 w-full pr-12">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl shrink-0">
                                {isEditing ? <Pencil className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-2xl font-bold text-white tracking-tight truncate">
                                    {isEditing ? "Edit Hospital Group" : "Add New Group"}
                                </DialogTitle>
                                <DialogDescription className="text-blue-100/90 text-sm font-medium mt-1">
                                    {isEditing ? "Update network details." : "Create a new hospital network."}
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden h-[calc(85vh-7rem)]">
                        <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            <div className="space-y-6">
                                {/* Core Info */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-primary" /> Core Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-muted/30 rounded-2xl border border-border/50">
                                        <div className="space-y-2">
                                            <Label htmlFor="group_name" className="text-xs font-bold text-muted-foreground uppercase">Group Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="group_name"
                                                {...form.register("group_name")}
                                                placeholder="e.g. Apollo Hospitals"
                                                className="bg-background/50 border-input/50 focus:bg-background transition-all h-10 rounded-xl"
                                            />
                                            {form.formState.errors.group_name && <p className="text-xs text-red-500 font-medium">{form.formState.errors.group_name.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="group_code" className="text-xs font-bold text-muted-foreground uppercase">code <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="group_code"
                                                {...form.register("group_code")}
                                                placeholder="e.g. APL"
                                                className="bg-background/50 border-input/50 focus:bg-background transition-all h-10 rounded-xl font-mono uppercase"
                                            />
                                            {form.formState.errors.group_code && <p className="text-xs text-red-500 font-medium">{form.formState.errors.group_code.message}</p>}
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-2">
                                            <Label htmlFor="description" className="text-xs font-bold text-muted-foreground uppercase">Description</Label>
                                            <Textarea
                                                id="description"
                                                {...form.register("description")}
                                                placeholder="Brief overview of the hospital group..."
                                                className="bg-background/50 border-input/50 focus:bg-background transition-all min-h-[80px] rounded-xl resize-none"
                                            />
                                            {form.formState.errors.description && <p className="text-xs text-red-500 font-medium">{form.formState.errors.description.message}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Legal */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" /> Legal & Contact
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-muted/30 rounded-2xl border border-border/50">
                                        <div className="space-y-2">
                                            <Label htmlFor="registration_no" className="text-xs font-bold text-muted-foreground uppercase">Registration No.</Label>
                                            <Input
                                                id="registration_no"
                                                {...form.register("registration_no")}
                                                placeholder="e.g. REG-2024-001"
                                                className="bg-background/50 border-input/50 focus:bg-background transition-all h-10 rounded-xl font-mono"
                                            />
                                            {form.formState.errors.registration_no && <p className="text-xs text-red-500 font-medium">{form.formState.errors.registration_no.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact_phone" className="text-xs font-bold text-muted-foreground uppercase">Phone</Label>
                                            <Input
                                                id="contact_phone"
                                                {...form.register("contact_phone")}
                                                placeholder="+91..."
                                                onInput={(e) => {
                                                    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                                                }}
                                                maxLength={10}
                                                className="bg-background/50 border-input/50 focus:bg-background transition-all h-10 rounded-xl"
                                            />
                                            {form.formState.errors.contact_phone && <p className="text-xs text-red-500 font-medium">{form.formState.errors.contact_phone.message}</p>}
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-2">
                                            <Label htmlFor="contact_email" className="text-xs font-bold text-muted-foreground uppercase">Email</Label>
                                            <Input
                                                id="contact_email"
                                                type="email"
                                                {...form.register("contact_email")}
                                                placeholder="admin@group.com"
                                                className="bg-background/50 border-input/50 focus:bg-background transition-all h-10 rounded-xl"
                                            />
                                            {form.formState.errors.contact_email && <p className="text-xs text-red-500 font-medium">{form.formState.errors.contact_email.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0 flex gap-3 justify-end items-center z-20">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="px-6 rounded-xl border-border/50 hover:bg-muted/50 transition-colors h-11 font-medium text-muted-foreground hover:text-foreground">
                                Cancel
                            </Button>
                            <DeliveryButton
                                type="submit"
                                isLoading={isSubmitting}
                                isSuccess={isSuccess}
                                className="w-full md:w-auto"
                            >
                                {isEditing ? "Update Group" : "Create Group"}
                            </DeliveryButton>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Details Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-[850px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl block select-none rounded-3xl sm:rounded-[2.5rem] [&>button]:hidden">
                    {viewingGroup && (
                        <>
                            {/* Header */}
                            <div className="h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden shrink-0">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                                <div className="absolute top-4 right-4 z-50">
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md" onClick={() => setIsViewModalOpen(false)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>

                                {/* Abstract shapes */}
                                <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                                <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl"></div>

                                <div className="absolute bottom-6 left-8 flex items-center gap-4 z-10">
                                    <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                                        <Building className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                                                {viewingGroup.group_name}
                                            </DialogTitle>
                                            <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-sm">
                                                {viewingGroup.group_code}
                                            </Badge>
                                        </div>
                                        <DialogDescription className="text-blue-100/90 text-sm font-medium mt-1">
                                            Hospital Network Group
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
                                                <p className="text-xs text-muted-foreground max-w-md">The primary point of contact managing this hospital group.</p>
                                            </div>

                                            {viewingGroup.employees && viewingGroup.employees.length > 0 ? (
                                                <div
                                                    className="flex items-center gap-4 bg-background/60 backdrop-blur-md p-3 rounded-xl border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-background/80 transition-colors group/admin min-w-[280px]"
                                                    onClick={() => handleOpenAdminView(viewingGroup.employees![0].users_employees_user_idTousers)}
                                                >
                                                    <div className="h-12 w-12 rounded-full border-2 border-white dark:border-gray-800 shadow-md overflow-hidden relative bg-muted flex items-center justify-center">
                                                        {viewingGroup.employees[0].users_employees_user_idTousers.profile_image_url ? (
                                                            <img src={viewingGroup.employees[0].users_employees_user_idTousers.profile_image_url} alt="Profile" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg font-bold text-muted-foreground">{viewingGroup.employees[0].users_employees_user_idTousers.full_name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-foreground group-hover/admin:text-indigo-600 transition-colors flex items-center gap-1 truncate">
                                                            {viewingGroup.employees[0].users_employees_user_idTousers.full_name}
                                                            <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover/admin:opacity-100 group-hover/admin:translate-x-0 transition-all duration-300" />
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">{viewingGroup.employees[0].users_employees_user_idTousers.email}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-3 bg-muted/40 rounded-xl border border-dashed border-muted-foreground/30 text-xs text-muted-foreground flex items-center gap-2 italic min-w-[200px] justify-center">
                                                    <X className="h-3 w-3" /> No Admin Assigned
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Contact Info */}
                                        <div className="space-y-5">
                                            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-primary" /> Contact Details
                                            </h3>
                                            <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Email</span>
                                                    <a href={`mailto:${viewingGroup.contact_email}`} className="block font-medium text-sm hover:text-primary hover:underline transition-colors w-full truncate">
                                                        {viewingGroup.contact_email || "N/A"}
                                                    </a>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Phone</span>
                                                    <a href={`tel:${viewingGroup.contact_phone}`} className="block font-medium text-sm hover:text-primary hover:underline transition-colors w-fit">
                                                        {viewingGroup.contact_phone || "N/A"}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Legal Info */}
                                        <div className="space-y-5">
                                            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" /> Legal & Registration
                                            </h3>
                                            <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Registration No.</span>
                                                    <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">
                                                        {viewingGroup.registration_no || "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {viewingGroup.description && (
                                            <div className="col-span-1 md:col-span-2 space-y-5">
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-primary" /> Description
                                                </h3>
                                                <div className="bg-muted/30 p-5 rounded-2xl text-sm leading-relaxed text-muted-foreground border border-border/50">
                                                    {viewingGroup.description}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0 flex gap-3 justify-end items-center z-20">
                                    <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="px-6 rounded-xl border-border/50 hover:bg-muted/50 transition-colors h-11 font-medium text-muted-foreground hover:text-foreground">
                                        Close
                                    </Button>
                                    {user?.role === 'SuperAdmin' && (
                                        <Button
                                            onClick={() => {
                                                setIsViewModalOpen(false);
                                                handleOpenEdit(viewingGroup);
                                            }}
                                            className="px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 transition-all text-white font-semibold h-11 hover:scale-105 active:scale-95"
                                        >
                                            Edit Group
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Nested Admin View Modal */}
            <Dialog open={isAdminViewOpen} onOpenChange={setIsAdminViewOpen}>
                <DialogContent className="max-w-[400px] w-full p-0 border-none shadow-2xl bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden [&>button]:hidden">
                    <DialogTitle className="sr-only">Admin Profile</DialogTitle>
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
                                <img src={viewingAdmin.profile_image_url} alt="Admin" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-muted-foreground">{viewingAdmin?.full_name?.charAt(0)}</span>
                            )}
                        </div>
                        <h3 className="mt-3 text-xl font-bold">{viewingAdmin?.full_name}</h3>
                        <Badge variant="secondary" className="mt-1">Group Admin</Badge>

                        <div className="w-full mt-6 space-y-3 text-left">
                            <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Email</p>
                                    <a href={`mailto:${viewingAdmin?.email}`} className="text-sm font-semibold truncate block hover:text-primary transition-colors">{viewingAdmin?.email}</a>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
                                    <Phone className="h-4 w-4 text-primary" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Phone</p>
                                    <a href={`tel:${viewingAdmin?.phone_number}`} className="text-sm font-semibold truncate block hover:text-primary transition-colors">{viewingAdmin?.phone_number}</a>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
                                    <Activity className="h-4 w-4 text-primary" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Status</p>
                                    <p className={`text-sm font-bold ${viewingAdmin?.is_active ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {viewingAdmin?.is_active ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

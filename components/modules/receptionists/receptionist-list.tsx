"use client";

import { useState, useMemo, useEffect } from "react";
import {
    Search, Plus, RefreshCw, MoreVertical,
    Mail, Phone, Calendar, UserCog, CheckCircle2, XCircle,
    ArrowUpDown, Loader2, Filter, Eye, EyeOff, Pencil, Activity, Shield, User as UserIcon, X, Building2, Building, Lock, Trash2
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { ImageUpload } from "@/components/ui/image-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Loader } from "@/components/ui/loader";

import { useData, Receptionist } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

import { z } from "zod";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// --- Schema Definitions ---

const passwordSchema = z.string()
    .min(6, "Password must be at least 6 characters")
    .max(12, "Password must be at most 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
    .regex(/^\S*$/, "Password must not contain spaces");

const receptionistSchema = z.object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone_number: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\d+$/, "Phone number must be numeric"),
    hospital_id: z.string().min(1, "Hospital is required"),
    joining_date: z.string().min(1, "Joining date is required"),
    password: z.string().optional(),
});

const receptionistCreateSchema = receptionistSchema.extend({
    password: passwordSchema
});

const receptionistUpdateSchema = receptionistSchema.extend({
    password: passwordSchema.optional().or(z.literal(''))
});

type ReceptionistFormValues = z.infer<typeof receptionistSchema>;

// --- Animation Variants ---
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

export function ReceptionistList() {
    const { receptionists, hospitals, refreshReceptionists, updateReceptionist } = useData();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [isLoading, setIsLoading] = useState(false);

    // Filter States
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [generalSearch, setGeneralSearch] = useState("");
    const [searchName, setSearchName] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchContact, setSearchContact] = useState("");
    const [searchHospitalId, setSearchHospitalId] = useState("");
    const [searchStatus, setSearchStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Active Filter State
    const [activeFilters, setActiveFilters] = useState({
        general: "",
        name: "",
        email: "",
        contact: "",
        hospitalId: "",
        status: "all",
        start: "",
        end: ""
    });

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [selectedReceptionist, setSelectedReceptionist] = useState<Receptionist | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profileImageDisplay, setProfileImageDisplay] = useState<File | string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form
    const form = useForm<ReceptionistFormValues>({
        resolver: zodResolver(modalMode === 'add' ? receptionistCreateSchema : receptionistUpdateSchema) as any,
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            joining_date: new Date().toISOString().split('T')[0],
            hospital_id: "",
            password: ""
        }
    });

    // --- Helpers ---

    const canManage = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin'].includes(user?.role || '');

    // Filter Logic
    const myGroupId = user?.hospitalgroupid?.toString();
    const myHospitals = hospitals.filter(h =>
        myGroupId ? h.hospitalgroupid.toString() === myGroupId : true
    );

    const getHospitalName = (id?: string) => hospitals.find(h => h.hospitalid === id)?.hospitalname || 'Unknown';

    const myReceptionists = receptionists.filter(r =>
        // specific logic: show receptionists from my hospitals
        myHospitals.some(h => h.hospitalid === r.hospitalid)
    );

    const filteredReceptionists = useMemo(() => {
        return myReceptionists.filter((rec) => {
            const { general, name, email, contact, hospitalId, status, start, end } = activeFilters;

            // 1. General Search
            let matchesGeneral = true;
            if (general) {
                const query = general.toLowerCase();
                const hospName = getHospitalName(rec.hospitalid).toLowerCase();
                matchesGeneral = (
                    rec.name.toLowerCase().includes(query) ||
                    rec.email.toLowerCase().includes(query) ||
                    rec.contact.includes(query) ||
                    hospName.includes(query)
                );
            }

            // 2. Specific Fields
            const matchesName = !name || rec.name.toLowerCase().includes(name.toLowerCase());
            const matchesEmail = !email || rec.email.toLowerCase().includes(email.toLowerCase());
            const matchesContact = !contact || rec.contact.includes(contact);
            const matchesHospital = !hospitalId || rec.hospitalid === hospitalId;
            const matchesStatus = status === "all" || (status === "active" ? rec.isactive : !rec.isactive);

            // 3. Date Range
            let matchesDate = true;
            if (start || end) {
                const dateToCheck = new Date(rec.joiningDate || "");
                dateToCheck.setHours(0, 0, 0, 0);

                if (start) {
                    const startDateObj = new Date(start);
                    startDateObj.setHours(0, 0, 0, 0);
                    if (dateToCheck < startDateObj) matchesDate = false;
                }
                if (end) {
                    const endDateObj = new Date(end);
                    endDateObj.setHours(0, 0, 0, 0);
                    if (dateToCheck > endDateObj) matchesDate = false;
                }
            }

            return matchesGeneral && matchesName && matchesEmail && matchesContact && matchesHospital && matchesStatus && matchesDate;
        });
    }, [myReceptionists, activeFilters]);

    // Unique Options for Filters
    const uniqueNames = Array.from(new Set(myReceptionists.map(a => a.name))).map(name => ({ label: name, value: name }));
    const uniqueEmails = Array.from(new Set(myReceptionists.map(a => a.email))).map(email => ({ label: email, value: email }));
    const uniqueContacts = Array.from(new Set(myReceptionists.map(a => a.contact))).filter(Boolean).map(phone => ({ label: phone, value: phone }));
    const hospitalOptions = myHospitals.map(h => ({ label: h.hospitalname, value: h.hospitalid }));


    // --- Handlers ---

    const applyFilters = () => {
        setActiveFilters({
            general: generalSearch,
            name: searchName,
            email: searchEmail,
            contact: searchContact,
            hospitalId: searchHospitalId,
            status: searchStatus,
            start: startDate,
            end: endDate
        });
    };

    const resetFilters = () => {
        setGeneralSearch("");
        setSearchName("");
        setSearchEmail("");
        setSearchContact("");
        setSearchHospitalId("");
        setSearchStatus("all");
        setStartDate("");
        setEndDate("");

        setActiveFilters({
            general: "",
            name: "",
            email: "",
            contact: "",
            hospitalId: "",
            status: "all",
            start: "",
            end: ""
        });
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode('add');
            form.reset();
            setProfileImage(null);
            setProfileImageDisplay(null);
            setSelectedReceptionist(null);
        }, 300);
    };

    const handleOpenAdd = () => {
        setModalMode("add");
        setSelectedReceptionist(null);
        setProfileImage(null);
        setProfileImageDisplay(null);
        form.reset({
            full_name: "",
            email: "",
            phone_number: "",
            password: "",
            joining_date: new Date().toISOString().split('T')[0],
            // Default to first hospital if only one exists for user
            hospital_id: user?.hospitalid ? user.hospitalid : (myHospitals.length === 1 ? myHospitals[0].hospitalid : "")
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (rec: Receptionist) => {
        setModalMode("edit");
        setSelectedReceptionist(rec);
        setProfileImage(null); // Reset image input
        setProfileImageDisplay(rec.profile_image_url || null);
        form.reset({
            full_name: rec.name,
            email: rec.email,
            phone_number: rec.contact,
            joining_date: rec.joiningDate,
            hospital_id: rec.hospitalid,
            password: ""
        });
        setIsModalOpen(true);
    };

    const handleOpenView = (rec: Receptionist) => {
        setSelectedReceptionist(rec);
        setIsViewOpen(true);
    };

    const handleToggleStatus = async (rec: Receptionist) => {
        try {
            await updateReceptionist(rec.receptionistid, { isactive: !rec.isactive });
            addToast(`Receptionist ${rec.isactive ? 'deactivated' : 'activated'}`, "success");
        } catch (error) {
            addToast("Failed to update status", "error");
        }
    };

    const onSubmit: SubmitHandler<ReceptionistFormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("full_name", values.full_name);
            formData.append("email", values.email);
            formData.append("phone_number", values.phone_number);
            formData.append("joining_date", values.joining_date);

            // Handle IDs
            if (values.hospital_id) formData.append("hospital_id", values.hospital_id);
            else if (user?.hospitalid) formData.append('hospital_id', user.hospitalid);

            if (user?.hospitalgroupid) formData.append('hospital_group_id', user.hospitalgroupid);

            if (values.password) {
                formData.append("password", values.password);
            }

            // Handle profile image
            if (profileImage) {
                // Backend expects 'file' key for interceptor
                formData.append('file', profileImage);
            }

            if (modalMode === 'add') {
                await api.post("/auth/register-receptionist", formData);
                addToast("Receptionist registered successfully", "success");
            } else if (modalMode === 'edit' && selectedReceptionist) {
                // Use API directly to support FormData/File Upload
                await api.put(`/hospitals/receptionist/${selectedReceptionist.receptionistid}`, formData);
                addToast("Receptionist updated successfully", "success");
            }

            await refreshReceptionists();
            setIsModalOpen(false);
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || error.message || "Operation failed";
            addToast(errorMessage, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Components ---

    if (isLoading) {
        return <div className="h-[60vh] flex items-center justify-center"><Loader size="lg" text="Loading Receptionists..." /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Page Header with Decor */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent pb-1">
                        Receptionists
                    </h2>
                    <p className="text-muted-foreground/80 font-medium text-lg mt-1">
                        Manage front desk staff, access controls, and assignments.
                    </p>
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
                        {(generalSearch || searchName || searchEmail || searchContact || searchHospitalId || searchStatus !== "all" || startDate || endDate) && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 absolute top-2 right-2 animate-pulse" />
                        )}
                    </Button>

                    {canManage && (
                        <Tooltip content="Register New Receptionist" className="w-auto">
                            <Button
                                onClick={handleOpenAdd}
                                size="lg"
                                className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl px-8 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 text-base font-semibold text-white h-11"
                            >
                                <Plus className="mr-2 h-5 w-5" /> Reg. Receptionist
                            </Button>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Floating Popover Filter Panel */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        {/* Backdrop for click-outside */}
                        <div
                            className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20 backdrop-blur-[1px]"
                            onClick={() => setIsFilterOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="absolute top-14 right-0 z-50 w-full md:w-[600px] lg:w-[800px] origin-top-right"
                        >
                            <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-indigo-500/10 dark:shadow-black/40">
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
                                                placeholder="ID, Name, Hospital..."
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
                                            inputClassName="bg-background/50 border-white/20 focus:bg-background shadow-sm"
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
                                            inputClassName="bg-background/50 border-white/20 focus:bg-background shadow-sm"
                                        />
                                    </div>

                                    {/* Contact */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Contact No</Label>
                                        <SearchableSelect
                                            options={uniqueContacts}
                                            value={searchContact}
                                            onChange={setSearchContact}
                                            placeholder="Select Contact..."
                                            className="w-full h-10 rounded-xl"
                                            inputClassName="bg-background/50 border-white/20 focus:bg-background shadow-sm"
                                        />
                                    </div>

                                    {/* Hospital */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Hospital</Label>
                                        <SearchableSelect
                                            options={hospitalOptions}
                                            value={searchHospitalId}
                                            onChange={setSearchHospitalId}
                                            placeholder="Select Hospital..."
                                            className="w-full h-10 rounded-xl"
                                            inputClassName="bg-background/50 border-white/20 focus:bg-background shadow-sm"
                                        />
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Status</Label>
                                        <Select value={searchStatus} onValueChange={(val: any) => setSearchStatus(val)}>
                                            <SelectTrigger className="h-10 bg-background/50 border-input hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl w-full shadow-sm">
                                                <SelectValue placeholder="All Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date Range Start */}
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Joined From</Label>
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
                                        <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Joined To</Label>
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
                    </>
                )}
            </AnimatePresence>

            {/* Content */}
            <motion.div
                key={JSON.stringify(activeFilters)}
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10"
            >
                <AnimatePresence mode="popLayout">
                    {filteredReceptionists.map((rec) => (
                        <motion.div 
                            key={rec.receptionistid} 
                            variants={item} 
                            initial="hidden"
                            animate="show"
                            exit="hidden"
                            layout
                        >
                            <Card
                                className="group relative overflow-hidden bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border-[1.5px] border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(15,23,42,0.3)] hover:-translate-y-1 transition-all duration-300 rounded-[2rem] w-full"
                            >
                                {/* Decorative Gradient Blob */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-bl-[3rem] -z-10 transition-all group-hover:bg-primary/10 dark:group-hover:bg-primary/20" />

                                {/* Action Buttons - Top Right */}
                                <div className="absolute top-3 right-3 flex gap-2 z-10 transition-opacity duration-300">
                                    {canManage && (
                                        <>
                                            <Tooltip content="View Details">
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenView(rec);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content="Edit Details">
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEdit(rec);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content={rec.isactive ? "Deactivate" : "Activate"}>
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className={cn(
                                                        "h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md transition-colors",
                                                        rec.isactive
                                                            ? "text-muted-foreground hover:text-destructive"
                                                            : "text-muted-foreground hover:text-emerald-600"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleStatus(rec);
                                                    }}
                                                >
                                                    {rec.isactive ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                </Button>
                                            </Tooltip>
                                        </>
                                    )}
                                </div>

                                <div className={`absolute top-5 left-0 w-1 rounded-r-full h-8 transition-all duration-300 ${rec.isactive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]"}`} />

                                <CardHeader className="flex flex-col items-center text-center gap-2 pb-0 pt-5 px-5">
                                    <div className="relative">
                                        <div className="h-16 w-16 rounded-full bg-background shadow-md flex items-center justify-center p-1 group-hover:scale-105 transition-transform duration-500 ease-in-out dark:bg-slate-800">
                                            <div className="h-full w-full rounded-full overflow-hidden bg-muted/20 dark:bg-slate-700/50 flex items-center justify-center text-xl font-bold text-primary/80">
                                                {rec.profile_image_url ? (
                                                    <img src={rec.profile_image_url} alt={rec.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    rec.name.charAt(0)
                                                )}
                                            </div>
                                        </div>
                                        <Tooltip content={rec.isactive ? "Active" : "Inactive"}>
                                            <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[2px] border-background dark:border-slate-900 flex items-center justify-center ${rec.isactive ? "bg-emerald-400" : "bg-rose-400"}`} />
                                        </Tooltip>
                                    </div>

                                    <div className="space-y-0.5 w-full overflow-hidden">
                                        <CardTitle className="text-lg font-bold truncate text-foreground dark:text-slate-100 group-hover:text-primary transition-colors">{rec.name}</CardTitle>
                                        <CardDescription className="flex items-center justify-center gap-1.5 truncate text-xs font-medium text-muted-foreground/80 dark:text-slate-400 bg-muted/30 dark:bg-slate-800/50 py-0.5 px-2.5 rounded-full mx-auto w-fit max-w-full">
                                            <Building2 className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{getHospitalName(rec.hospitalid)}</span>
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3 pt-3 px-5 pb-5">
                                    <div className="space-y-1.5 bg-background/40 dark:bg-slate-800/30 p-2.5 rounded-2xl border border-border/50 dark:border-slate-700/50">
                                        <a href={`mailto:${rec.email}`} className="flex items-center gap-2.5 text-xs group/link hover:bg-background/80 dark:hover:bg-slate-700/50 p-1.5 rounded-xl transition-all" onClick={(e) => e.stopPropagation()}>
                                            <div className="h-7 w-7 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                                <Mail className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="truncate text-muted-foreground dark:text-slate-400 group-hover/link:text-foreground dark:group-hover/link:text-slate-200 font-medium transition-colors">
                                                {rec.email}
                                            </span>
                                        </a>
                                        <a href={`tel:${rec.contact}`} className="flex items-center gap-2.5 text-xs group/link hover:bg-background/80 dark:hover:bg-slate-700/50 p-1.5 rounded-xl transition-all" onClick={(e) => e.stopPropagation()}>
                                            <div className="h-7 w-7 rounded-full bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                                                <Phone className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="truncate text-muted-foreground dark:text-slate-400 group-hover/link:text-foreground dark:group-hover/link:text-slate-200 font-medium transition-colors">
                                                {rec.contact}
                                            </span>
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredReceptionists.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-border/50 text-center">
                        <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-muted/50 to-background shadow-inner flex items-center justify-center mb-6">
                            <UserCog className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground/80">No receptionists found</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-3 text-lg">
                            We couldn't find any receptionists matching your filters.
                        </p>
                        <Button variant="outline" size="lg" onClick={resetFilters} className="mt-8 rounded-full px-8">
                            Clear Filters
                        </Button>
                    </div>
                )}
            </motion.div>

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="max-w-2xl w-full border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden [&>button]:hidden rounded-[2.5rem] flex flex-col max-h-[90vh]">
                    {/* Clean Header */}
                    <div className="relative h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 w-full shrink-0 flex items-center px-8">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
                        <div className="flex items-center gap-4 relative z-10 text-white w-full">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/30 flex items-center justify-center shrink-0">
                                {modalMode === 'edit' ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                                    {modalMode === 'edit' ? "Update Receptionist" : "New Receptionist"}
                                </DialogTitle>
                                <DialogDescription className="text-white/80 font-medium text-xs">
                                    {modalMode === 'edit' ? "Modify staff details." : "Onboard new staff."}
                                </DialogDescription>
                            </div>
                            <Button size="icon" variant="ghost" className="ml-auto h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full" onClick={handleCancel}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 bg-muted/5">
                        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin">

                            {/* Profile Upload - Centered in Body */}
                            <div className="flex flex-col items-center gap-3">
                                <ImageUpload
                                    value={profileImage || profileImageDisplay}
                                    onChange={(f) => setProfileImage(f)}
                                    variant="avatar"
                                    showActions={true}
                                    label=""
                                />
                                <div className="text-center">
                                    <Label className="text-sm font-semibold text-foreground">Profile Photo</Label>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Professional Headshot</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                {/* Left Column: Personal Info */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                            <UserIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Details</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Full Name <span className="text-red-500">*</span></Label>
                                            <div className="relative group">
                                                <Input
                                                    {...form.register("full_name")}
                                                    placeholder="e.g. John Doe"
                                                    className="pl-11 bg-background border-border/50 hover:border-indigo-500/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl transition-all shadow-sm"
                                                />
                                                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                    <UserIcon className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                            {form.formState.errors.full_name && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.full_name.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Email Address <span className="text-red-500">*</span></Label>
                                            <div className="relative group">
                                                <Input
                                                    {...form.register("email")}
                                                    type="email"
                                                    placeholder="name@clinic.com"
                                                    className="pl-11 bg-background border-border/50 hover:border-indigo-500/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl transition-all shadow-sm"
                                                />
                                                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                            {form.formState.errors.email && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.email.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Phone Number <span className="text-red-500">*</span></Label>
                                            <div className="relative group">
                                                <Input
                                                    {...form.register("phone_number")}
                                                    type="tel"
                                                    placeholder="+91 98765 00000"
                                                    className="pl-11 bg-background border-border/50 hover:border-indigo-500/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl transition-all shadow-sm"
                                                    maxLength={10}
                                                    onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "")}
                                                />
                                                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                            {form.formState.errors.phone_number && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.phone_number.message}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Assignment & Security */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                                            <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assignment & Access</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Hospital Branch <span className="text-red-500">*</span></Label>
                                            <SearchableSelect
                                                options={hospitalOptions}
                                                value={form.watch("hospital_id")}
                                                onChange={(v) => form.setValue("hospital_id", v, { shouldValidate: true })}
                                                placeholder="Select Hospital"
                                                className="w-full"
                                                inputClassName="bg-background border-border/50 hover:border-purple-500/30 focus:border-purple-500/50 rounded-xl"
                                                disabled={modalMode === 'edit'}
                                            />
                                            {form.formState.errors.hospital_id && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.hospital_id.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Joining Date <span className="text-red-500">*</span></Label>
                                            <Controller
                                                control={form.control}
                                                name="joining_date"
                                                render={({ field }) => (
                                                    <DatePicker
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        className="w-full rounded-xl"
                                                    />
                                                )}
                                            />
                                            {form.formState.errors.joining_date && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.joining_date.message}</p>}
                                        </div>

                                        <div className="space-y-1.5 pt-2">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Set Password <span className="text-red-500">*</span></Label>
                                            <div className="relative group">
                                                <Input
                                                    {...form.register("password")}
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className="pl-11 pr-10 bg-background border-border/50 hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl transition-all shadow-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === " ") {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                    <Lock className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-purple-500 transition-colors" />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-0 top-0 bottom-0 h-full w-10 hover:bg-transparent text-muted-foreground/50 hover:text-purple-500 transition-colors"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight">Must include 1 uppercase, 1 lowercase, 1 number, & 1 special char.</p>
                                            {form.formState.errors.password && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.password.message}</p>}
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-end gap-3">
                            <Button type="button" variant="ghost" className="rounded-xl px-6 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-muted-foreground font-medium" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !form.formState.isDirty}
                                className="rounded-xl px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 font-semibold transition-all hover:scale-105 active:scale-95"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    "Save Receptionist"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Modal - Premium Profile Card Design */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-[700px] w-full border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl p-0 overflow-y-auto max-h-[90vh] [&>button]:hidden rounded-[2.5rem] scrollbar-hide">

                    {/* Header */}
                    <div className="h-40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                        <DialogTitle className="sr-only">Receptionist Profile</DialogTitle>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute top-4 right-4 z-10">
                            <Tooltip content="Close">
                                <Button size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:text-white hover:bg-red-500 rounded-full transition-colors" onClick={() => setIsViewOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </Tooltip>
                        </div>
                        {/* Abstract shapes */}
                        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                        <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl"></div>
                    </div>

                    <div className="px-8 pb-8 -mt-20 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
                            {/* Profile Image */}
                            <div className="h-36 w-36 rounded-[2rem] bg-background p-1.5 shadow-2xl relative shrink-0">
                                <div className="h-full w-full rounded-[1.7rem] overflow-hidden bg-muted/20 flex items-center justify-center text-5xl font-bold text-primary/80 relative bg-white dark:bg-slate-800">
                                    {selectedReceptionist?.profile_image_url ? (
                                        <img src={selectedReceptionist.profile_image_url} alt={selectedReceptionist.name} className="h-full w-full object-cover" />
                                    ) : (
                                        selectedReceptionist?.name.charAt(0)
                                    )}
                                </div>
                                <div className={`absolute bottom-3 right-3 h-6 w-6 rounded-full border-[4px] border-background ${selectedReceptionist?.isactive ? "bg-emerald-500" : "bg-rose-500"}`} />
                            </div>

                            {/* Name & Quick Info */}
                            <div className="flex-1 text-center md:text-left md:mb-4 space-y-1">
                                <h2 className="text-3xl font-bold tracking-tight text-foreground text-white">{selectedReceptionist?.name}</h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/10 rounded-full px-3 py-1 text-sm">
                                        Receptionist
                                    </Badge>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground font-medium">{getHospitalName(selectedReceptionist?.hospitalid)}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="md:mb-4 shrink-0">
                                <Button className="rounded-xl px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 border-none font-semibold h-11" onClick={() => { setIsViewOpen(false); if (selectedReceptionist) handleOpenEdit(selectedReceptionist); }}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                                </Button>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Identity Card */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5" /> Identity & System
                                </h3>
                                <div className="bg-muted/30 border border-border/50 rounded-2xl overflow-hidden">
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium mb-1">Receptionist ID</p>
                                            <p className="text-sm font-mono font-semibold bg-background/50 px-2 py-1 rounded-md border border-border/50 w-fit">{selectedReceptionist?.receptionistid}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium mb-1">User ID</p>
                                            <p className="text-sm font-mono font-semibold bg-background/50 px-2 py-1 rounded-md border border-border/50 w-fit">{selectedReceptionist?.userid}</p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 bg-muted/50 border-t border-border/50 flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className={`font-semibold ${selectedReceptionist?.isactive ? "text-emerald-600" : "text-rose-600"}`}>{selectedReceptionist?.isactive ? "Active Account" : "Inactive Account"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" /> Contact Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors group">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
                                            <a href={`mailto:${selectedReceptionist?.email}`} className="text-sm font-semibold truncate block text-foreground hover:text-primary transition-colors">{selectedReceptionist?.email}</a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors group">
                                        <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 shrink-0 group-hover:scale-110 transition-transform">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Phone</p>
                                            <a href={`tel:${selectedReceptionist?.contact}`} className="text-sm font-semibold truncate block text-foreground hover:text-primary transition-colors">{selectedReceptionist?.contact}</a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Employment Card */}
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" /> Employment Information
                                </h3>
                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-bold uppercase">Hospital Branch</p>
                                            <p className="font-bold text-lg">{getHospitalName(selectedReceptionist?.hospitalid)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-8">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium mb-1">Joined Date</p>
                                            <p className="font-semibold">{selectedReceptionist?.joiningDate ? new Date(selectedReceptionist.joiningDate as string).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}

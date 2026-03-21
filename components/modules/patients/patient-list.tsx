"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Pencil, Eye, X, Phone, CalendarCheck, HeartPulse, User as UserIcon, MapPin, Mail, AlertCircle, Droplet, UserCheck, Filter, ChevronDown, Check, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { City, useData, Patient } from "@/context/data-context";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import React from "react";

// --- Schema Definition ---
const patientSchema = z.object({
    full_name: z.string().min(1, "Name is required"),
    dob: z.string().min(1, "Date of Birth is required"),
    gender: z.string().min(1, "Gender is required"),
    blood_group_id: z.string().optional(),
    phone_number: z.string().min(10, "Valid phone number required").optional().or(z.literal("")),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.string().min(1, "Address is required"),
    city_id: z.string().optional(),
    state_id: z.string().optional(),
    pincode: z.string().min(4, "Invalid Pincode").max(6, "Invalid Pincode"),
    emergency_contact_name: z.string().optional(),
    emergency_contact_number: z.string().optional(),
    is_walk_in: z.boolean().optional(),
    hospital_group_id: z.number().optional()
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientListProps {
    allowedRoles?: UserRole[];
    readOnly?: boolean;
    hospitalId?: string;
}

export function PatientList({ allowedRoles = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist'], readOnly = false, hospitalId }: PatientListProps) {
    const { patients, addPatient, updatePatient, bloodGroups, states, getCities, fetchPatients } = useData();
    const { user } = useAuth();
    const { addToast } = useToast();

    // Modal States
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [viewingPatient, setViewingPatient] = useState<any>(null);
    const [editingPatient, setEditingPatient] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Filter States
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tempFilters, setTempFilters] = useState({
        search: "",
        gender: "all",
        bloodGroup: "all",
        state: "all",
        city: "all",
        walkIn: "all"
    });
    const [appliedFilters, setAppliedFilters] = useState({
        search: "",
        gender: "all",
        bloodGroup: "all",
        state: "all",
        city: "all",
        walkIn: "all"
    });

    // States for Filter Dropdowns
    const [filterCityList, setFilterCityList] = useState<City[]>([]);

    // Permissions
    const canRegister = !readOnly && (
        ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Receptionist', 'Doctor'].includes(user?.role || '')
    );

    // Form
    const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            is_walk_in: false,
            gender: "Male"
        }
    });

    const selectedDob = watch("dob");
    const selectedState = watch("state_id");
    const selectedFormCity = watch("city_id");

    // Dynamic City Options for Form
    const [formCityList, setFormCityList] = useState<City[]>([]);

    useEffect(() => {
        if (selectedState) {
            getCities(selectedState).then(setFormCityList);
        } else {
            setFormCityList([]);
        }
    }, [selectedState, getCities]);

    // Dynamic City Options for Filters
    useEffect(() => {
        if (tempFilters.state && tempFilters.state !== "all") {
            getCities(tempFilters.state).then(setFilterCityList);
        } else {
            setFilterCityList([]);
        }
    }, [tempFilters.state, getCities]);

    const effectiveHospitalId = hospitalId || (['HospitalAdmin', 'Receptionist'].includes(user?.role || '') ? user?.hospitalid : undefined);

    // Local Patients for Hospital Details
    const [localPatients, setLocalPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadLocalPatients = React.useCallback(async () => {
        if (!effectiveHospitalId) return;
        setIsLoading(true);
        try {
            const m = await import("@/lib/api");
            const data = await m.api.get<any[]>(`/patients?hospital_id=${effectiveHospitalId}`);
            const mappedPatients: Patient[] = data.map(p => ({
                patientid: p.patient_id.toString(),
                patient_no: p.patient_no || "",
                patientname: p.users_patients_user_idTousers?.full_name || p.emergency_contact_name || "Unknown",
                gender: p.gender || "Other",
                dob: p.dob || "",
                age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 0,
                phone_number: p.phone_number || "",
                contact: p.phone_number || "",
                address: p.address || "",
                isactive: p.is_active,
                blood_group_id: p.blood_group_id,
                city_id: p.city_id,
                state_id: p.state_id,
                pincode: p.pincode || "",
                email: p.email || p.users_patients_user_idTousers?.email || "",
                is_walk_in: p.is_walk_in || false,
                emergency_contact_name: p.emergency_contact_name || "",
                emergency_contact_number: p.emergency_contact_number || "",
                hospitalid: p.hospital_group_id?.toString() || ""
            }));
            setLocalPatients(mappedPatients);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [effectiveHospitalId]);

    useEffect(() => {
        loadLocalPatients();
    }, [loadLocalPatients]);

    const displayPatients = effectiveHospitalId ? localPatients : patients;


    // Helper: Calculate Age
    const calculateAge = (dobString: string) => {
        if (!dobString) return "";
        const today = new Date();
        const birthDate = new Date(dobString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const age = calculateAge(selectedDob);

    // --- Handlers ---

    const handleOpenRegister = () => {
        setIsEditMode(false);
        setEditingPatient(null);
        reset({
            full_name: "",
            dob: "",
            gender: "Male",
            phone_number: "",
            email: "",
            address: "",
            pincode: "",
            emergency_contact_name: "",
            emergency_contact_number: "",
            is_walk_in: false,
            state_id: "",
            city_id: "",
            blood_group_id: ""
        });
        setIsRegisterOpen(true);
    };

    const handleOpenEdit = (patient: any) => {
        setIsEditMode(true);
        setEditingPatient(patient);
        reset({
            full_name: patient.patientname,
            dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : "",
            gender: patient.gender as "Male" | "Female" | "Other",
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
            hospital_group_id: patient.hospitalid ? parseInt(patient.hospitalid) : undefined
        });
        setIsRegisterOpen(true);
    };

    const onSubmit: SubmitHandler<PatientFormValues> = async (data) => {
        try {
            const payload = {
                ...data,
                gender: data.gender as "Male" | "Female" | "Other",
                city_id: data.city_id ? parseInt(data.city_id) : undefined,
                state_id: data.state_id ? parseInt(data.state_id) : undefined,
                hospital_group_id: 1 // Default or context
            };

            if (isEditMode && editingPatient) {
                const result = await updatePatient(editingPatient.patientid, payload);
                if (result && result.success) {
                    addToast("Patient Updated Successfully", "success");
                } else {
                    throw new Error(result?.error || "Failed to update patient");
                }
            } else {
                const result = await addPatient({
                    ...payload,
                    patient_no: "", // Trigger handles
                });
                if (result.success) {
                    addToast("Patient Registered Successfully", "success");
                } else {
                    throw new Error(result.error);
                }
            }

            // Await a global refresh and local hook refresh
            await fetchPatients();
            if (effectiveHospitalId) {
                await loadLocalPatients();
            }

            setIsRegisterOpen(false);
            setEditingPatient(null);
            reset();
        } catch (e: any) {
            addToast(e.message || "Operation failed", "error");
        }
    };

    // --- Filters Logic ---
    const updateFilter = (key: keyof typeof tempFilters, value: string) => {
        setTempFilters(prev => ({ ...prev, [key]: value }));
        // Reset dependent filters
        if (key === 'state') {
            setTempFilters(prev => ({ ...prev, city: 'all' }));
        }
    };

    const applyFilters = () => {
        setAppliedFilters(tempFilters);
        setIsFilterOpen(false);
    };

    const resetFilters = () => {
        const defaultFilters = {
            search: "",
            gender: "all",
            bloodGroup: "all",
            state: "all",
            city: "all",
            walkIn: "all"
        };
        setTempFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
    };

    const filteredPatients = displayPatients.filter(p => {
        const { search, gender, bloodGroup, state, city, walkIn } = appliedFilters;

        const matchSearch = (p.patientname?.toLowerCase().includes(search.toLowerCase())) ||
            (p.patient_no?.toLowerCase().includes(search.toLowerCase())) ||
            (p.phone_number?.includes(search)) ||
            (p.email?.toLowerCase().includes(search.toLowerCase()));

        const matchGender = gender === "all" || p.gender === gender;
        const matchBlood = bloodGroup === "all" || p.blood_group_id?.toString() === bloodGroup;
        const matchState = state === "all" || p.state_id?.toString() === state;
        const matchCity = city === "all" || p.city_id?.toString() === city;
        const matchWalkIn = walkIn === "all" ||
            (walkIn === "yes" && p.is_walk_in) ||
            (walkIn === "no" && !p.is_walk_in);

        return matchSearch && matchGender && matchBlood && matchState && matchCity && matchWalkIn;
    });

    // --- Options ---
    const genderOptions = [
        { label: "Male", value: "Male" },
        { label: "Female", value: "Female" },
        { label: "Other", value: "Other" }
    ];

    const bloodGroupOptions = bloodGroups.map(bg => ({ label: bg.bloodgroupname, value: bg.bloodgroupid }));
    const stateOptions = (states || []).map(s => ({ label: s.state_name, value: s.state_id.toString() }));
    const cityOptions = formCityList.map(c => ({ label: c.city_name, value: c.city_id.toString() }));
    const filterCityOptions = filterCityList.map(c => ({ label: c.city_name, value: c.city_id.toString() }));

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="space-y-6 animate-in fade-in duration-500 pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-1">
                            Patient Records
                        </h2>
                        <p className="text-muted-foreground/80 font-medium text-lg mt-1">
                            Manage patient registration, history, and appointments.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={cn(
                                "gap-2 rounded-xl h-11 px-5 border-slate-200 dark:border-slate-800 font-semibold transition-all duration-300",
                                isFilterOpen
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50"
                                    : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            <Filter className="h-4 w-4" /> Filters
                        </Button>
                        {canRegister && (
                            <Tooltip content="Register New Patient">
                                <Button
                                    onClick={handleOpenRegister}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl px-6 h-11 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                                >
                                    <UserPlus className="mr-2 h-5 w-5" /> New Patient
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* Premium Slide-Over Filter Panel (Sheet) */}
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto border-l-0 shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl flex flex-col p-0 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <SheetHeader className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
                            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="flex flex-col gap-1">
                                <SheetTitle className="flex items-center gap-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                                    <Filter className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    Advanced Filters
                                </SheetTitle>
                                <SheetDescription className="text-sm font-medium text-muted-foreground mt-1">
                                    Refine your patient list by applying combinations of filters below.
                                </SheetDescription>
                            </motion.div>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-8">
                                {/* General Search */}
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }} className="space-y-2.5">
                                    <Label className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Search className="h-3.5 w-3.5" /> General Search
                                    </Label>
                                    <Input
                                        placeholder="Name, Phone, Email, UHID..."
                                        value={tempFilters.search}
                                        onChange={(e) => updateFilter("search", e.target.value)}
                                        className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/50 transition-all rounded-xl shadow-sm text-base px-4"
                                    />
                                </motion.div>

                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }} className="grid grid-cols-2 gap-6">
                                    {/* Gender */}
                                    <div className="space-y-2.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            Gender
                                        </Label>
                                        <Select value={tempFilters.gender} onValueChange={(val) => updateFilter("gender", val)}>
                                            <SelectTrigger className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-xl shadow-sm">
                                                <SelectValue placeholder="All Genders" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Genders</SelectItem>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Blood Group */}
                                    <div className="space-y-2.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            Blood Group
                                        </Label>
                                        <SearchableSelect
                                            options={bloodGroupOptions}
                                            value={tempFilters.bloodGroup === "all" ? "" : tempFilters.bloodGroup}
                                            onChange={(val) => updateFilter("bloodGroup", val || "all")}
                                            placeholder="All Groups"
                                            className="w-full"
                                        />
                                    </div>

                                    {/* State */}
                                    <div className="space-y-2.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            State
                                        </Label>
                                        <SearchableSelect
                                            options={stateOptions}
                                            value={tempFilters.state === "all" ? "" : tempFilters.state}
                                            onChange={(val) => updateFilter("state", val || "all")}
                                            placeholder="All States"
                                            className="w-full"
                                        />
                                    </div>

                                    {/* City */}
                                    <div className="space-y-2.5 col-span-2 sm:col-span-1">
                                        <Label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            City
                                        </Label>
                                        <SearchableSelect
                                            options={filterCityOptions}
                                            value={tempFilters.city === "all" ? "" : tempFilters.city}
                                            onChange={(val) => updateFilter("city", val || "all")}
                                            placeholder="All Cities"
                                            disabled={!tempFilters.state || tempFilters.state === "all"}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Walk-in Status */}
                                    <div className="space-y-2.5 col-span-2">
                                        <Label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            Walk-in Status
                                        </Label>
                                        <Select value={tempFilters.walkIn} onValueChange={(val) => updateFilter("walkIn", val)}>
                                            <SelectTrigger className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-xl shadow-sm">
                                                <SelectValue placeholder="All Types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="yes">Walk-in Only</SelectItem>
                                                <SelectItem value="no">Registered Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        <SheetFooter className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky bottom-0 z-10 backdrop-blur-md flex-row justify-end space-x-3 mt-auto">
                            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.4 }} className="flex justify-end space-x-3 w-full">
                                <Button
                                    variant="outline"
                                    onClick={resetFilters}
                                    className="rounded-xl h-11 px-6 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Reset
                                </Button>
                                <Button
                                    onClick={applyFilters}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl h-11 px-8 shadow-lg shadow-indigo-500/20"
                                >
                                    Apply Filters
                                </Button>
                            </motion.div>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Patient Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 text-center">
                            <div className="h-24 w-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6">
                                <span className="h-10 w-10 block rounded-full border-4 border-indigo-400 border-t-transparent animate-spin" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200">Loading patients...</h3>
                            <p className="text-muted-foreground mt-2">Connecting to secure medical records.</p>
                        </div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 text-center">
                            <div className="h-24 w-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6 animate-pulse">
                                <UserIcon className="h-10 w-10 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200">No patients found</h3>
                            <p className="text-muted-foreground mt-2">Try adjusting your search or add a new patient.</p>
                        </div>
                    ) : null}

                    <AnimatePresence>
                        {filteredPatients.map((patient, index) => (
                            <motion.div
                                key={patient.patientid || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="group relative overflow-hidden transition-all duration-500 border border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1.5 rounded-[1.5rem] h-full flex flex-col">
                                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <CardHeader className="flex flex-row items-start gap-4 pb-0 relative z-10 pt-6 px-6">
                                        <div className="relative">
                                            <Avatar className="h-14 w-14 border-[3px] border-white dark:border-slate-800 shadow-sm bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-slate-800 dark:to-slate-700">
                                                <AvatarFallback className="text-indigo-700 dark:text-indigo-300 text-xl font-black font-sans">
                                                    {patient.patientname?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-[3px] shadow-sm">
                                                <div className={cn("h-3 w-3 rounded-full border-2 border-white dark:border-slate-900", patient.isactive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 overflow-hidden flex-1 min-w-0 pt-0.5">
                                            <CardTitle className="truncate text-[1.1rem] font-extrabold text-indigo-700 dark:text-indigo-400 leading-tight transition-colors">
                                                {patient.patientname}
                                            </CardTitle>
                                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                                                {(!patient.patient_no || patient.patient_no === "PENDING" || patient.patient_no.startsWith('P-')) ? (
                                                    <Badge variant="secondary" className="font-sans font-bold text-[9px] uppercase tracking-wider px-2 h-5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 rounded-md">
                                                        No UHID
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="font-mono text-[10px] px-2 h-5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md">
                                                        {patient.patient_no}
                                                    </Badge>
                                                )}

                                                {patient.blood_group_id && (
                                                    <Badge variant="outline" className="text-[10px] px-2 h-5 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 rounded-md shadow-sm">
                                                        <Droplet className="h-2.5 w-2.5 mr-1 fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400" />
                                                        {bloodGroups.find(b => b.bloodgroupid === patient.blood_group_id?.toString())?.bloodgroupname}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4 pt-5 pb-6 px-6 flex-1 flex flex-col relative z-10">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl flex flex-col gap-1.5 text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                                    <span className="font-bold uppercase tracking-widest text-[9px] text-slate-500 dark:text-slate-400">Demographics</span>
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                    {patient.gender?.charAt(0)}, {calculateAge(patient.dob || "")}y
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl flex flex-col gap-1.5 text-slate-600 dark:text-slate-400 overflow-hidden">
                                                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                                    <Phone className="h-3 w-3" />
                                                    <span className="font-bold uppercase tracking-widest text-[9px] text-slate-500 dark:text-slate-400">Contact</span>
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                                                    {patient.phone_number || "N/A"}
                                                </span>
                                            </div>
                                        </div>

                                        {patient.address && (
                                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/20 p-3.5 rounded-2xl">
                                                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                                                <span className="line-clamp-2 leading-relaxed font-semibold">{patient.address}</span>
                                            </div>
                                        )}

                                        <div className="flex-1" />

                                        <div className="pt-2 flex gap-2">
                                            <Button
                                                variant="secondary"
                                                className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-0 font-bold transition-all duration-300 h-11"
                                                onClick={(e) => { e.stopPropagation(); setViewingPatient(patient); }}
                                            >
                                                <Eye className="h-4 w-4 mr-2" /> View Profile
                                            </Button>
                                            <Button
                                                className="flex-shrink-0 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border border-indigo-100/50 dark:border-indigo-800/50 font-bold transition-all duration-300 h-11"
                                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(patient); }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* --- REGISTRATION / EDIT MODAL --- */}
                <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                    <DialogContent className="max-w-[800px] p-0 overflow-hidden border-0 shadow-2xl rounded-3xl bg-white dark:bg-slate-900">
                        <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800/60 flex items-start justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-20">
                            <div className="flex gap-4 items-center">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                                    {isEditMode ? <Pencil className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                                        {isEditMode ? "Update Patient Profile" : "Register New Patient"}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                        {isEditMode
                                            ? "Modify existing patient details below."
                                            : "Create a new patient record. UHID is auto-generated."
                                        }
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col h-[65vh]">
                            <ScrollArea className="flex-1 p-8">
                                <div className="space-y-8">
                                    {/* Section 1: Personal */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                                            <UserIcon className="h-5 w-5" />
                                            <h3 className="font-bold uppercase tracking-wider text-sm">Personal Information</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2 col-span-2 md:col-span-1">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Full Name <span className="text-red-500">*</span></Label>
                                                <Input {...control.register("full_name")} className={cn("h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500", errors.full_name && "border-red-500 bg-red-50 dark:bg-red-900/20")} placeholder="e.g. John Doe" />
                                                {errors.full_name && <span className="text-[10px] text-red-500 font-medium">{errors.full_name.message}</span>}
                                            </div>

                                            <div className="space-y-2 col-span-2 md:col-span-1 relative">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date of Birth <span className="text-red-500">*</span></Label>
                                                <Controller
                                                    control={control}
                                                    name="dob"
                                                    render={({ field }) => (
                                                        <DatePicker
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            placeholder="Select DOB"
                                                            className={cn("w-full", errors.dob && "border-red-500")}
                                                            maxDate={new Date().toISOString().split('T')[0]}
                                                        />
                                                    )}
                                                />
                                                {age !== "" && (
                                                    <div className="absolute right-0 top-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 mr-1">
                                                        Age: {age} {Number(age) < 18 && <span className="text-amber-600 ml-1">(MINOR)</span>}
                                                    </div>
                                                )}
                                                {errors.dob && <span className="text-[10px] text-red-500">{errors.dob.message}</span>}
                                            </div>

                                            <div className="space-y-2 col-span-1">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Gender <span className="text-red-500">*</span></Label>
                                                <Controller
                                                    control={control}
                                                    name="gender"
                                                    render={({ field }) => (
                                                        <CustomDropdown
                                                            options={genderOptions}
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            placeholder="Select Gender"
                                                            className={cn("h-11 rounded-xl bg-slate-50 dark:bg-slate-800", errors.gender && "border-red-500")}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2 col-span-1">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Blood Group</Label>
                                                <Controller
                                                    control={control}
                                                    name="blood_group_id"
                                                    render={({ field }) => (
                                                        <SearchableSelect
                                                            options={bloodGroupOptions}
                                                            value={field.value || ""}
                                                            onChange={field.onChange}
                                                            placeholder="Select Blood Group"
                                                            className="w-full"
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Contact */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                                            <MapPin className="h-5 w-5" />
                                            <h3 className="font-bold uppercase tracking-wider text-sm">Contact Details</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Phone Number</Label>
                                                <Input {...control.register("phone_number")} placeholder="10-digit mobile" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800" />
                                                {errors.phone_number && <span className="text-[10px] text-red-500">{errors.phone_number.message}</span>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Email Address</Label>
                                                <Input {...control.register("email")} placeholder="john@example.com" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800" />
                                                {errors.email && <span className="text-[10px] text-red-500">{errors.email.message}</span>}
                                            </div>

                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Street Address <span className="text-red-500">*</span></Label>
                                                <Input {...control.register("address")} className={cn("h-11 rounded-xl bg-slate-50 dark:bg-slate-800", errors.address && "border-red-500")} placeholder="House, Street, Area..." />
                                                {errors.address && <span className="text-[10px] text-red-500">{errors.address.message}</span>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">State</Label>
                                                <Controller
                                                    control={control}
                                                    name="state_id"
                                                    render={({ field }) => (
                                                        <SearchableSelect
                                                            options={stateOptions}
                                                            value={field.value || ""}
                                                            onChange={(val) => {
                                                                field.onChange(val);
                                                                setValue("city_id", "");
                                                            }}
                                                            placeholder="Select State"
                                                            className="w-full"
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">City</Label>
                                                <Controller
                                                    control={control}
                                                    name="city_id"
                                                    render={({ field }) => (
                                                        <SearchableSelect
                                                            options={cityOptions}
                                                            value={field.value || ""}
                                                            onChange={field.onChange}
                                                            placeholder={selectedState ? "Select City" : "Select State First"}
                                                            className="w-full"
                                                            disabled={!selectedState}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pincode <span className="text-red-500">*</span></Label>
                                                <Input {...control.register("pincode")} className={cn("h-11 rounded-xl bg-slate-50 dark:bg-slate-800", errors.pincode && "border-red-500")} maxLength={6} placeholder="000000" />
                                                {errors.pincode && <span className="text-[10px] text-red-500">{errors.pincode.message}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Emergency & Toggles */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                                            <AlertCircle className="h-5 w-5" />
                                            <h3 className="font-bold uppercase tracking-wider text-sm">Emergency Info</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Emergency Name</Label>
                                                <Input {...control.register("emergency_contact_name")} className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800" placeholder="Relative Name" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Emergency Phone</Label>
                                                <Input {...control.register("emergency_contact_number")} className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800" placeholder="Emergency Phone" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="walk-in" className="text-sm font-bold">Walk-in Patient</Label>
                                            <p className="text-xs text-muted-foreground">Mark this patient as an emergency/walk-in visit</p>
                                        </div>
                                        <Controller
                                            control={control}
                                            name="is_walk_in"
                                            render={({ field }) => (
                                                <Switch checked={field.value} onCheckedChange={field.onChange} id="walk-in" />
                                            )}
                                        />
                                    </div>

                                </div>
                            </ScrollArea>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-end gap-3 z-10 rounded-b-3xl">
                                <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="rounded-xl h-11 px-6 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-bold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 shadow-md shadow-indigo-500/20 font-bold transition-all">
                                    {isSubmitting ? "Saving..." : isEditMode ? "Update Changes" : "Register Patient"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* --- PREMIUM VIEW MODAL --- */}
                <Dialog open={!!viewingPatient} onOpenChange={(v) => !v && setViewingPatient(null)}>
                    <DialogContent className="max-w-[850px] w-full p-0 overflow-hidden border-0 shadow-2xl block select-none rounded-[2rem] bg-slate-50 dark:bg-slate-950 [&>button]:hidden flex flex-col max-h-[90vh]">
                        <DialogTitle className="sr-only">Patient Details</DialogTitle>
                        {viewingPatient && (
                            <div className="contents">
                                {/* Header */}
                                <div className="px-8 py-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30">
                                    <div className="flex items-center gap-5 w-full sm:w-auto">
                                        <div className="relative">
                                            <Avatar className="h-16 w-16 border-2 border-slate-100 dark:border-slate-800 shadow-sm bg-gradient-to-br from-indigo-100 to-blue-50 dark:from-slate-800 dark:to-slate-700">
                                                <AvatarFallback className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400">
                                                    {viewingPatient.patientname?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm">
                                                <div className={cn("h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900", viewingPatient.isactive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")} />
                                            </div>
                                        </div>

                                        <div className="overflow-hidden">
                                            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3 truncate">
                                                {viewingPatient.patientname}
                                                {(!viewingPatient.patient_no || viewingPatient.patient_no === "PENDING" || viewingPatient.patient_no.startsWith('P-')) ? (
                                                    <Badge variant="secondary" className="font-sans font-bold text-[10px] uppercase tracking-wider px-2 h-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                                                        No UHID
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="font-mono text-[11px] px-2.5 h-6 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md">
                                                        {viewingPatient.patient_no}
                                                    </Badge>
                                                )}
                                            </h2>
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                                                <span>{viewingPatient.gender}, {calculateAge(viewingPatient.dob || "")} yrs</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                <span className="flex items-center gap-1">
                                                    <Droplet className="h-3 w-3 text-rose-500" />
                                                    {bloodGroups.find(b => b.bloodgroupid === viewingPatient.blood_group_id?.toString())?.bloodgroupname || "N/A"}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
                                        <Button
                                            onClick={() => {
                                                setViewingPatient(null);
                                                handleOpenEdit(viewingPatient);
                                            }}
                                            variant="outline"
                                            className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all h-10 px-4 text-slate-700 dark:text-slate-300"
                                        >
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                            onClick={() => setViewingPatient(null)}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                    <div className="p-8 space-y-8">
                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Status</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1">
                                                    {viewingPatient.is_walk_in ? (
                                                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 font-bold text-[10px] px-2 h-5 rounded-md">Walk-in</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-[10px] px-2 h-5 rounded-md">Registered</Badge>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Added On</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                    {new Date(viewingPatient.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Date of Birth</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                    {viewingPatient.dob ? new Date(viewingPatient.dob).toLocaleDateString() : "-"}
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Emergency</span>
                                                {viewingPatient.emergency_contact_number ? (
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                                                        Active <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    </span>
                                                ) : (
                                                    <span className="font-bold text-slate-400 text-sm">N/A</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Details Sections */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Contact Info */}
                                            <div className="space-y-4">
                                                <h3 className="text-[11px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-2 pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
                                                    <Phone className="h-3.5 w-3.5" /> Contact Details
                                                </h3>
                                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Phone Number</span>
                                                        <div className="flex items-center gap-2">
                                                            <a href={`tel:${viewingPatient.phone_number}`} className="font-extrabold text-slate-800 dark:text-slate-200 text-[15px] hover:text-indigo-600 transition-colors">
                                                                {viewingPatient.phone_number || "Not provided"}
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Email Address</span>
                                                        <div className="flex items-center gap-2">
                                                            <a href={`mailto:${viewingPatient.email}`} className="font-bold text-slate-800 dark:text-slate-200 text-[15px] hover:text-indigo-600 transition-colors truncate">
                                                                {viewingPatient.email || "Not provided"}
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 pt-1">
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Address</span>
                                                        <p className="font-semibold text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                                                            {viewingPatient.address || "No street address provided"}
                                                            <br />
                                                            {(() => {
                                                                const city = formCityList.find(c => c.city_id.toString() === viewingPatient.city_id?.toString())?.city_name || viewingPatient.city_name;
                                                                const state = stateOptions.find(s => s.value === viewingPatient.state_id?.toString())?.label;
                                                                const parts = [];
                                                                if (city) parts.push(city);
                                                                if (state) parts.push(state);
                                                                if (viewingPatient.pincode) parts.push(viewingPatient.pincode);
                                                                return parts.length > 0 ? parts.join(", ") : "Location not specified";
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Medical & Emergency */}
                                            <div className="space-y-4">
                                                <h3 className="text-[11px] font-extrabold uppercase text-rose-600 dark:text-rose-400 tracking-widest flex items-center gap-2 pb-2 border-b border-rose-100 dark:border-rose-900/50">
                                                    <HeartPulse className="h-3.5 w-3.5" /> Emergency Contact
                                                </h3>
                                                <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-3xl p-6 space-y-5 shadow-sm h-[calc(100%-2.5rem)] flex items-center justify-center">
                                                    {viewingPatient.emergency_contact_name || viewingPatient.emergency_contact_number ? (
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] text-rose-500/70 dark:text-rose-400/70 font-bold uppercase tracking-widest">Full Name</span>
                                                                <p className="font-extrabold text-slate-800 dark:text-slate-200 text-lg">{viewingPatient.emergency_contact_name || "N/A"}</p>
                                                            </div>
                                                            {viewingPatient.emergency_contact_number && (
                                                                <a href={`tel:${viewingPatient.emergency_contact_number}`} className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-500 shadow-sm flex items-center justify-center hover:bg-rose-50 transition-colors border border-rose-100 dark:border-rose-900/50">
                                                                    <Phone className="h-5 w-5" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-60">
                                                            <AlertCircle className="h-8 w-8 text-rose-400/50" />
                                                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">No emergency contact<br />provided for this patient.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </RoleGuard>
    );
}

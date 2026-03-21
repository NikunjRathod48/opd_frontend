"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { api } from "@/lib/api";
import { Building2, Plus, MapPin, Phone, Activity, Clock, FileText, Check, Pencil } from "lucide-react";
import { useData } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

// Schema Validation
const hospitalSchema = z.object({
    hospital_name: z.string().min(1, "Hospital Name is required").max(250),
    hospital_code: z.string().min(1, "Hospital Code is required").max(50),
    hospital_group_id: z.coerce.number().int().positive("Hospital Group is required"),
    // type removed as per strict schema
    registration_no: z.string().optional(),
    license_no: z.string().optional(),
    gst_no: z.string().optional(),
    registration_validity_months: z.coerce.number().int().min(0).default(0),
    opening_date: z.string().min(1, "Opening Date is required"), // YYYY-MM-DD
    opening_time: z.string().optional(),
    closing_time: z.string().optional(),
    is_24by7: z.boolean().default(false),
    address: z.string().min(1, "Address is required").max(500),
    city_id: z.coerce.number().optional(),
    state_id: z.coerce.number().optional(),
    pincode: z.string().min(1, "Pincode is required").max(10),
    receptionist_contact: z.string()
        .length(10, "Receptionist Contact must be exactly 10 digits")
        .regex(/^\d+$/, "Receptionist Contact must be numeric"),
    contact_phone: z.string()
        .optional()
        .refine((val) => !val || (val.length === 10 && /^\d+$/.test(val)), "Official Phone must be exactly 10 digits and numeric"),
    contact_email: z.string().email("Invalid email address").optional().or(z.literal('')),
    description: z.string().optional(),
});

type HospitalFormValues = z.infer<typeof hospitalSchema>;

interface AddHospitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialGroupId?: number;
    initialData?: any; // Hospital Object
}

export function AddHospitalModal({ isOpen, onClose, onSuccess, initialGroupId, initialData }: AddHospitalModalProps) {
    const { addToast } = useToast();
    const { hospitalGroups } = useData();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Master Data State
    const [states, setStates] = useState<{ label: string; value: string }[]>([]);
    const [cities, setCities] = useState<{ label: string; value: string }[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const isEditing = !!initialData;

    const form = useForm<HospitalFormValues>({
        resolver: zodResolver(hospitalSchema) as any,
        defaultValues: {
            hospital_group_id: initialGroupId,
            is_24by7: false,
            opening_time: "09:00",
            closing_time: "18:00",
            registration_validity_months: 0,
            ...initialData // Spread initial data to overwrite defaults
        }
    });

    // Reset form when opening with new data
    // Reset form when opening with new data
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // If editing, reset form with initialData
                const formattedDate = initialData.opening_date ? new Date(initialData.opening_date).toISOString().split('T')[0] : "";

                form.reset({
                    ...initialData,
                    hospital_group_id: initialData.hospital_group_id ? Number(initialData.hospital_group_id) : undefined,
                    city_id: initialData.city_id ? Number(initialData.city_id) : (initialData.city?.id ? Number(initialData.city.id) : undefined),
                    state_id: initialData.state_id ? Number(initialData.state_id) : (initialData.state?.id ? Number(initialData.state.id) : undefined),
                    registration_validity_months: initialData.registration_validity_months ? Number(initialData.registration_validity_months) : 0,
                    opening_date: formattedDate,
                });
            } else {
                // Determine default group ID
                let defaultGroupId = initialGroupId;
                if (!defaultGroupId && user?.role === "GroupAdmin" && user.hospitalgroupid) {
                    defaultGroupId = Number(user.hospitalgroupid);
                }

                // If adding, reset to defaults
                form.reset({
                    hospital_group_id: defaultGroupId,
                    is_24by7: false,
                    opening_time: "09:00",
                    closing_time: "18:00",
                    registration_validity_months: 0,
                    opening_date: new Date().toISOString().split('T')[0] // Default to today
                });
            }
        }
    }, [isOpen, initialData, initialGroupId, form, user]);






    // Fetch States on Open
    useEffect(() => {
        if (isOpen) {
            fetchStates();
        }
    }, [isOpen]);

    // Fetch Cities if state_id is preset (Edit Mode)
    useEffect(() => {
        const stateId = form.getValues("state_id");
        if (stateId && isOpen) {
            fetchCities(String(stateId));
        }
    }, [isOpen, form.getValues("state_id")]);


    const fetchStates = async () => {
        setLoadingStates(true);
        try {
            const data = await api.get<any[]>('/master/states');
            // console.log("Fetched states:", data);
            setStates(data
                .filter(s => s && s.state_id && s.state_name)
                .map(s => ({ label: s.state_name, value: String(s.state_id) }))
            );
        } catch (err) {
            console.error("Failed to fetch states", err);
            setStates([]);
        } finally {
            setLoadingStates(false);
        }
    };

    const fetchCities = async (stateId: string) => {
        setLoadingCities(true);
        try {
            const data = await api.get<any[]>(`/master/cities/${stateId}`);
            // console.log("Fetched cities:", data);
            setCities(data
                .filter(c => c && c.city_id && c.city_name)
                .map(c => ({ label: c.city_name, value: String(c.city_id) }))
            );
        } catch (err) {
            console.error("Failed to fetch cities", err);
            setCities([]);
        } finally {
            setLoadingCities(false);
        }
    };

    // Watch for state changes to load cities
    const selectedStateId = form.watch("state_id");
    useEffect(() => {
        if (selectedStateId) {
            fetchCities(String(selectedStateId));
        } else {
            setCities([]);
        }
    }, [selectedStateId]);


    const onSubmit: SubmitHandler<HospitalFormValues> = async (data) => {
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/hospitals/${initialData.hospital_id}`, data);
                addToast("Hospital branch updated successfully", "success");
            } else {
                await api.post("/hospitals", data);
                addToast("Hospital branch created successfully", "success");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            addToast(error.message || `Failed to ${isEditing ? 'update' : 'create'} hospital`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter hospital groups for dropdown
    const groupOptions = hospitalGroups.map(g => ({
        label: g.groupname,
        value: g.hospitalgroupid.toString()
    }));

    const isGroupLocked = user?.role === "GroupAdmin" || !!initialGroupId;

    // 24x7 Logic
    const is24by7 = form.watch("is_24by7");
    useEffect(() => {
        if (is24by7) {
            form.setValue("opening_time", "00:00");
            form.setValue("closing_time", "23:59");
        }
    }, [is24by7, form]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[850px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl block select-none rounded-[2.5rem] [&>button]:hidden">

                {/* Header */}
                <div className="h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute top-4 right-4 z-10">
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md" onClick={onClose}>
                            <Plus className="h-5 w-5 rotate-45" />
                        </Button>
                    </div>

                    {/* Abstract shapes */}
                    <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                    <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl"></div>

                    <div className="absolute bottom-4 left-6 flex items-center gap-3 z-10">
                        <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                            {isEditing ? <Pencil className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-white tracking-tight">
                                {isEditing ? "Edit Branch Details" : "New Hospital Branch"}
                            </DialogTitle>
                            <DialogDescription className="text-blue-100/80 text-xs font-medium">
                                {isEditing ? "Update operational details." : "onboard a new facility."}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden h-[calc(90vh-6rem)]">
                    <div className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            {/* Left Column: Identity & Location */}
                            <div className="space-y-8">
                                {/* Section 1: Identity */}
                                <div className="space-y-5">
                                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5 text-primary" /> Core Identity
                                    </h3>
                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Hospital Name <span className="text-red-500">*</span></Label>
                                            <Input {...form.register("hospital_name")} placeholder="e.g. City General Hospital" className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10" />
                                            {form.formState.errors.hospital_name && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.hospital_name.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Branch Code <span className="text-red-500">*</span></Label>
                                            <Input {...form.register("hospital_code")} placeholder="e.g. CGH-01" className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10 font-mono" />
                                            {form.formState.errors.hospital_code && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.hospital_code.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Hospital Group <span className="text-red-500">*</span></Label>
                                            <SearchableSelect
                                                options={groupOptions}
                                                value={form.watch("hospital_group_id")?.toString() || ""}
                                                onChange={(val) => form.setValue("hospital_group_id", Number(val))}
                                                placeholder="Select Group"
                                                className="w-full rounded-xl h-10"
                                                disabled={isGroupLocked}
                                            />
                                            {form.formState.errors.hospital_group_id && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.hospital_group_id.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Opening Date <span className="text-red-500">*</span></Label>
                                            <DatePicker
                                                value={form.watch("opening_date")}
                                                onChange={(date) => form.setValue("opening_date", date)}
                                                placeholder="Date"
                                                className="w-full rounded-xl h-10"
                                            />
                                            {form.formState.errors.opening_date && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.opening_date.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Description</Label>
                                            <Input {...form.register("description")} placeholder="Brief description" className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Location */}
                                <div className="space-y-5">
                                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-primary" /> Location
                                    </h3>
                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Address <span className="text-red-500">*</span></Label>
                                            <Input {...form.register("address")} placeholder="Street, Area" className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10" />
                                            {form.formState.errors.address && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.address.message}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">State</Label>
                                                <SearchableSelect
                                                    options={states}
                                                    value={form.watch("state_id")?.toString() || ""}
                                                    onChange={(val) => {
                                                        form.setValue("state_id", Number(val));
                                                        form.setValue("city_id", undefined); // Reset city
                                                    }}
                                                    placeholder={loadingStates ? "..." : "Select State"}
                                                    className="w-full rounded-xl h-10"
                                                    emptyMessage="No states"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">City</Label>
                                                <SearchableSelect
                                                    options={cities}
                                                    value={form.watch("city_id")?.toString() || ""}
                                                    onChange={(val) => form.setValue("city_id", Number(val))}
                                                    placeholder={loadingCities ? "..." : "Select City"}
                                                    className="w-full rounded-xl h-10"
                                                    emptyMessage={selectedStateId ? "No cities" : "Select State"}
                                                    disabled={!selectedStateId}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Pincode <span className="text-red-500">*</span></Label>
                                            <Input {...form.register("pincode")} placeholder="e.g. 110001" className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10 font-mono" />
                                            {form.formState.errors.pincode && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.pincode.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Contact, Ops, Legal */}
                            <div className="space-y-8">
                                {/* Section 3: Contact */}
                                <div className="space-y-5">
                                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-primary" /> Contact Information
                                    </h3>
                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Receptionist Contact <span className="text-red-500">*</span></Label>
                                            <Input
                                                {...form.register("receptionist_contact")}
                                                placeholder="+91..."
                                                className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10"
                                                maxLength={10}
                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "")}
                                            />
                                            {form.formState.errors.receptionist_contact && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.receptionist_contact.message}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Official Phone</Label>
                                                <Input
                                                    {...form.register("contact_phone")}
                                                    placeholder="Official"
                                                    className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10"
                                                    maxLength={10}
                                                    onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "")}
                                                />
                                                {form.formState.errors.contact_phone && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.contact_phone.message}</p>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Official Email</Label>
                                                <Input {...form.register("contact_email")} placeholder="Official" className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10" />
                                                {form.formState.errors.contact_email && <p className="text-xs text-red-500 font-medium ml-1">{form.formState.errors.contact_email.message}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Operations */}
                                <div className="space-y-5">
                                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-primary" /> Operational Details
                                    </h3>
                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className={cn("text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1", is24by7 && "opacity-50")}>Opens At</Label>
                                                <TimePicker
                                                    value={form.watch("opening_time") || "09:00"}
                                                    onChange={(val) => form.setValue("opening_time", val)}
                                                    disabled={is24by7}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className={cn("text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1", is24by7 && "opacity-50")}>Closes At</Label>
                                                <TimePicker
                                                    value={form.watch("closing_time") || "18:00"}
                                                    onChange={(val) => form.setValue("closing_time", val)}
                                                    disabled={is24by7}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            <label className={cn(
                                                "relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                                                is24by7
                                                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                                    : "border-border/50 bg-background/50 hover:bg-muted/50 hover:border-border"
                                            )}>
                                                <div className={cn(
                                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                    is24by7 ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30 group-hover:border-primary/50"
                                                )}>
                                                    {is24by7 && <Check className="h-3 w-3" strokeWidth={3} />}
                                                </div>
                                                <input type="checkbox" {...form.register("is_24by7")} className="sr-only" />
                                                <div className="flex-1">
                                                    <div className={cn("font-bold text-sm", is24by7 ? "text-emerald-700 dark:text-emerald-400" : "text-foreground")}>Operates 24x7</div>
                                                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Emergency services available round the clock</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 5: Legal */}
                                <div className="space-y-5">
                                    <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5 text-primary" /> Compliance & Legal
                                    </h3>
                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Reg No.</Label>
                                            <Input {...form.register("registration_no")} className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10 font-mono" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">License No.</Label>
                                            <Input {...form.register("license_no")} className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10 font-mono" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">GST No.</Label>
                                            <Input {...form.register("gst_no")} className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10 font-mono" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">Validity (Months)</Label>
                                            <Input type="number" {...form.register("registration_validity_months")} className="bg-background/50 border-border/40 focus:bg-background transition-all rounded-xl h-10" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0 flex gap-3 justify-end items-center z-20">
                        <Button type="button" variant="outline" size="lg" onClick={onClose} className="px-6 rounded-xl border-border/50 hover:bg-muted/50 transition-colors h-11 font-medium text-muted-foreground hover:text-foreground">
                            Cancel
                        </Button>
                        <Button type="submit" size="lg" disabled={isSubmitting || !form.formState.isDirty} className="px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 transition-all text-white font-semibold h-11 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                            {isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Branch")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

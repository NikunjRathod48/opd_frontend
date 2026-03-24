"use client";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import {
    User as UserIcon, Phone, Mail, Lock, Building,
    Stethoscope, Loader2, CheckCircle2, ChevronRight, GraduationCap, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/data-context";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageUpload } from "@/components/ui/image-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const phoneRegex = /^\d{10}$/;

const baseSchema = z.object({
    full_name: z.string().min(1, "Full name required"),
    email: z.string().email("Invalid email format").min(1, "Email required"),
    phone_number: z.string().regex(phoneRegex, "Must be exactly 10 digits"),
    password: z.string().optional(),
    avatar: z.string().optional(),
    is_active: z.boolean().default(true),
});

export const userFormSchema = z.discriminatedUnion("role_name", [
    baseSchema.extend({
        role_name: z.literal("Super Admin"),
    }),
    baseSchema.extend({
        role_name: z.literal("Group Admin"),
        hospital_group_id: z.string().min(1, "Group required"),
    }),
    baseSchema.extend({
        role_name: z.literal("Hospital Admin"),
        hospital_id: z.string().min(1, "Hospital required"),
    }),
    baseSchema.extend({
        role_name: z.literal("Receptionist"),
        hospital_id: z.string().min(1, "Hospital required"),
    }),
    baseSchema.extend({
        role_name: z.literal("Doctor"),
        hospital_id: z.string().min(1, "Hospital required"),
        department_id: z.string().min(1, "Department required"),
        specialization_id: z.string().min(1, "Specialization required"),
        gender: z.enum(["Male", "Female", "Other"]),
        qualification: z.string().min(1, "Qualification required"),
        medical_license_no: z.string().min(1, "License no required"),
        experience_years: z.coerce.number().min(0, "Invalid experience"),
        consultation_fees: z.coerce.number().min(0, "Invalid fees"),
    }),
    baseSchema.extend({
        role_name: z.literal("Patient"),
        gender: z.enum(["Male", "Female", "Other"]),
        dob: z.string().min(1, "DOB required"),
        blood_group_id: z.string().optional(),
        address: z.string().min(1, "Address required"),
        emergency_contact_name: z.string().min(1, "Emergency contact name required"),
        emergency_contact_number: z.string().regex(phoneRegex, "10 digit number required"),
    }),
]);

export type UserFormValues = z.infer<typeof userFormSchema>;

// ─── Custom Form Field Wrapper ───────────────────────────────────────────────
function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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

// ─── User Form Component ──────────────────────────────────────────────────────
interface UserFormProps {
    initialValues?: Partial<UserFormValues>;
    onSubmit: (data: UserFormValues, file: File | string | null) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
    mode?: "add" | "edit";
}

export function UserForm({ initialValues, onSubmit, onCancel, isSubmitting, mode = "add" }: UserFormProps) {
    const { hospitals, hospitalGroups, specializations, bloodGroups } = useData();
    const [profileImage, setProfileImage] = useState<File | string | null>(initialValues?.avatar as any || null);
    const [showPassword, setShowPassword] = useState(false);
    
    // Dynamic lists that populate on selection
    const [hospitalDepts, setHospitalDepts] = useState<{ id: string; name: string }[]>([]);
    
    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema) as any,
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            password: "",
            role_name: "Receptionist",
            is_active: true,
            // defaults will be populated below depending on selected role
            ...(initialValues as any)
        },
    });

    const selectedRole = form.watch("role_name");
    const selectedHospitalId = form.watch("hospital_id" as any);

    useEffect(() => {
        if (!selectedHospitalId) {
            setHospitalDepts([]);
            return;
        }
        const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
        if (!token) return;
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/doctors/departments/${selectedHospitalId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
            setHospitalDepts(data.map((d: any) => ({
                id: String(d.department_id),
                name: d.departments_master?.department_name || "Unknown"
            })));
        })
        .catch(() => {});
    }, [selectedHospitalId]);

    const handleFormSubmit = async (data: UserFormValues) => {
        if (mode === "add" && !data.password) {
            form.setError("password", { message: "Password is required for new users" });
            return;
        }
        await onSubmit(data, profileImage);
    };

    return (
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0 h-full doctor-root">
            <ScrollArea className="h-[60vh] sm:h-[65vh]">
                <div className="px-7 py-6 space-y-6">
                    {/* AVATAR UPLOAD */}
                    <div className="flex flex-col items-center gap-2">
                        <ImageUpload value={profileImage} onChange={setProfileImage} variant="avatar" showActions label="" />
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Profile Photo</p>
                    </div>

                    {/* BASIC ROLE SELECTION IF IN ADD MODE */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <FormField label="User Role" required>
                                <Select 
                                    disabled={mode === "edit"} 
                                    value={form.watch("role_name")} 
                                    onValueChange={(v) => {
                                        form.setValue("role_name", v as any);
                                        // Clear out role specific fields when role changes
                                        if (v === "Doctor") {
                                            form.setValue("gender" as any, "Male");
                                            form.setValue("experience_years" as any, 0);
                                            form.setValue("consultation_fees" as any, 0);
                                        } else if (v === "Patient") {
                                            form.setValue("gender" as any, "Male");
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Super Admin">Super Admin</SelectItem>
                                        <SelectItem value="Group Admin">Group Admin</SelectItem>
                                        <SelectItem value="Hospital Admin">Hospital Admin</SelectItem>
                                        <SelectItem value="Receptionist">Receptionist</SelectItem>
                                        <SelectItem value="Doctor">Doctor</SelectItem>
                                        <SelectItem value="Patient">Patient</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </div>
                    </div>

                    <div className="w-full h-px bg-border/40 my-4" />

                    {/* BASE DETAILS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <FormField label="Full Name" required error={form.formState.errors.full_name?.message}>
                                <div className="relative group">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                    <input {...form.register("full_name")} placeholder="Full Name" className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                                </div>
                            </FormField>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <FormField label="Email" required error={form.formState.errors.email?.message}>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                    <input {...form.register("email")} type="email" placeholder="user@example.com" className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                                </div>
                            </FormField>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <FormField label="Phone" required error={form.formState.errors.phone_number?.message}>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                    <input {...form.register("phone_number")} type="tel" maxLength={10} placeholder="9876543210" onInput={(e: any) => e.currentTarget.value = e.currentTarget.value.replace(/\\D/g, "")} className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                                </div>
                            </FormField>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <FormField label={`Password${mode === "edit" ? " (leave blank to keep)" : ""}`} required={mode === "add"} error={form.formState.errors.password?.message}>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-violet-500 transition-colors pointer-events-none" />
                                    <input {...form.register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full h-10 pl-9 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all" />
                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-violet-500 transition-colors">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </FormField>
                        </div>
                    </div>

                    <div className="w-full h-px bg-border/40 my-4" />

                    {/* ROLE SPECIFIC FIELDS */}
                    <div className="grid grid-cols-2 gap-4">
                        {(selectedRole === "Group Admin") && (
                            <div className="col-span-2">
                                <FormField label="Hospital Group" required error={(form.formState.errors as any).hospital_group_id?.message}>
                                    <SearchableSelect options={hospitalGroups.map(hg => ({ label: hg.groupname || "", value: String(hg.hospitalgroupid) }))} value={form.watch("hospital_group_id" as any)} onChange={v => form.setValue("hospital_group_id" as any, v)} placeholder="Select group" className="w-full" />
                                </FormField>
                            </div>
                        )}

                        {["Hospital Admin", "Receptionist", "Doctor"].includes(selectedRole) && (
                            <div className="col-span-2 sm:col-span-1">
                                <FormField label="Hospital" required error={(form.formState.errors as any).hospital_id?.message}>
                                    <SearchableSelect options={hospitals.map(h => ({ label: h.hospitalname || "", value: String(h.hospitalid) }))} value={form.watch("hospital_id" as any)} onChange={v => form.setValue("hospital_id" as any, v)} placeholder="Select hospital" className="w-full" />
                                </FormField>
                            </div>
                        )}

                        {(selectedRole === "Patient" || selectedRole === "Doctor") && (
                            <div className="col-span-2 sm:col-span-1">
                                <FormField label="Gender" required error={(form.formState.errors as any).gender?.message}>
                                    <Select value={form.watch("gender" as any)} onValueChange={v => form.setValue("gender" as any, v)}>
                                        <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                                    </Select>
                                </FormField>
                            </div>
                        )}

                        {selectedRole === "Doctor" && (
                            <>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Department" required error={(form.formState.errors as any).department_id?.message}>
                                        <SearchableSelect disabled={!selectedHospitalId} options={hospitalDepts.map(d => ({ label: d.name, value: d.id }))} value={form.watch("department_id" as any)} onChange={v => form.setValue("department_id" as any, v)} placeholder={hospitalDepts.length ? "Select dept" : "Select hospital first"} className="w-full" />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Specialization" required error={(form.formState.errors as any).specialization_id?.message}>
                                        <SearchableSelect options={specializations.map(s => ({ label: s.specializationname || "", value: String(s.specializationid) }))} value={form.watch("specialization_id" as any)} onChange={v => form.setValue("specialization_id" as any, v)} placeholder="Select specialization" className="w-full" />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="License No." required error={(form.formState.errors as any).medical_license_no?.message}>
                                        <input {...form.register("medical_license_no" as any)} placeholder="REG-XX" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Qualification" required error={(form.formState.errors as any).qualification?.message}>
                                        <input {...form.register("qualification" as any)} placeholder="MBBS, MD" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Experience (Yrs)" error={(form.formState.errors as any).experience_years?.message}>
                                        <input {...form.register("experience_years" as any)} type="number" min="0" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Consultation Fees (₹)" error={(form.formState.errors as any).consultation_fees?.message}>
                                        <input {...form.register("consultation_fees" as any)} type="number" min="0" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </FormField>
                                </div>
                            </>
                        )}

                        {selectedRole === "Patient" && (
                            <>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Date of Birth" required error={(form.formState.errors as any).dob?.message}>
                                        <DatePicker 
                                            value={form.watch("dob" as any)} 
                                            onChange={v => form.setValue("dob" as any, v)} 
                                            placeholder="Select DOB" 
                                            className="h-10 rounded-xl bg-background"
                                        />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Blood Group" error={(form.formState.errors as any).blood_group_id?.message}>
                                        <Select value={form.watch("blood_group_id" as any) || ""} onValueChange={v => form.setValue("blood_group_id" as any, v)}>
                                            <SelectTrigger className="h-10 rounded-xl bg-background">
                                                <SelectValue placeholder="Select blood group" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bloodGroups.map(bg => (
                                                    <SelectItem key={bg.bloodgroupid} value={String(bg.bloodgroupid)}>
                                                        {bg.bloodgroupname}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormField>
                                </div>
                                <div className="col-span-2">
                                    <FormField label="Address" required error={(form.formState.errors as any).address?.message}>
                                        <input {...form.register("address" as any)} placeholder="House/Street etc" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Emergency Contact Name" required error={(form.formState.errors as any).emergency_contact_name?.message}>
                                        <input {...form.register("emergency_contact_name" as any)} placeholder="Name" className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </FormField>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <FormField label="Emergency Phone" required error={(form.formState.errors as any).emergency_contact_number?.message}>
                                        <input {...form.register("emergency_contact_number" as any)} maxLength={10} placeholder="9876543210" onInput={(e: any) => e.currentTarget.value = e.currentTarget.value.replace(/\\D/g, "")} className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </FormField>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </ScrollArea>

            <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" className="w-full sm:w-auto rounded-xl border-border/60" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.3)] gap-2">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {mode === "add" ? "Register User" : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}

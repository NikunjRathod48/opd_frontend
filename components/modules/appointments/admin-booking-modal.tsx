"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import {
    Loader2, Calendar as CalendarIcon, Clock, ChevronRight,
    CheckCircle2, Stethoscope, X, ArrowLeft, Sparkles, User2,
    Search, Phone, Hash, UserCircle2, AlertCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    isSlotDisabled,
    findFirstAvailableSlotIndex,
    formatTime12Hour,
    type DoctorAvailability,
} from "@/lib/appointment-utils";

interface AdminBookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const STEPS = ["Patient", "Doctor", "Date", "Slot", "Confirm"];

export function AdminBookingModal({ open, onOpenChange }: AdminBookingModalProps) {
    const { doctors, patients, addAppointment, fetchAvailableSlots } = useData();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [step, setStep] = useState(0);
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedSlot, setSelectedSlot] = useState<{ time: string; capacity: number; booked: number } | null>(null);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [existingAppointment, setExistingAppointment] = useState<{ time: string; status: string } | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derive hospital id from the logged-in admin/receptionist
    const effectiveHospitalId = user?.hospitalid ? String(user.hospitalid) : undefined;

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setStep(0);
            setPatientSearch("");
            setSelectedPatient(null);
            setSelectedDoctor(null);
            setSelectedDate("");
            setSelectedSlot(null);
            setAvailableSlots([]);
            setExistingAppointment(null);
        }
    }, [open]);

    // Fetch slots when reaching step 3 (Slot)
    useEffect(() => {
        if (selectedDoctor && selectedDate && selectedPatient && step === 3) {
            setLoadingSlots(true);
            setExistingAppointment(null);
            setSelectedSlot(null);
            fetchAvailableSlots(selectedDoctor, selectedDate, selectedPatient)
                .then(result => {
                    setAvailableSlots(result.slots);
                    setExistingAppointment(result.existingAppointment);
                })
                .catch(() => addToast("Failed to load slots.", "error"))
                .finally(() => setLoadingSlots(false));
        }
    }, [selectedDoctor, selectedDate, selectedPatient, step]);

    // Filtered patients (by hospital if applicable, plus search)
    const filteredPatients = useMemo(() => {
        const q = patientSearch.trim().toLowerCase();
        return patients.filter(p => {
            if (!q) return true;
            return (
                p.patientname?.toLowerCase().includes(q) ||
                p.patient_no?.toLowerCase().includes(q) ||
                p.contact?.toLowerCase().includes(q) ||
                p.phone_number?.toLowerCase().includes(q)
            );
        });
    }, [patients, patientSearch]);

    // Filtered doctors (hospital-scoped)
    const filteredDoctors = useMemo(() => {
        return doctors.filter(d => {
            const hospitalMatch = !effectiveHospitalId || String(d.hospitalid) === effectiveHospitalId;
            return d.isactive && hospitalMatch;
        });
    }, [doctors, effectiveHospitalId]);

    const activePatient = patients.find(p => p.patientid === selectedPatient);
    const activeDoctor = doctors.find(d => d.doctorid === selectedDoctor);

    const canProceed =
        (step === 0 && !!selectedPatient) ||
        (step === 1 && !!selectedDoctor) ||
        (step === 2 && !!selectedDate) ||
        (step === 3 && !!selectedSlot && !existingAppointment) ||
        step === 4;

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handleBack = () => step === 0 ? onOpenChange(false) : setStep(s => s - 1);

    const handleConfirm = async () => {
        if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedSlot) return;
        setIsSubmitting(true);
        try {
            await addAppointment({
                hospitalid: activeDoctor?.hospitalid,
                patientid: selectedPatient,
                doctorid: selectedDoctor,
                date: selectedDate,
                time: selectedSlot.time,
                type: "Consultation",
            });
            addToast("Appointment scheduled successfully!", "success");
            onOpenChange(false);
        } catch (err: any) {
            addToast(err.message || "Failed to schedule appointment", "error");
            // Refresh slots after failure
            fetchAvailableSlots(selectedDoctor, selectedDate, selectedPatient)
                .then(result => {
                    setAvailableSlots(result.slots);
                    setExistingAppointment(result.existingAppointment);
                })
                .catch(() => {});
            setSelectedSlot(null);
            setStep(3);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    // ── Doctor availability window (derived from activeDoctor schedule) ─────
    // The backend slot API already respects this, but we apply it client-side
    // too so that any race conditions or stale data are caught in the UI.
    const doctorAvailability: DoctorAvailability | undefined = useMemo(() => {
        const schedule = (activeDoctor as any)?.schedule;
        if (!schedule || !Array.isArray(schedule)) return undefined;
        // Find today's (or selected date's) schedule entry
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const selectedDayName = selectedDate
            ? dayNames[new Date(selectedDate + "T00:00:00").getDay()]
            : undefined;
        const entry = selectedDayName
            ? schedule.find((s: any) => s.day === selectedDayName && s.is_available)
            : undefined;
        if (!entry) return undefined;
        return { start: entry.start_time, end: entry.end_time };
    }, [activeDoctor, selectedDate]);

    // ── Auto-scroll ref for first available slot ─────────────────────────────
    const firstAvailableRef = useRef<HTMLButtonElement | null>(null);

    const scrollToFirstAvailable = useCallback(() => {
        if (firstAvailableRef.current) {
            firstAvailableRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    }, []);

    // Auto-scroll when slots load
    useEffect(() => {
        if (availableSlots.length > 0 && !loadingSlots) {
            const timer = setTimeout(scrollToFirstAvailable, 120);
            return () => clearTimeout(timer);
        }
    }, [availableSlots, loadingSlots, scrollToFirstAvailable]);

    const firstAvailableIdx = useMemo(
        () => findFirstAvailableSlotIndex(availableSlots, selectedDate, doctorAvailability),
        [availableSlots, selectedDate, doctorAvailability]
    );

    const getInitials = (name?: string) =>
        name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl w-[96vw] p-0 gap-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-background [&>button]:hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>Schedule Appointment</DialogTitle>
                    <DialogDescription>Book an appointment for a patient.</DialogDescription>
                </DialogHeader>

                {/* Progress bar */}
                <div className="relative h-1.5 w-full bg-muted overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all duration-700 ease-out"
                        style={{ width: `${((step + 1) / 5) * 100}%` }}
                    />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight">Schedule Appointment</h2>
                            <p className="text-xs text-muted-foreground">Step {step + 1} of 5 — {STEPS[step]}</p>
                        </div>
                    </div>

                    {/* Step Pills */}
                    <div className="hidden sm:flex items-center gap-1.5">
                        {STEPS.map((s, i) => (
                            <div key={s} className="flex items-center gap-1.5">
                                <div className={cn(
                                    "flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold transition-all duration-300",
                                    i < step ? "bg-primary text-white" :
                                    i === step ? "bg-primary/15 text-primary ring-2 ring-primary/40 ring-offset-1" :
                                    "bg-muted text-muted-foreground"
                                )}>
                                    {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                                </div>
                                {i < 4 && <div className={cn("w-4 h-px", i < step ? "bg-primary" : "bg-border")} />}
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground sm:-mr-2"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto max-h-[55vh] scrollbar-thin p-6">

                    {/* ─── Step 0: Patient Selection ─── */}
                    {step === 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                            <p className="text-sm text-muted-foreground">
                                Search and select the patient to book for.
                            </p>

                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={patientSearch}
                                    onChange={e => setPatientSearch(e.target.value)}
                                    placeholder="Search by name, patient no, or contact..."
                                    className="pl-9 h-10 rounded-xl bg-muted/40 border-border/60 focus:bg-background"
                                />
                                {patientSearch && (
                                    <button
                                        onClick={() => setPatientSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            {/* Patient Cards */}
                            {filteredPatients.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl bg-muted/10">
                                    <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                                        <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium text-sm">No patients found</p>
                                    <p className="text-xs text-muted-foreground mt-1 text-center max-w-[220px]">
                                        {patientSearch ? "Try a different search." : "No patients registered yet."}
                                    </p>
                                    <Button
                                        variant="outline" size="sm"
                                        className="mt-4 text-xs"
                                        onClick={() => {
                                            onOpenChange(false);
                                            addToast("Navigate to Patients to register a new patient", "info");
                                        }}
                                    >
                                        <UserCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                        Go to Patients
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[36vh] overflow-y-auto scrollbar-thin pr-1">
                                    {filteredPatients.map(patient => {
                                        const isSelected = selectedPatient === patient.patientid;
                                        return (
                                            <button
                                                key={patient.patientid}
                                                onClick={() => setSelectedPatient(patient.patientid)}
                                                className={cn(
                                                    "group relative flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                                                )}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2">
                                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                                    </div>
                                                )}
                                                <Avatar className="h-10 w-10 shrink-0">
                                                    <AvatarFallback className={cn(
                                                        "font-bold text-sm",
                                                        isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {getInitials(patient.patientname)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-sm truncate">{patient.patientname}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {patient.patient_no && (
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                <Hash className="h-2.5 w-2.5" />{patient.patient_no}
                                                            </span>
                                                        )}
                                                        {(patient.contact || patient.phone_number) && (
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                <Phone className="h-2.5 w-2.5" />
                                                                {patient.contact || patient.phone_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-border/60">
                                                            {patient.gender || "—"}
                                                        </Badge>
                                                        {patient.is_walk_in && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-amber-200/60 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                                                                Walk-in
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Step 1: Doctor Selection ─── */}
                    {step === 1 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                            {/* Patient recap */}
                            {activePatient && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                            {getInitials(activePatient.patientname)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">Patient</p>
                                        <p className="text-sm font-semibold truncate">{activePatient.patientname}</p>
                                    </div>
                                </div>
                            )}

                            <p className="text-sm text-muted-foreground">Select a doctor to book with.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredDoctors.map(doctor => {
                                    const isSelected = selectedDoctor === doctor.doctorid;
                                    return (
                                        <button
                                            key={doctor.doctorid}
                                            onClick={() => setSelectedDoctor(doctor.doctorid)}
                                            className={cn(
                                                "group relative flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                                                isSelected
                                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
                                            )}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2.5 right-2.5">
                                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                                </div>
                                            )}
                                            <Avatar className="h-12 w-12 border-2 shrink-0" style={{
                                                borderColor: isSelected ? 'hsl(var(--primary)/0.3)' : 'transparent'
                                            }}>
                                                <AvatarImage src={doctor.profile_image_url} />
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-lg">
                                                    {doctor.doctorname?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm truncate">{doctor.doctorname}</p>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {doctor.specializationName || "General Practice"}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {doctor.experience ? (
                                                        <span className="text-[10px] text-muted-foreground/70">
                                                            {doctor.experience} yrs exp
                                                        </span>
                                                    ) : null}
                                                    {doctor.fees ? (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-emerald-200/60 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                                                            ₹{doctor.fees}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {filteredDoctors.length === 0 && (
                                    <div className="col-span-full py-10 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                                        <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No active doctors available in this hospital.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── Step 2: Date Selection ─── */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-sm mx-auto space-y-6">
                            {/* Doctor recap */}
                            {activeDoctor && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarImage src={activeDoctor.profile_image_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                            {activeDoctor.doctorname?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{activeDoctor.doctorname}</p>
                                        <p className="text-xs text-muted-foreground">{activeDoctor.specializationName || "General Practice"}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-sm font-medium mb-2">Select appointment date</p>
                                <p className="text-xs text-muted-foreground mb-4">Only dates when the doctor is available will show slots.</p>
                                <DatePicker
                                    value={selectedDate}
                                    onChange={v => { setSelectedDate(v); setSelectedSlot(null); }}
                                    minDate={new Date().toISOString().split("T")[0]}
                                    className="w-full"
                                />
                            </div>

                            {selectedDate && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-sm text-blue-700 dark:text-blue-300 animate-in fade-in duration-300">
                                    <CalendarIcon className="h-4 w-4 shrink-0" />
                                    <span>{formatDate(selectedDate)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Step 3: Slot Selection ─── */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-5">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                <span className="font-medium text-foreground">{formatDate(selectedDate)}</span>
                            </div>

                            {/* Already Booked Banner */}
                            {existingAppointment && (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 animate-in fade-in duration-300">
                                    <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <AlertCircle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Already Booked</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                                            {activePatient?.patientname} already has an appointment at{" "}
                                            <span className="font-bold">{formatTime12Hour(existingAppointment.time)}</span>{" "}
                                            ({existingAppointment.status}).
                                        </p>
                                        <Button
                                            variant="outline" size="sm"
                                            className="mt-2.5 h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                            onClick={() => setStep(2)}
                                        >
                                            Pick Another Date
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {loadingSlots ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Checking availability...</p>
                                </div>
                            ) : availableSlots.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            {availableSlots.filter((s) =>
                                                !s.isFull && !isSlotDisabled(s.time, selectedDate, doctorAvailability)
                                            ).length} slots available
                                        </p>
                                        {firstAvailableIdx >= 0 && (
                                            <button
                                                onClick={scrollToFirstAvailable}
                                                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                                            >
                                                <Zap className="h-3 w-3" />
                                                Next available
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {availableSlots.map((slot, idx) => {
                                            const isSelected = selectedSlot?.time === slot.time;
                                            const disabled = slot.isFull ||
                                                isSlotDisabled(slot.time, selectedDate, doctorAvailability);
                                            const isNextAvailable = idx === firstAvailableIdx;

                                            return (
                                                <button
                                                    key={idx}
                                                    ref={isNextAvailable ? firstAvailableRef : null}
                                                    disabled={disabled}
                                                    onClick={() => !disabled && setSelectedSlot(slot)}
                                                    className={cn(
                                                        "relative flex flex-col items-center justify-center py-3 px-2 rounded-xl border text-center transition-all duration-200",
                                                        disabled
                                                            ? "opacity-40 cursor-not-allowed bg-muted/30 border-border/40"
                                                            : isSelected
                                                                ? "cursor-pointer bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.03]"
                                                                : isNextAvailable
                                                                    ? "cursor-pointer bg-card border-primary/50 ring-2 ring-primary/30 ring-offset-1 hover:bg-primary/5 hover:scale-[1.02]"
                                                                    : "cursor-pointer bg-card border-border hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]"
                                                    )}
                                                >
                                                    {isNextAvailable && !isSelected && (
                                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                                                            Next
                                                        </span>
                                                    )}
                                                    <span className={cn(
                                                        "text-sm font-bold tabular-nums",
                                                        isSelected ? "text-white" : ""
                                                    )}>
                                                        {formatTime12Hour(slot.time)}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] mt-1 font-medium",
                                                        disabled
                                                            ? slot.isFull ? "text-red-400" : "text-muted-foreground/50"
                                                            : isSelected ? "text-white/70" : "text-muted-foreground"
                                                    )}>
                                                        {slot.isFull
                                                            ? "Full"
                                                            : disabled
                                                                ? "Passed"
                                                                : `${slot.booked}/${slot.capacity}`}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl bg-muted/10">
                                    <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                                        <Clock className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium">No slots available</p>
                                    <p className="text-sm text-muted-foreground mt-1 text-center max-w-[220px]">
                                        The doctor is not available on this day.
                                    </p>
                                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setStep(2)}>
                                        Pick Another Date
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Step 4: Confirm ─── */}
                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">
                            <div className="text-center pt-2 pb-5">
                                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                                    <Sparkles className="h-7 w-7 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold">Review & Confirm</h3>
                                <p className="text-sm text-muted-foreground mt-1">Please verify the appointment details before booking.</p>
                            </div>

                            <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/60">
                                {/* Patient */}
                                <div className="flex items-center gap-4 p-4">
                                    <Avatar className="h-11 w-11 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {getInitials(activePatient?.patientname)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Patient</p>
                                        <p className="font-semibold text-sm truncate">{activePatient?.patientname}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {activePatient?.patient_no ? `#${activePatient.patient_no}` : activePatient?.gender}
                                        </p>
                                    </div>
                                    {activePatient?.is_walk_in && (
                                        <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 border-amber-200 shrink-0">
                                            Walk-in
                                        </Badge>
                                    )}
                                </div>

                                {/* Doctor */}
                                <div className="flex items-center gap-4 p-4">
                                    <Avatar className="h-11 w-11 shrink-0">
                                        <AvatarImage src={activeDoctor?.profile_image_url} />
                                        <AvatarFallback className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 font-bold">
                                            {activeDoctor?.doctorname?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Doctor</p>
                                        <p className="font-semibold text-sm truncate">{activeDoctor?.doctorname}</p>
                                        <p className="text-xs text-muted-foreground">{activeDoctor?.specializationName || "General Medicine"}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shrink-0">
                                        Available
                                    </Badge>
                                </div>

                                {/* Date */}
                                <div className="flex items-center gap-4 p-4">
                                    <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                        <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Date</p>
                                        <p className="font-semibold text-sm">{selectedDate ? formatDate(selectedDate) : ""}</p>
                                    </div>
                                </div>

                                {/* Time Slot */}
                                <div className="flex items-center gap-4 p-4">
                                    <div className="h-11 w-11 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                                        <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Time Slot</p>
                                        <p className="font-bold text-xl tabular-nums">{selectedSlot ? formatTime12Hour(selectedSlot.time) : ""}</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-xs text-muted-foreground">Capacity</p>
                                        <p className="text-sm font-semibold">{selectedSlot?.booked}/{selectedSlot?.capacity} booked</p>
                                    </div>
                                </div>
                            </div>

                            {/* Queue info */}
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <User2 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-primary text-xs">Queue Token Auto-Generated</p>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                        A HIGH priority token will be assigned. Please ask the patient to arrive 10–15 minutes before the slot.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/10">
                    <Button
                        variant="ghost"
                        className="gap-1.5 text-muted-foreground"
                        onClick={handleBack}
                        disabled={isSubmitting}
                    >
                        {step > 0 && <ArrowLeft className="h-4 w-4" />}
                        {step === 0 ? "Cancel" : "Back"}
                    </Button>

                    {step < 4 ? (
                        <Button
                            className="gap-2 text-white px-7 font-medium"
                            onClick={handleNext}
                            disabled={!canProceed}
                        >
                            Continue
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            className="gap-2 text-white px-8 font-semibold h-10 shadow-md shadow-primary/25"
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Booking...</>
                            ) : (
                                <><CheckCircle2 className="h-4 w-4" /> Confirm Appointment</>
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

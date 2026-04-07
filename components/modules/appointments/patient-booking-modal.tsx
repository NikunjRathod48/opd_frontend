"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import {
    Loader2, Calendar as CalendarIcon, Clock, ChevronRight,
    CheckCircle2, Stethoscope, X, ArrowLeft, Sparkles, User2, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    isSlotDisabled,
    findFirstAvailableSlotIndex,
    formatTime12Hour,
    type DoctorAvailability,
} from "@/lib/appointment-utils";

interface PatientBookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const STEPS = ["Doctor", "Date", "Slot", "Confirm"];

export function PatientBookingModal({ open, onOpenChange }: PatientBookingModalProps) {
    const { doctors, patients, addAppointment, fetchAvailableSlots } = useData();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [step, setStep] = useState<number>(0); // 0-indexed
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedSlot, setSelectedSlot] = useState<{ time: string; capacity: number; booked: number } | null>(null);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [existingAppointment, setExistingAppointment] = useState<{ time: string; status: string } | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resolve patient profile from user_id. If not found,
    // the backend will resolve patient_id from user_id as a safety net.
    const patientProfile = patients.find(p => String(p.userid) === String(user?.id));
    const patientId = patientProfile?.patientid || user?.id;

    // Reset on open
    useEffect(() => {
        if (open) {
            setStep(0);
            setSelectedDoctor(null);
            setSelectedDate("");
            setSelectedSlot(null);
            setAvailableSlots([]);
            setExistingAppointment(null);
        }
    }, [open]);

    // Fetch slots when reaching step 2 (Slot)
    useEffect(() => {
        if (selectedDoctor && selectedDate && step === 2) {
            setLoadingSlots(true);
            setExistingAppointment(null);
            fetchAvailableSlots(selectedDoctor, selectedDate, patientId ? String(patientId) : undefined)
                .then(result => {
                    setAvailableSlots(result.slots);
                    setExistingAppointment(result.existingAppointment);
                })
                .catch(() => addToast("Failed to load slots.", "error"))
                .finally(() => setLoadingSlots(false));
        }
    }, [selectedDoctor, selectedDate, step]);

    const activeDoctor = doctors.find(d => d.doctorid === selectedDoctor);

    // ── Doctor availability window ───────────────────────────────────────────
    const doctorAvailability: DoctorAvailability | undefined = useMemo(() => {
        const schedule = (activeDoctor as any)?.schedule;
        if (!schedule || !Array.isArray(schedule)) return undefined;
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

    // ── Auto-scroll to first available slot ──────────────────────────────────
    const firstAvailableRef = useRef<HTMLButtonElement | null>(null);

    const scrollToFirstAvailable = useCallback(() => {
        if (firstAvailableRef.current) {
            firstAvailableRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    }, []);

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

    const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const canProceed =
        (step === 0 && !!selectedDoctor) ||
        (step === 1 && !!selectedDate) ||
        (step === 2 && !!selectedSlot && !existingAppointment) ||
        step === 3;

    const handleNext = () => setStep(s => Math.min(s + 1, 3));
    const handleBack = () => step === 0 ? onOpenChange(false) : setStep(s => s - 1);

    const handleConfirm = async () => {
        if (!selectedDoctor || !selectedDate || !selectedSlot) return;
        setIsSubmitting(true);
        try {
            await addAppointment({
                hospitalid: activeDoctor?.hospitalid,
                patientid: patientId || user?.id,
                doctorid: selectedDoctor,
                date: selectedDate,
                time: selectedSlot.time,
                type: "Consultation"
            });
            addToast("Appointment booked successfully!", "success");
            onOpenChange(false);
        } catch (err: any) {
            addToast(err.message || "Failed to book appointment", "error");
            // Refresh slots so capacity/count updates after failed attempt
            fetchAvailableSlots(selectedDoctor, selectedDate, patientId ? String(patientId) : undefined)
                .then(result => {
                    setAvailableSlots(result.slots);
                    setExistingAppointment(result.existingAppointment);
                })
                .catch(() => {});
            setSelectedSlot(null);
            setStep(2); // Go back to slot selection
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl w-[96vw] p-0 gap-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-background [&>button]:hidden">
                <DialogHeader className="sr-only">
                     <DialogTitle>Book Appointment</DialogTitle>
                     <DialogDescription>Book a new appointment with a doctor.</DialogDescription>
                </DialogHeader>
                {/* Top gradient bar */}
                <div className="relative h-1.5 w-full bg-muted overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all duration-700 ease-out"
                        style={{ width: `${((step + 1) / 4) * 100}%` }}
                    />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Stethoscope className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight">Book Appointment</h2>
                            <p className="text-xs text-muted-foreground">Step {step + 1} of 4 — {STEPS[step]}</p>
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
                                {i < 3 && <div className={cn("w-5 h-px", i < step ? "bg-primary" : "bg-border")} />}
                            </div>
                        ))}
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground sm:-mr-2" onClick={() => onOpenChange(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto max-h-[55vh] scrollbar-thin p-6">

                    {/* Step 0 – Doctor */}
                    {step === 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                            <p className="text-sm text-muted-foreground mb-4">Choose a doctor you'd like to consult with.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {doctors.filter(d => d.isactive).map(doctor => (
                                    <button
                                        key={doctor.doctorid}
                                        onClick={() => setSelectedDoctor(doctor.doctorid)}
                                        className={cn(
                                            "group relative flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                                            selectedDoctor === doctor.doctorid
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                                : "border-border bg-card hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
                                        )}
                                    >
                                        {selectedDoctor === doctor.doctorid && (
                                            <div className="absolute top-2.5 right-2.5">
                                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                            </div>
                                        )}
                                        <Avatar className="h-12 w-12 border-2 shrink-0" style={{
                                            borderColor: selectedDoctor === doctor.doctorid ? 'hsl(var(--primary)/0.3)' : 'transparent'
                                        }}>
                                            <AvatarImage src={doctor.profile_image_url} />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-lg">
                                                {doctor.doctorname?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-sm truncate">{doctor.doctorname}</p>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{doctor.specializationName || 'General Practice'}</p>
                                            {doctor.experience ? (
                                                <p className="text-[10px] text-muted-foreground/70 mt-1">{doctor.experience} yrs experience</p>
                                            ) : null}
                                        </div>
                                    </button>
                                ))}
                                {doctors.filter(d => d.isactive).length === 0 && (
                                    <div className="col-span-full py-10 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                                        No doctors available.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 1 – Date */}
                    {step === 1 && (
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
                                        <p className="text-xs text-muted-foreground">{activeDoctor.specializationName || 'General Practice'}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-sm font-medium mb-2">Select appointment date</p>
                                <p className="text-xs text-muted-foreground mb-4">Only dates when the doctor is available will show slots.</p>
                                <DatePicker
                                    value={selectedDate}
                                    onChange={setSelectedDate}
                                    minDate={new Date().toISOString().split('T')[0]}
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

                    {/* Step 2 – Slot */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-5">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                <span className="font-medium text-foreground">{formatDate(selectedDate)}</span>
                            </div>

                            {/* Already booked banner */}
                            {existingAppointment && (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 animate-in fade-in duration-300">
                                    <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <CalendarIcon className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Already Booked</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                                            You have an appointment with this doctor at <span className="font-bold">{formatTime12Hour(existingAppointment.time)}</span> ({existingAppointment.status}).
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-2.5 h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={() => setStep(1)}>
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
                                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setStep(1)}>
                                        Pick Another Date
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3 – Confirm */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">
                            <div className="text-center pt-2 pb-5">
                                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                                    <Sparkles className="h-7 w-7 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold">Review & Confirm</h3>
                                <p className="text-sm text-muted-foreground mt-1">Please verify your appointment details.</p>
                            </div>

                            <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/60">
                                {/* Doctor */}
                                <div className="flex items-center gap-4 p-4">
                                    <Avatar className="h-11 w-11 shrink-0">
                                        <AvatarImage src={activeDoctor?.profile_image_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {activeDoctor?.doctorname?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Doctor</p>
                                        <p className="font-semibold text-sm truncate">{activeDoctor?.doctorname}</p>
                                        <p className="text-xs text-muted-foreground">{activeDoctor?.specializationName || 'General Medicine'}</p>
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
                                        <p className="font-semibold text-sm">{selectedDate ? formatDate(selectedDate) : ''}</p>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="flex items-center gap-4 p-4">
                                    <div className="h-11 w-11 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                                        <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Time Slot</p>
                                        <p className="font-bold text-xl tabular-nums">{selectedSlot ? formatTime12Hour(selectedSlot.time) : ''}</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-xs text-muted-foreground">Capacity</p>
                                        <p className="text-sm font-semibold">{selectedSlot?.booked}/{selectedSlot?.capacity} booked</p>
                                    </div>
                                </div>
                            </div>

                            {/* Queue info card */}
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <User2 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-primary text-xs">Queue Token Auto-Generated</p>
                                    <p className="text-muted-foreground text-xs mt-0.5">A HIGH priority token will be assigned to you. Please arrive 10–15 minutes before your slot time.</p>
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

                    {step < 3 ? (
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

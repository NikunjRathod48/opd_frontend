"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useData, Appointment } from "@/context/data-context";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Tooltip } from "@/components/ui/tooltip";
import { PatientBookingModal } from "./patient-booking-modal";
import { AdminBookingModal } from "./admin-booking-modal";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
    Search, Plus, CalendarIcon, Clock, Filter, ChevronLeft, ChevronRight,
    Stethoscope, User, CheckCircle2, X, Pencil, CalendarDays, Hash,
    LayoutList, Grid, AlertCircle, RefreshCw, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AppointmentViewProps {
    allowedRoles?: UserRole[];
    readOnly?: boolean;
    hospitalId?: string;
}

const STATUS_OPTIONS = ["All", "Scheduled", "Checked-In", "Completed", "Cancelled", "No-Show", "Rescheduled"];

const STATUS_CONFIG: Record<string, { color: string; chipColor: string; dot: string }> = {
    Scheduled: { color: "bg-violet-100 text-violet-700 border-violet-200", chipColor: "text-violet-700", dot: "bg-violet-500" },
    "Checked-In": { color: "bg-blue-100 text-blue-700 border-blue-200", chipColor: "text-blue-700", dot: "bg-blue-500" },
    Completed: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", chipColor: "text-emerald-700", dot: "bg-emerald-500" },
    Cancelled: { color: "bg-rose-100 text-rose-700 border-rose-200", chipColor: "text-rose-700", dot: "bg-rose-500" },
    "No-Show": { color: "bg-slate-100 text-slate-600 border-slate-200", chipColor: "text-slate-600", dot: "bg-slate-400" },
    Rescheduled: { color: "bg-amber-100 text-amber-700 border-amber-200", chipColor: "text-amber-700", dot: "bg-amber-500" },
};

export function AppointmentView({
    allowedRoles = ['HospitalAdmin', 'Doctor', 'Receptionist', 'Patient'],
    readOnly = false,
    hospitalId,
}: AppointmentViewProps) {
    const { addToast } = useToast();
    const { user } = useAuth();
    const { appointments, doctors, patients, addAppointment, updateAppointment, checkInAppointment, fetchAppointments } = useData();

    // --- UI State ---
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // --- Pending filter state (inside filter sheet, not yet applied) ---
    const [pendingDoctorFilter, setPendingDoctorFilter] = useState("");
    const [pendingPatientFilter, setPendingPatientFilter] = useState("");
    const [pendingDateStart, setPendingDateStart] = useState("");
    const [pendingDateEnd, setPendingDateEnd] = useState("");

    // --- Applied filters (only set when Apply is clicked) ---
    const [appliedFilters, setAppliedFilters] = useState({ doctor: "", patient: "", dateStart: "", dateEnd: "" });

    // --- Edit State ---
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");



    // --- Initial fetch ---
    useEffect(() => {
        setIsLoading(true);
        fetchAppointments?.().finally(() => setIsLoading(false));
    }, []);

    // --- Derived ---
    const effectiveHospitalId = hospitalId || (
        ['HospitalAdmin', 'Receptionist'].includes(user?.role || '') ? user?.hospitalid : undefined
    );
    const isAdminOrRecep = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Receptionist'].includes(user?.role || '');
    const canCreateAppointment = !readOnly && (user?.role === 'Patient' || isAdminOrRecep);
    const canManageStatus = !readOnly && (isAdminOrRecep || user?.role === 'Doctor');

    // --- Helpers ---
    const getApptDate = (iso: string) => iso.split('T')[0];
    const getApptTime = (iso: string) => {
        const t = iso.split('T')[1]?.substring(0, 5) || "";
        if (!t) return "";
        const [h, m] = t.split(':').map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    };
    const formatDisplayDate = (iso: string) => {
        const [y, mo, d] = iso.split('T')[0].split('-');
        return new Date(+y, +mo - 1, +d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // --- Filter the appointments ---
    const baseFiltered = useMemo(() => {
        return appointments.filter(apt => {
            if (!user) return false;
            if (effectiveHospitalId && String(apt.hospitalid) !== String(effectiveHospitalId)) return false;
            return true;
        });
    }, [appointments, user, effectiveHospitalId]);

    const filtered = useMemo(() => {
        let list = [...baseFiltered];
        if (statusFilter !== "All") list = list.filter(a => a.status === statusFilter);

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter(a =>
                a.patientName?.toLowerCase().includes(q) ||
                a.doctorName?.toLowerCase().includes(q) ||
                (a as any).appointmentno?.toLowerCase().includes(q)
            );
        }
        if (appliedFilters.doctor) list = list.filter(a => a.doctorid === appliedFilters.doctor);
        if (appliedFilters.patient) list = list.filter(a => a.patientid === appliedFilters.patient);
        if (appliedFilters.dateStart) list = list.filter(a => getApptDate(a.appointmentdatetime) >= appliedFilters.dateStart);
        if (appliedFilters.dateEnd) list = list.filter(a => getApptDate(a.appointmentdatetime) <= appliedFilters.dateEnd);
        return list;
    }, [baseFiltered, statusFilter, searchQuery, appliedFilters]);

    // --- Stats ---
    const stats = useMemo(() => ({
        total: baseFiltered.length,
        scheduled: baseFiltered.filter(a => a.status === "Scheduled").length,
        completed: baseFiltered.filter(a => a.status === "Completed").length,
        today: baseFiltered.filter(a => getApptDate(a.appointmentdatetime) === new Date().toISOString().split('T')[0]).length,
    }), [baseFiltered]);

    // --- Pagination ---
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- Active filter count (based on applied filters) ---
    const activeFilterCount = [appliedFilters.doctor, appliedFilters.patient, appliedFilters.dateStart, appliedFilters.dateEnd].filter(Boolean).length;

    // --- Actions ---
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchAppointments?.().catch(() => { });
        setIsRefreshing(false);
        addToast("Appointments refreshed", "success");
    };

    const handleStatusUpdate = (status: string) => {
        if (!selectedAppointment || !canManageStatus) return;
        updateAppointment(selectedAppointment.appointmentid, { status: status as any });
        setSelectedAppointment(null);
        addToast(`Appointment marked as ${status}`, "info");
    };

    const handleCheckIn = async (appointmentId: string) => {
        if (!canManageStatus) return;
        setCheckingIn(p => ({ ...p, [appointmentId]: true }));
        try {
            const result = await checkInAppointment?.(appointmentId);
            const tokenMsg = result?.token_number ? ` Token #${result.token_number}` : '';
            addToast(`Patient checked-in successfully.${tokenMsg}`, "success");
        } catch (error: any) {
            addToast(error.message || "Failed to check-in", "error");
        } finally {
            setCheckingIn(p => ({ ...p, [appointmentId]: false }));
        }
    };

    const handleReschedule = () => {
        if (!selectedAppointment || !editDate || !editTime) return;
        updateAppointment(selectedAppointment.appointmentid, {
            appointmentdatetime: `${editDate}T${editTime}:00`,
            status: "Rescheduled" as any,
        });
        setSelectedAppointment(null);
        addToast("Appointment rescheduled", "success");
    };



    const resetFilters = () => {
        setPendingDoctorFilter(""); setPendingPatientFilter(""); setPendingDateStart(""); setPendingDateEnd("");
        setAppliedFilters({ doctor: "", patient: "", dateStart: "", dateEnd: "" });
        setCurrentPage(1);
    };

    const doctorOptions = (effectiveHospitalId
        ? doctors.filter(d => String(d.hospitalid) === String(effectiveHospitalId))
        : doctors
    ).map(d => ({ label: d.doctorname, value: d.doctorid }));

    const patientOptions = patients.map(p => ({ label: p.patientname, value: p.patientid }));

    // --- Skeleton component ---
    const Skeleton = ({ className }: { className?: string }) => (
        <div className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-700", className)} />
    );

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="space-y-6 animate-in fade-in duration-500 pb-10">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent pb-1">
                            Appointments
                        </h2>
                        <p className="text-muted-foreground/80 font-medium text-base mt-1">
                            {user?.role === 'Patient' ? "Your scheduled consultations" :
                                user?.role === 'Doctor' ? "Your patient appointments" :
                                    "Manage schedule and bookings"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tooltip content="Refresh" side="bottom">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 rounded-xl border-slate-200 dark:border-slate-800"
                                onClick={handleRefresh}
                                disabled={isRefreshing || isLoading}
                            >
                                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                            </Button>
                        </Tooltip>
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(true)}
                            className={cn(
                                "gap-2 rounded-xl h-11 px-5 border-slate-200 dark:border-slate-800 font-semibold transition-all duration-300",
                                activeFilterCount > 0
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-white dark:bg-slate-900"
                            )}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="ml-1 h-5 w-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                        {canCreateAppointment && (
                            <Button
                                onClick={() => user?.role === 'Patient' ? setIsPatientModalOpen(true) : setIsAddModalOpen(true)}
                                className="bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 rounded-xl px-6 h-11 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                {user?.role === 'Patient' ? "Book Appointment" : "New Appointment"}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Stats Strip ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm">
                                <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                                <Skeleton className="h-7 w-12 mb-1.5" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))
                        : [
                            { label: "Total", value: stats.total, icon: <CalendarDays className="h-5 w-5" />, color: "from-primary to-blue-500", bg: "bg-primary/10 text-primary" },
                            { label: "Scheduled", value: stats.scheduled, icon: <Clock className="h-5 w-5" />, color: "from-violet-500 to-purple-500", bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600" },
                            { label: "Today", value: stats.today, icon: <CalendarIcon className="h-5 w-5" />, color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-900/20 text-amber-600" },
                            { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="h-5 w-5" />, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
                        ].map((s, i) => (
                            <div key={s.label} className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                <div className={cn("inline-flex items-center justify-center h-10 w-10 rounded-xl mb-3", s.bg)}>
                                    {s.icon}
                                </div>
                                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{s.value}</div>
                                <div className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</div>
                                <div className={cn("absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-10", s.color)} />
                            </div>
                        ))
                    }
                </div>

                {/* ── Search ── */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by patient name, doctor, or appointment no..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Active Filter Pills */}
                    {(searchQuery || appliedFilters.doctor || appliedFilters.patient || appliedFilters.dateStart || appliedFilters.dateEnd) && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground mr-1">Active Filters:</span>

                            {searchQuery && (
                                <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 dark:bg-primary/10 dark:text-primary dark:border-primary/30 rounded-xl font-medium">
                                    Search: <span className="font-bold ml-1">{searchQuery}</span>
                                    <button onClick={() => setSearchQuery("")} className="ml-2 hover:opacity-70 transition-opacity"><X className="h-3 w-3" /></button>
                                </Badge>
                            )}
                            {appliedFilters.doctor && (() => {
                                const doc = doctors.find(d => d.doctorid === appliedFilters.doctor);
                                return (
                                    <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 rounded-xl font-medium">
                                        Doctor: <span className="font-bold ml-1">{doc?.doctorname || appliedFilters.doctor}</span>
                                        <button onClick={() => { setAppliedFilters(p => ({ ...p, doctor: "" })); setPendingDoctorFilter(""); }} className="ml-2 hover:opacity-70 transition-opacity"><X className="h-3 w-3" /></button>
                                    </Badge>
                                );
                            })()}
                            {appliedFilters.patient && (() => {
                                const pat = patients.find(p => p.patientid === appliedFilters.patient);
                                return (
                                    <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 rounded-xl font-medium">
                                        Patient: <span className="font-bold ml-1">{pat?.patientname || appliedFilters.patient}</span>
                                        <button onClick={() => { setAppliedFilters(p => ({ ...p, patient: "" })); setPendingPatientFilter(""); }} className="ml-2 hover:opacity-70 transition-opacity"><X className="h-3 w-3" /></button>
                                    </Badge>
                                );
                            })()}
                            {appliedFilters.dateStart && (
                                <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 rounded-xl font-medium">
                                    From: <span className="font-bold ml-1">{appliedFilters.dateStart}</span>
                                    <button onClick={() => { setAppliedFilters(p => ({ ...p, dateStart: "" })); setPendingDateStart(""); }} className="ml-2 hover:opacity-70 transition-opacity"><X className="h-3 w-3" /></button>
                                </Badge>
                            )}
                            {appliedFilters.dateEnd && (
                                <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 rounded-xl font-medium">
                                    To: <span className="font-bold ml-1">{appliedFilters.dateEnd}</span>
                                    <button onClick={() => { setAppliedFilters(p => ({ ...p, dateEnd: "" })); setPendingDateEnd(""); }} className="ml-2 hover:opacity-70 transition-opacity"><X className="h-3 w-3" /></button>
                                </Badge>
                            )}

                            <Button variant="ghost" size="sm"
                                onClick={() => { setSearchQuery(""); resetFilters(); }}
                                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                Clear All
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Status Chips ── */}
                <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200",
                                statusFilter === s
                                    ? "bg-gradient-to-r from-primary to-blue-500 text-white border-transparent shadow-md shadow-primary/20"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/40 cursor-pointer"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* ── Appointment List ── */}
                {isLoading ? (
                    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                        {/* Table header skeleton */}
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
                            <Skeleton className="col-span-4 h-3 w-16" />
                            <Skeleton className="col-span-3 h-3 w-20 hidden sm:block" />
                            <Skeleton className="col-span-2 h-3 w-20 hidden md:block" />
                            <Skeleton className="col-span-2 h-3 w-14 ml-auto" />
                            <Skeleton className="col-span-1 h-3 w-10 ml-auto" />
                        </div>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={cn(
                                "grid grid-cols-12 gap-2 px-5 py-4 items-center",
                                i !== 4 && "border-b border-slate-100 dark:border-slate-800/50"
                            )}>
                                {/* Avatar + name */}
                                <div className="col-span-6 sm:col-span-5 md:col-span-4 flex items-center gap-3">
                                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-3.5 w-28" />
                                        <Skeleton className="h-2.5 w-20 sm:hidden" />
                                    </div>
                                </div>
                                {/* Doctor name */}
                                <div className="col-span-3 hidden sm:block">
                                    <Skeleton className="h-3.5 w-24" />
                                </div>
                                {/* Date & Time */}
                                <div className="col-span-2 hidden md:flex flex-col gap-1.5">
                                    <Skeleton className="h-3.5 w-20" />
                                    <Skeleton className="h-2.5 w-14" />
                                </div>
                                {/* Status badge */}
                                <div className="col-span-3 sm:col-span-2 flex justify-center">
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>
                                {/* Actions */}
                                <div className="col-span-3 sm:col-span-2 md:col-span-1 flex justify-end gap-1">
                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-black/20">
                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                            <CalendarDays className="h-9 w-9 text-primary/40" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No appointments found</h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {searchQuery || statusFilter !== "All" ? "Try adjusting your search or filters." : "No appointments yet."}
                        </p>
                        {canCreateAppointment && !searchQuery && statusFilter === "All" && (
                            <Button
                                onClick={() => user?.role === 'Patient' ? setIsPatientModalOpen(true) : setIsAddModalOpen(true)}
                                className="mt-5 bg-gradient-to-r from-primary to-blue-500 text-white rounded-xl px-6 h-10"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {user?.role === 'Patient' ? "Book Appointment" : "New Appointment"}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <div className="col-span-6 sm:col-span-5 md:col-span-4">{user?.role === 'Patient' ? "Doctor" : "Patient"}</div>
                            <div className="col-span-3 hidden sm:block">{user?.role === 'Patient' ? "Type" : "Doctor Name"}</div>
                            <div className="col-span-2 hidden md:block">Date & Time</div>
                            <div className="col-span-3 sm:col-span-2 text-center">Status</div>
                            <div className="col-span-3 sm:col-span-2 md:col-span-1 text-right">Actions</div>
                        </div>

                        <AnimatePresence>
                            {paginated.map((apt, idx) => {
                                const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG["Scheduled"];
                                const initials = (user?.role === 'Patient' ? apt.doctorName : apt.patientName)?.charAt(0)?.toUpperCase() || "?";
                                const primaryLabel = user?.role === 'Patient' ? apt.doctorName : apt.patientName;
                                const secondaryLabel = user?.role === 'Patient' ? apt.doctorName : apt.doctorName;

                                return (
                                    <motion.div
                                        key={apt.appointmentid}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 8 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className={cn(
                                            "grid grid-cols-12 gap-2 px-5 py-4 items-center transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30",
                                            idx !== paginated.length - 1 && "border-b border-slate-100 dark:border-slate-800/50"
                                        )}
                                    >
                                        {/* Patient / Doctor avatar */}
                                        <div className="col-span-6 sm:col-span-5 md:col-span-4 flex items-center gap-3 min-w-0">
                                            <Avatar className="h-9 w-9 shrink-0">
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate text-slate-800 dark:text-slate-100">{primaryLabel || "—"}</p>
                                                <p className="text-xs text-muted-foreground truncate sm:hidden">{formatDisplayDate(apt.appointmentdatetime)}</p>
                                            </div>
                                        </div>

                                        {/* Doctor name (for non-patient) */}
                                        <div className="col-span-3 hidden sm:block min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span className="text-sm text-muted-foreground truncate">
                                                    {user?.role === 'Patient' ? apt.type : apt.doctorName || "—"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Date & Time */}
                                        <div className="col-span-2 hidden md:flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                {formatDisplayDate(apt.appointmentdatetime)}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {getApptTime(apt.appointmentdatetime)}
                                            </span>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-3 sm:col-span-2 flex justify-center">
                                            <Badge variant="outline" className={cn("text-[10px] px-2.5 py-0.5 font-semibold border gap-1 pointer-events-none", cfg.color)}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                                                {apt.status}
                                            </Badge>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-3 sm:col-span-2 md:col-span-1 flex justify-end gap-1 items-center">
                                            {apt.status === 'Checked-In' && apt.token_number && (
                                                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold mr-1 bg-blue-100 dark:bg-blue-900/60 px-2 py-1 rounded-md whitespace-nowrap hidden lg:block">
                                                    Token #{apt.token_number}
                                                </span>
                                            )}

                                            {canManageStatus && apt.status === 'Scheduled' && getApptDate(apt.appointmentdatetime) === new Date().toISOString().split('T')[0] ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-3 text-xs shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90"
                                                        disabled={checkingIn[apt.appointmentid]}
                                                        onClick={() => handleCheckIn(apt.appointmentid)}
                                                    >
                                                        {checkingIn[apt.appointmentid] ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check-In"}
                                                    </Button>
                                                    <Tooltip content="View Details" side="top">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                                            onClick={() => { setSelectedAppointment(apt); setIsEditing(false); }}
                                                        >
                                                            <CalendarDays className="h-4 w-4" />
                                                        </Button>
                                                    </Tooltip>
                                                </>
                                            ) : (
                                                <>
                                                    <Tooltip content="View Details" side="top">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                                            onClick={() => { setSelectedAppointment(apt); setIsEditing(false); }}
                                                        >
                                                            <CalendarDays className="h-4 w-4" />
                                                        </Button>
                                                    </Tooltip>
                                                    {canManageStatus && apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                                                        <Tooltip content="Manage" side="top">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600"
                                                                onClick={() => {
                                                                    setSelectedAppointment(apt);
                                                                    setIsEditing(true);
                                                                    setEditDate(getApptDate(apt.appointmentdatetime));
                                                                    setEditTime(apt.appointmentdatetime.split('T')[1]?.substring(0, 5) || "");
                                                                }}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Tooltip>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                                <p className="text-xs text-muted-foreground">
                                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const pg = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                                        if (pg > totalPages) return null;
                                        return (
                                            <Button key={pg} variant={pg === currentPage ? "default" : "ghost"} size="icon" className="h-7 w-7 rounded-lg text-xs" onClick={() => setCurrentPage(pg)}>
                                                {pg}
                                            </Button>
                                        );
                                    })}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Filter Sheet ── */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="pb-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-primary" /> Advanced Filters
                        </SheetTitle>
                        <SheetDescription>Narrow down appointments by doctor, patient, or date range.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-5 py-5 flex-1">
                        {user?.role !== 'Doctor' && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Doctor</Label>
                                <SearchableSelect options={doctorOptions} value={pendingDoctorFilter} onChange={setPendingDoctorFilter} placeholder="Filter by Doctor" className="w-full" />
                            </div>
                        )}
                        {user?.role !== 'Patient' && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Patient</Label>
                                <SearchableSelect options={patientOptions} value={pendingPatientFilter} onChange={setPendingPatientFilter} placeholder="Filter by Patient" className="w-full" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date From</Label>
                            <DatePicker value={pendingDateStart} onChange={setPendingDateStart} placeholder="Start date" className="w-full" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date To</Label>
                            <DatePicker value={pendingDateEnd} onChange={setPendingDateEnd} placeholder="End date" className="w-full" />
                        </div>
                    </div>
                    <SheetFooter className="gap-2 border-t pt-4">
                        <Button variant="outline" onClick={() => { resetFilters(); setIsFilterOpen(false); }} className="flex-1">Reset</Button>
                        <Button onClick={() => {
                            setAppliedFilters({ doctor: pendingDoctorFilter, patient: pendingPatientFilter, dateStart: pendingDateStart, dateEnd: pendingDateEnd });
                            setCurrentPage(1);
                            setIsFilterOpen(false);
                        }} className="flex-1 text-white">Apply</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ── Appointment Detail / Edit Sheet ── */}
            <Sheet open={!!selectedAppointment} onOpenChange={open => !open && setSelectedAppointment(null)}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 gap-0">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Appointment Details</SheetTitle>
                        <SheetDescription>View and manage appointment details.</SheetDescription>
                    </SheetHeader>
                    {selectedAppointment && (() => {
                        const cfg = STATUS_CONFIG[selectedAppointment.status] || STATUS_CONFIG["Scheduled"];
                        return (
                            <>
                                {/* Gradient header */}
                                <div className="h-28 bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-md" />
                                    <div className="absolute -top-10 -left-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
                                    <div className="absolute top-3 left-3">
                                        <Badge variant="outline" className={cn("text-xs font-bold px-3 py-1 border-white/20 shadow-sm", cfg.color)}>
                                            <span className={cn("h-2 w-2 rounded-full mr-1.5", cfg.dot)} />
                                            {selectedAppointment.status}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full text-muted-foreground/60 hover:bg-white/20 z-10" onClick={() => setSelectedAppointment(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Avatar + name */}
                                <div className="flex flex-col items-center -mt-10 px-6 pb-4 border-b">
                                    <Avatar className="h-20 w-20 border-4 border-background shadow-xl bg-background">
                                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-blue-500/5 text-primary text-3xl font-bold">
                                            {(user?.role === 'Patient' ? selectedAppointment.doctorName : selectedAppointment.patientName)?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="text-xl font-bold mt-3 text-center">
                                        {user?.role === 'Patient' ? selectedAppointment.doctorName : selectedAppointment.patientName}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                                        {user?.role === 'Patient' ? <Stethoscope className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                        <span>{user?.role === 'Patient' ? selectedAppointment.doctorName : "Patient"}</span>
                                        <span className="text-muted-foreground/30 mx-1">|</span>
                                        <span>{selectedAppointment.type}</span>
                                    </div>
                                </div>

                                <div className="px-6 py-5 space-y-5 flex-1">
                                    {!isEditing ? (
                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                                            {[
                                                { label: "Date", value: formatDisplayDate(selectedAppointment.appointmentdatetime), icon: <CalendarIcon className="h-4 w-4" /> },
                                                { label: "Time", value: getApptTime(selectedAppointment.appointmentdatetime), icon: <Clock className="h-4 w-4" /> },
                                            ].map(item => (
                                                <div key={item.label} className="flex flex-col gap-1.5 p-4 rounded-xl bg-muted/40 border border-border/40">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <div className="p-1.5 rounded-md bg-background shadow-sm text-primary">{item.icon}</div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                                                    </div>
                                                    <p className="font-semibold text-base pl-1">{item.value}</p>
                                                </div>
                                            ))}
                                            <div className="col-span-2 flex flex-col gap-1.5 p-4 rounded-xl bg-muted/40 border border-border/40">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <div className="p-1.5 rounded-md bg-background shadow-sm text-primary">
                                                        <Stethoscope className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Doctor</span>
                                                </div>
                                                <p className="font-semibold text-base pl-1">{selectedAppointment.doctorName}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
                                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Reschedule Appointment</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-muted-foreground">New Date</Label>
                                                        <DatePicker value={editDate} onChange={setEditDate} className="w-full h-9" minDate={new Date().toISOString().split('T')[0]} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-muted-foreground">New Time</Label>
                                                        <TimePicker value={editTime} onChange={setEditTime} containerClassName="w-full" />
                                                    </div>
                                                </div>
                                                <Button size="sm" onClick={handleReschedule} className="w-full text-white gap-2 h-9">
                                                    <Clock className="h-3.5 w-3.5" /> Confirm Reschedule
                                                </Button>
                                            </div>

                                            {canManageStatus && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Update Status</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { label: "Check-In", value: "Checked-In", cls: "border-blue-200/60 bg-blue-50/50 hover:bg-blue-100/50 text-blue-700", dot: "bg-blue-500" },
                                                            { label: "Complete", value: "Completed", cls: "border-emerald-200/60 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700", dot: "bg-emerald-500" },
                                                            { label: "Cancel", value: "Cancelled", cls: "border-rose-200/60 bg-rose-50/50 hover:bg-rose-100/50 text-rose-700", dot: "bg-rose-500" },
                                                            { label: "No Show", value: "No-Show", cls: "border-slate-200/60 bg-slate-50/50 hover:bg-slate-100/50 text-slate-600", dot: "bg-slate-400" },
                                                        ].map(opt => (
                                                            <Button key={opt.value} variant="outline" disabled={selectedAppointment.status === opt.value}
                                                                onClick={() => handleStatusUpdate(opt.value)}
                                                                className={cn("justify-start h-auto py-2 px-3 text-xs border rounded-xl cursor-pointer", opt.cls)}>
                                                                <span className={cn("h-2 w-2 rounded-full mr-2 shrink-0", opt.dot)} />
                                                                {opt.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-4 border-t flex gap-2">
                                    {!isEditing && selectedAppointment.status !== 'Completed' && selectedAppointment.status !== 'Cancelled' && (canManageStatus || user?.role === 'Patient') && (
                                        <Button className="flex-1 text-white gap-2 shadow-md" onClick={() => {
                                            setIsEditing(true);
                                            setEditDate(getApptDate(selectedAppointment.appointmentdatetime));
                                            setEditTime(selectedAppointment.appointmentdatetime.split('T')[1]?.substring(0, 5) || "");
                                        }}>
                                            <Pencil className="h-4 w-4" />
                                            {canManageStatus ? "Manage Appointment" : "Reschedule"}
                                        </Button>
                                    )}
                                    {isEditing && (
                                        <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                                            Back to Details
                                        </Button>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </SheetContent>
            </Sheet>

            {/* ── Patient Booking Modal ── */}
            {user?.role === 'Patient' && (
                <PatientBookingModal open={isPatientModalOpen} onOpenChange={setIsPatientModalOpen} />
            )}

            {/* ── Admin/Receptionist Booking Modal ── */}
            {isAdminOrRecep && (
                <AdminBookingModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
            )}
        </RoleGuard>
    );
}

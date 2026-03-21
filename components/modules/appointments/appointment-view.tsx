"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, List, Grid, Plus, Search, ChevronLeft, ChevronRight, Pencil, Eye, X, User, Stethoscope } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useData, Appointment } from "@/context/data-context";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Tooltip } from "@/components/ui/tooltip";

interface AppointmentViewProps {
    allowedRoles?: UserRole[];
    readOnly?: boolean;
    hospitalId?: string;
}

export function AppointmentView({ allowedRoles = ['HospitalAdmin', 'Doctor', 'Receptionist', 'Patient'], readOnly = false, hospitalId }: AppointmentViewProps) {
    const { addToast } = useToast();
    const { user } = useAuth();
    const { appointments, doctors, patients, addAppointment, updateAppointment } = useData();

    // View State
    const [view, setView] = useState<"list" | "calendar">("list");

    // Filters
    const [doctorFilter, setDoctorFilter] = useState("");
    const [patientFilter, setPatientFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");

    // Applied Filters
    const [appliedFilters, setAppliedFilters] = useState({
        doctor: "",
        patient: "",
        status: "All",
        start: "",
        end: ""
    });

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [openedInEditMode, setOpenedInEditMode] = useState(false);

    // Edit State
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        patientName: "",
        patientId: "",
        doctorId: "",
        date: "",
        time: "",
        type: "General Checkup"
    });

    // --- Filter Logic ---
    const handleApplyFilters = () => {
        setAppliedFilters({
            doctor: doctorFilter,
            patient: patientFilter,
            status: statusFilter,
            start: dateStart,
            end: dateEnd
        });
    };

    const resetFilters = () => {
        setDoctorFilter("");
        setPatientFilter("");
        setStatusFilter("All");
        setDateStart("");
        setDateEnd("");
        setAppliedFilters({
            doctor: "",
            patient: "",
            status: "All",
            start: "",
            end: ""
        });
    };

    // --- Initial filtering by Role ---
    const effectiveHospitalId = hospitalId || (['HospitalAdmin', 'Receptionist'].includes(user?.role || '') ? user?.hospitalid : undefined);

    const userAppointments = appointments.filter(apt => {
        if (!user) return false;

        if (effectiveHospitalId && String(apt.hospitalid) !== String(effectiveHospitalId)) return false;

        if (['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Receptionist'].includes(user.role)) return true;
        if (user.role === 'Doctor') {
            const doctorProfile = doctors.find(d => String(d.userid) === String(user.id));
            const currentDoctorId = doctorProfile?.doctorid || (user as any)?.doctorid || user.id;
            return String(apt.doctorid) === String(currentDoctorId);
        }
        if (user.role === 'Patient') {
            return true; // Already filtered by backend
        }
        return false;
    });

    const filteredAppointments = userAppointments.filter(apt => {
        const dName = apt.doctorName || "";
        const pName = apt.patientName || "";

        // Exact ID match for searchable select if ID is stored, OR name match
        // Our SearchableSelect returns ID usually. Let's assume filter states store IDs if selected, or names?
        // Let's match by includes for flexibility or ID if possible.
        // Assuming filters store IDs for doctors/patients as per SearchableSelect typically used.

        const matchesDoctor = !appliedFilters.doctor || apt.doctorid === appliedFilters.doctor;
        // For patients, we might not have patientID in apartment list reliably if imported? 
        // DataContext `Appointment` has `patientid`.
        const matchesPatient = !appliedFilters.patient || apt.patientid === appliedFilters.patient;

        const matchesStatus = appliedFilters.status === "All" || apt.status === appliedFilters.status;

        const matchesDate = (() => {
            if (!appliedFilters.start && !appliedFilters.end) return true;
            const aptDate = new Date(apt.appointmentdatetime.split('T')[0]); // Compare dates only

            if (appliedFilters.start) {
                const start = new Date(appliedFilters.start);
                start.setHours(0, 0, 0, 0);
                if (aptDate < start) return false;
            }
            if (appliedFilters.end) {
                const end = new Date(appliedFilters.end);
                end.setHours(0, 0, 0, 0);
                if (aptDate > end) return false;
            }
            return true;
        })();

        return matchesDoctor && matchesPatient && matchesStatus && matchesDate;
    });

    // --- Permissions ---
    const isAdminOrRecep = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Receptionist'].includes(user?.role || '');
    const canCreateAppointment = !readOnly && (user?.role === 'Patient' || isAdminOrRecep);
    const canManageStatus = !readOnly && (isAdminOrRecep || user?.role === 'Doctor');

    // --- Helpers ---
    const getApptDate = (iso: string) => iso.split('T')[0];
    const getApptTime = (iso: string) => {
        const timePart = iso.split('T')[1]?.substring(0, 5) || "";
        if (!timePart) return "";
        const [hours, minutes] = timePart.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return "bg-green-100 text-green-700 border-green-200 hover:bg-green-100";
            case 'Checked-In': return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100";
            case 'Cancelled': return "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
            case 'Rescheduled': return "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100";
            case 'No-Show': return "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100";
            case 'Scheduled': return "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100";
            default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
        }
    };

    const getStatusColorFilled = (status: string) => {
        switch (status) {
            case 'Completed': return "bg-green-500 text-white border-green-600 hover:bg-green-600 shadow-md shadow-green-500/20";
            case 'Checked-In': return "bg-blue-500 text-white border-blue-600 hover:bg-blue-600 shadow-md shadow-blue-500/20";
            case 'Cancelled': return "bg-red-500 text-white border-red-600 hover:bg-red-600 shadow-md shadow-red-500/20";
            case 'Rescheduled': return "bg-orange-500 text-white border-orange-600 hover:bg-orange-600 shadow-md shadow-orange-500/20";
            case 'No-Show': return "bg-gray-500 text-white border-gray-600 hover:bg-gray-600 shadow-md shadow-gray-500/20";
            case 'Scheduled': return "bg-purple-500 text-white border-purple-600 hover:bg-purple-600 shadow-md shadow-purple-500/20";
            default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
        }
    };


    // --- Actions ---
    const handleSaveAppointment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreateAppointment) return;

        const doctor = doctors.find(d => String(d.doctorid) === String(formData.doctorId));
        let targetPatientId = formData.patientId || "p_temp"; // If admin selects
        let targetPatientName = formData.patientName;

        if (user?.role === 'Patient') {
            const patientProfile = patients.find(p => String(p.userid) === String(user.id));
            targetPatientId = patientProfile?.patientid || (user as any)?.patientid || user.id;
            targetPatientName = patientProfile?.patientname || user.name;
        } else {
            // If admin, find patient name from ID
            const p = patients.find(pat => String(pat.patientid) === String(formData.patientId));
            if (p) targetPatientName = p.patientname;
        }

        addAppointment({
            hospitalid: doctor?.hospitalid,
            patientid: targetPatientId,
            patientName: targetPatientName,
            doctorid: formData.doctorId,
            doctorName: doctor?.doctorname || "Unknown Doctor",
            appointmentdatetime: `${formData.date}T${formData.time}:00`,
            type: formData.type,
            status: "Scheduled"
        });

        addToast("Appointment scheduled successfully!", "success");
        setIsAddModalOpen(false);
        setFormData({ patientName: "", patientId: "", doctorId: "", date: "", time: "", type: "General Checkup" });
    };

    const handleStatusUpdate = (status: any) => {
        if (!selectedAppointment || !canManageStatus) return;
        updateAppointment(selectedAppointment.appointmentid, { status });
        setSelectedAppointment(null);
        addToast(`Appointment marked as ${status}`, "info");
    };

    const handleReschedule = () => {
        if (!selectedAppointment) return;
        updateAppointment(selectedAppointment.appointmentid, {
            appointmentdatetime: `${editDate}T${editTime}:00`,
            status: "Rescheduled"
        });
        setSelectedAppointment(null);
        addToast("Appointment rescheduled successfully", "success");
    };

    // --- Calendar Logic ---
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
        setCurrentDate(new Date(newDate));
    };

    const jumpToToday = () => setCurrentDate(new Date());

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDate = new Date(currentDate.setFullYear(parseInt(e.target.value)));
        setCurrentDate(new Date(newDate));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDate = new Date(currentDate.setMonth(parseInt(e.target.value)));
        setCurrentDate(new Date(newDate));
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const blanks = Array.from({ length: firstDay }, (_, i) => i);

        return (
            <div className="bg-card rounded-lg border shadow-sm">
                <div className="grid grid-cols-7 border-b">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} className="p-3 text-center text-sm font-semibold text-muted-foreground uppercase">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr">
                    {blanks.map(b => <div key={`blank-${b}`} className="min-h-[120px] border-r border-b bg-muted/5" />)}

                    {days.map(day => {
                        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const dayAppts = filteredAppointments.filter(a => getApptDate(a.appointmentdatetime) === dateStr);
                        const displayAppts = dayAppts.slice(0, 3);
                        const remaining = dayAppts.length - 3;

                        return (
                            <div key={day} className="min-h-[120px] p-2 border-r border-b transition-colors hover:bg-muted/5 relative group">
                                <span className={cn(
                                    "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full mb-1",
                                    dateStr === getApptDate(new Date().toISOString())
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground"
                                )}>{day}</span>
                                <div className="space-y-1">
                                    {displayAppts.map(apt => (
                                        <div
                                            key={apt.appointmentid}
                                            onClick={() => { setSelectedAppointment(apt); setIsEditing(false); setOpenedInEditMode(false); }}
                                            className={cn(
                                                "px-1.5 py-0.5 text-[10px] rounded truncate cursor-pointer transition-all border-l-2 hover:brightness-95",
                                                getStatusColor(apt.status)
                                            )}
                                        >
                                            {getApptTime(apt.appointmentdatetime)} {user?.role === 'Patient' ? apt.doctorName?.split(' ')[1] : apt.patientName}
                                        </div>
                                    ))}
                                    {remaining > 0 && (
                                        <div className="text-[10px] text-muted-foreground font-medium pl-1">
                                            +{remaining} more...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    };

    // --- Options for Selects ---
    const filteredDoctorsForOptions = effectiveHospitalId
        ? doctors.filter(d => String(d.hospitalid) === String(effectiveHospitalId))
        : doctors;

    const filteredPatientsForOptions = effectiveHospitalId
        ? patients.filter(p => !p.hospitalid || String(p.hospitalid) === String(effectiveHospitalId))
        : patients;

    const doctorOptions = filteredDoctorsForOptions.map(d => ({ label: d.doctorname, value: d.doctorid }));
    const patientOptions = filteredPatientsForOptions.map(p => ({ label: p.patientname, value: p.patientid }));
    const statusOptions = ["All", "Scheduled", "Checked-In", "Completed", "Cancelled", "No-Show", "Rescheduled"].map(s => ({ label: s, value: s }));

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Appointments</h2>
                        <p className="text-muted-foreground">Manage schedule and bookings</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-muted/50 rounded-lg p-1 border">
                            <button onClick={() => setView("list")} className={cn("p-2 rounded-md transition-all", view === "list" && "bg-background shadow-sm text-primary")}>
                                <List className="h-4 w-4" />
                            </button>
                            <button onClick={() => setView("calendar")} className={cn("p-2 rounded-md transition-all", view === "calendar" && "bg-background shadow-sm text-primary")}>
                                <Grid className="h-4 w-4" />
                            </button>
                        </div>
                        {canCreateAppointment && (
                            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                <Tooltip content="Book new appointment" side="left">
                                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shadow-sm text-white">
                                        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Book Appointment</span><span className="sm:hidden">Book</span>
                                    </Button>
                                </Tooltip>
                                <DialogContent className="max-w-[95vw] sm:max-w-[500px] w-full max-h-[90vh] overflow-y-auto scrollbar-thin gap-4 border-none shadow-xl rounded-xl sm:rounded-2xl p-6">
                                    <DialogHeader className="pb-2 border-b">
                                        <DialogTitle className="text-xl font-bold tracking-tight text-primary">Schedule Appointment</DialogTitle>
                                        <DialogDescription className="text-sm">Enter details to book a new appointment.</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSaveAppointment} className="space-y-4 pt-2">
                                        {isAdminOrRecep && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-muted-foreground uppercase">Patient</Label>
                                                <SearchableSelect
                                                    options={patientOptions}
                                                    value={formData.patientId}
                                                    onChange={(val) => setFormData({ ...formData, patientId: val })}
                                                    placeholder="Select Patient"
                                                    className="h-10"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase">Doctor</Label>
                                            <SearchableSelect
                                                options={doctorOptions}
                                                value={formData.doctorId}
                                                onChange={(val) => setFormData({ ...formData, doctorId: val })}
                                                placeholder="Select Doctor"
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase">Type</Label>
                                            <Input
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                placeholder="e.g. Checkup, Consultation"
                                                className="bg-muted/30 border-border/50 h-10"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-muted-foreground uppercase">Date</Label>
                                                <DatePicker
                                                    value={formData.date}
                                                    onChange={(val) => setFormData({ ...formData, date: val })}
                                                    placeholder="Select date"
                                                    className="w-full bg-muted/30 border-border/50 h-10"
                                                    minDate={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-muted-foreground uppercase">Time</Label>
                                                <TimePicker
                                                    value={formData.time}
                                                    onChange={(val) => setFormData({ ...formData, time: val })}
                                                    containerClassName="w-full"
                                                    minTime={formData.date === new Date().toISOString().split('T')[0] ? new Date().toTimeString().substring(0, 5) : undefined}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <Button type="submit" className="w-full text-white shadow-md h-10 text-base font-medium">Confirm Booking</Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="bg-muted/30 p-4 rounded-lg border flex flex-col items-end gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
                        {user?.role !== 'Doctor' && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Doctor</Label>
                                <SearchableSelect
                                    options={doctorOptions}
                                    value={doctorFilter}
                                    onChange={setDoctorFilter}
                                    placeholder="Filter by Doctor..."
                                    className="w-full"
                                />
                            </div>
                        )}
                        {user?.role !== 'Patient' && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Patient</Label>
                                <SearchableSelect
                                    options={patientOptions}
                                    value={patientFilter}
                                    onChange={setPatientFilter}
                                    placeholder="Filter by Patient..."
                                    className="w-full"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Status</Label>
                            <CustomDropdown
                                options={statusOptions}
                                value={statusFilter}
                                onChange={setStatusFilter}
                                placeholder="Filter Status"
                                className="w-full bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Date (Start)</Label>
                            <DatePicker value={dateStart} onChange={setDateStart} placeholder="Start Date" className="w-full bg-background/50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Date (End)</Label>
                            <DatePicker value={dateEnd} onChange={setDateEnd} placeholder="End Date" className="w-full bg-background/50" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Tooltip content="Reset Filters" side="top">
                            <Button variant="outline" size="sm" onClick={resetFilters}>Reset</Button>
                        </Tooltip>
                        <Tooltip content="Apply Filters" side="top">
                            <Button size="sm" className="text-white" onClick={handleApplyFilters}>Apply Filters</Button>
                        </Tooltip>
                    </div>
                </div>

                {/* Content */}
                {view === "list" ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredAppointments.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-muted/20 rounded-lg border border-dashed text-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Search className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium">No appointments found</h3>
                                <p className="text-muted-foreground text-center max-w-sm mt-1">Try adjusting filters.</p>
                                <Button variant="link" onClick={resetFilters} className="mt-2">Clear filters</Button>
                            </div>
                        )}
                        {filteredAppointments.map(apt => (
                            <Card
                                key={apt.appointmentid}
                                className="group relative overflow-hidden transition-all duration-300 border hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:-translate-y-1"
                            >
                                <div className="absolute top-3 right-3 flex gap-2 transition-opacity z-10">
                                    <Tooltip content="View Details" side="top">
                                        <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm" onClick={() => { setSelectedAppointment(apt); setIsEditing(false); setOpenedInEditMode(false); }}>
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </Tooltip>
                                    {(canManageStatus || (user?.role === 'Patient' && !['Checked-In', 'Completed', 'Cancelled'].includes(apt.status))) && apt.status !== 'Completed' && (
                                        <Tooltip content="Edit / Reschedule" side="top">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm" onClick={() => {
                                                setSelectedAppointment(apt);
                                                setIsEditing(true);
                                                setOpenedInEditMode(true);
                                                setEditDate(getApptDate(apt.appointmentdatetime));
                                                // Extract HH:MM directly from ISO string for the picker (24h format)
                                                setEditTime(apt.appointmentdatetime.split('T')[1]?.substring(0, 5) || "");
                                            }}>
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </Tooltip>
                                    )}
                                </div>

                                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                    <Avatar className="h-14 w-14 border-2 border-background shadow-sm group-hover:scale-105 transition-transform duration-300">
                                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                                            {user?.role === 'Patient' ? (apt.doctorName?.charAt(0) || "D") : (apt.patientName?.charAt(0) || "P")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                        <CardTitle className="text-lg truncate">
                                            {user?.role === 'Patient' ? apt.doctorName : apt.patientName}
                                        </CardTitle>
                                        <CardDescription className="font-mono text-xs mt-1 truncate">
                                            {user?.role === 'Patient' ? "Doctor" : "Patient"} • {apt.type}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4 border-t mt-2">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-primary/70 shrink-0" />
                                            <span className="font-medium text-foreground">{getApptDate(apt.appointmentdatetime)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-primary/70 shrink-0" />
                                            <span>{getApptTime(apt.appointmentdatetime)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 pointer-events-none border", getStatusColor(apt.status))}>
                                                {apt.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-2 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={jumpToToday}>Today</Button>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    className="h-9 rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={currentDate.getMonth()}
                                    onChange={handleMonthChange}
                                >
                                    {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                </select>
                                <select
                                    className="h-9 rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={currentDate.getFullYear()}
                                    onChange={handleYearChange}
                                >
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {renderCalendar()}
                    </div>
                )}

                {/* View/Edit Details Dialog */}
                <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
                    <DialogContent className="max-w-[95vw] sm:max-w-[500px] w-full max-h-[85vh] sm:max-h-none overflow-y-auto sm:overflow-visible p-0 gap-0 border-none shadow-2xl rounded-xl sm:rounded-2xl scrollbar-hide [&>button]:hidden">
                        <DialogHeader className="p-0 shrink-0">
                            {/* Glassmorphism Header Background */}
                            <div className="h-24 sm:h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent w-full relative overflow-hidden rounded-t-xl sm:rounded-t-2xl">
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-md dark:bg-black/40" />
                                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                                    <Badge variant="secondary" className={cn("px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider shadow-sm border-white/20", getStatusColorFilled(selectedAppointment?.status || ''))}>
                                        {selectedAppointment?.status}
                                    </Badge>
                                </div>
                                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/50 hover:text-white hover:bg-white/20 rounded-full transition-colors" onClick={() => setSelectedAppointment(null)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                {/* Decorative Circles */}
                                <div className="absolute -top-10 -left-10 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-primary/20 blur-3xl" />
                                <div className="absolute bottom-0 right-0 h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-blue-400/10 blur-2xl" />
                            </div>

                            <div className="px-4 sm:px-6 relative flex flex-col items-center -mt-10 sm:-mt-12 text-center">
                                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-[3px] sm:border-[4px] border-background shadow-xl bg-background">
                                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary text-2xl sm:text-3xl font-bold">
                                        {user?.role === 'Patient' ? selectedAppointment?.doctorName?.charAt(0) : selectedAppointment?.patientName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="pt-2 sm:pt-3 pb-4 sm:pb-6 space-y-1">
                                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight px-2">
                                        {user?.role === 'Patient' ? selectedAppointment?.doctorName : selectedAppointment?.patientName}
                                    </DialogTitle>
                                    <DialogDescription className="flex items-center justify-center gap-1.5 sm:gap-2 text-primary font-medium bg-primary/5 py-0.5 px-2.5 sm:py-1 sm:px-3 rounded-full w-fit mx-auto border border-primary/10 text-xs sm:text-sm">
                                        {user?.role === 'Patient' ? <Stethoscope className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                                        {user?.role === 'Patient' ? "Doctor" : "Patient"}
                                        <span className="text-muted-foreground/30 mx-1">|</span>
                                        <span className="text-muted-foreground">{selectedAppointment?.type}</span>
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedAppointment && (
                            <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4 sm:space-y-6">
                                {isEditing ? (
                                    <div className="space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="bg-secondary/40 p-3 sm:p-5 rounded-xl border border-border/50 space-y-3 sm:space-y-4 shadow-inner">
                                            <div className="flex items-center justify-between border-b pb-2 sm:pb-3 mb-1 sm:mb-2">
                                                <Label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> Reschedule
                                                </Label>
                                                <Badge variant="outline" className="text-[10px] bg-background">EDITING</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div className="space-y-1.5 sm:space-y-2">
                                                    <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground">New Date</Label>
                                                    <DatePicker
                                                        value={editDate}
                                                        onChange={setEditDate}
                                                        placeholder="Pick a date"
                                                        className="w-full bg-background/50 border-input/60 focus-within:border-primary/50 transition-colors h-9 text-sm rounded-lg"
                                                        minDate={new Date().toISOString().split('T')[0]}
                                                        disabled={selectedAppointment?.status === 'Completed'}
                                                    />
                                                </div>
                                                <div className="space-y-1.5 sm:space-y-2">
                                                    <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground">New Time</Label>
                                                    <TimePicker
                                                        value={editTime}
                                                        onChange={setEditTime}
                                                        containerClassName="w-full"
                                                        minTime={editDate === new Date().toISOString().split('T')[0] ? new Date().toTimeString().substring(0, 5) : undefined}
                                                        disabled={selectedAppointment?.status === 'Completed'}
                                                    />
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={handleReschedule} disabled={selectedAppointment?.status === 'Completed'} className="w-full text-white gap-2 mt-1 shadow-sm h-9 rounded-lg">
                                                <Clock className="h-3.5 w-3.5" /> Confirm New Schedule
                                            </Button>
                                        </div>

                                        {canManageStatus && (
                                            <div className="space-y-2 sm:space-y-3">
                                                <Label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Update Status</Label>
                                                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                                    <Button variant="outline" disabled={selectedAppointment?.status === 'Checked-In'} onClick={() => handleStatusUpdate("Checked-In")} className="justify-start h-auto py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm border-green-200/60 bg-green-50/50 hover:bg-green-100/50 hover:border-green-300 text-green-700 dark:bg-green-900/10 dark:text-green-400 rounded-lg">
                                                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 mr-2 shrink-0" /> Check-In
                                                    </Button>
                                                    <Button variant="outline" disabled={selectedAppointment?.status === 'Completed'} onClick={() => handleStatusUpdate("Completed")} className="justify-start h-auto py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm border-blue-200/60 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-300 text-blue-700 dark:bg-blue-900/10 dark:text-blue-400 rounded-lg">
                                                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 mr-2 shrink-0" /> Complete
                                                    </Button>
                                                    <Button variant="outline" disabled={selectedAppointment?.status === 'Cancelled'} onClick={() => handleStatusUpdate("Cancelled")} className="justify-start h-auto py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm border-red-200/60 bg-red-50/50 hover:bg-red-100/50 hover:border-red-300 text-red-700 dark:bg-red-900/10 dark:text-red-400 rounded-lg">
                                                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500 mr-2 shrink-0" /> Cancel
                                                    </Button>
                                                    <Button variant="outline" disabled={selectedAppointment?.status === 'No-Show'} onClick={() => handleStatusUpdate("No-Show")} className="justify-start h-auto py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm border-gray-200/60 bg-gray-50/50 hover:bg-gray-100/50 hover:border-gray-300 text-gray-700 dark:bg-gray-800/20 dark:text-gray-400 rounded-lg">
                                                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-500 mr-2 shrink-0" /> No Show
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex flex-col gap-1 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors group">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-0.5 sm:mb-1">
                                                <div className="p-1 sm:p-1.5 rounded-md bg-background shadow-sm text-primary group-hover:text-primary transition-colors">
                                                    <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
                                            </div>
                                            <p className="font-semibold text-base sm:text-lg pl-1">{getApptDate(selectedAppointment.appointmentdatetime)}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors group">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-0.5 sm:mb-1">
                                                <div className="p-1 sm:p-1.5 rounded-md bg-background shadow-sm text-primary group-hover:text-primary transition-colors">
                                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Time</span>
                                            </div>
                                            <p className="font-semibold text-base sm:text-lg pl-1">{getApptTime(selectedAppointment.appointmentdatetime)}</p>
                                        </div>
                                        <div className="col-span-2 flex flex-col gap-1 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors group">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-1 sm:mb-2">
                                                <div className="p-1 sm:p-1.5 rounded-md bg-background shadow-sm text-primary group-hover:text-primary transition-colors">
                                                    <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Provider Details</span>
                                            </div>
                                            <div className="flex justify-between items-center pl-1">
                                                <div className="overflow-hidden">
                                                    <p className="font-semibold text-sm sm:text-base truncate">{selectedAppointment.doctorName}</p>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">General Medicine</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground shrink-0">
                                                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-col sm:flex-row gap-2 sm:gap-3 py-2 border-t pt-4 sm:pt-6 mt-2 sm:mt-4">
                                    {!isEditing && (canManageStatus || user?.role === 'Patient') && selectedAppointment.status !== 'Completed' && (
                                        <Tooltip content={canManageStatus ? "Update Status or Reschedule" : "Store/Change Appointment Time"} side="top">
                                            <Button className="w-full text-white shadow-md hover:shadow-lg transition-all h-9 sm:h-10 text-xs sm:text-sm" onClick={() => {
                                                setIsEditing(true);
                                                setOpenedInEditMode(true);
                                                setEditDate(getApptDate(selectedAppointment.appointmentdatetime));
                                                // Extract HH:MM directly from ISO for picker
                                                setEditTime(selectedAppointment.appointmentdatetime.split('T')[1]?.substring(0, 5) || "");
                                            }}>
                                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                                {canManageStatus ? "Manage Appointment" : "Reschedule Appointment"}
                                            </Button>
                                        </Tooltip>
                                    )}

                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </RoleGuard >
    );
}

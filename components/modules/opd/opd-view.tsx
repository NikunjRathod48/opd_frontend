"use client";

import { useAuth, UserRole } from "@/context/auth-context";
import { useData, OPDVisit } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    FileText, Activity, Clock, X, Stethoscope, Eye, Plus, Trash2,
    CalendarDays, Pill, User, Pencil, Search, Filter, RefreshCw,
    ChevronRight, FlaskConical, ClipboardList, LayoutList,
    CheckCircle2, AlertCircle, Hash, ChevronDown, SlidersHorizontal,
    TrendingUp, Users, Zap, ArrowUpRight, MoreHorizontal, HeartPulse,
    Microscope, FileSignature, Syringe, ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VitalsForm } from "./vitals-form";

interface OPDViewProps {
    allowedRoles?: UserRole[];
    readOnly?: boolean;
    hospitalId?: string;
}

export function OPDView({ allowedRoles = ['HospitalAdmin', 'Doctor', 'Patient'], readOnly = false, hospitalId }: OPDViewProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { opdVisits, updateOPDVisit, patients, specializations, doctors, subTreatments, addReceipt, diagnoses, medicines, tests, savePrescription, saveOpdTests, saveOpdProcedures, saveBill, getOpdDetails, fetchOPDVisits } = useData();
    const { addToast } = useToast();

    useEffect(() => {
        fetchOPDVisits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [filters, setFilters] = useState({ doctorId: "", status: "All", specializationId: "", patientId: "", startDate: "", endDate: "" });
    const [activeFilters, setActiveFilters] = useState(filters);
    const [showFilters, setShowFilters] = useState(false);

    const handleApplyFilters = () => setActiveFilters(filters);
    const resetFilters = () => {
        const r = { doctorId: "", status: "All", specializationId: "", patientId: "", startDate: "", endDate: "" };
        setFilters(r); setActiveFilters(r);
    };

    const [selectedOPD, setSelectedOPD] = useState<OPDVisit | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [notes, setNotes] = useState("");
    const [diagnosis, setDiagnosis] = useState("");
    const [status, setStatus] = useState<"Active" | "Discharged">("Active");

    const [prescribedItems, setPrescribedItems] = useState<{ id: string, name: string, rate: number, qty: number, isNew?: boolean }[]>([]);
    const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
    const [treatmentQty, setTreatmentQty] = useState(1);

    const [prescribedMedicines, setPrescribedMedicines] = useState<{ id: string, name: string, dosage: string, qty: number, duration: number, instructions: string, isNew?: boolean }[]>([]);
    const [selectedMedicineId, setSelectedMedicineId] = useState("");
    const [medicineDosage, setMedicineDosage] = useState("1-0-1");
    const [medicineDuration, setMedicineDuration] = useState(5);
    const [medicineQty, setMedicineQty] = useState(10);
    const [medicineInstructions, setMedicineInstructions] = useState("After meals");

    useEffect(() => {
        if (!medicineDosage || !medicineDuration) return;
        const totalPerDay = medicineDosage.split(/[^0-9.]+/).reduce((sum, val) => sum + (Number(val) || 0), 0);
        if (totalPerDay > 0) setMedicineQty(totalPerDay * medicineDuration);
    }, [medicineDosage, medicineDuration]);

    const [prescribedTests, setPrescribedTests] = useState<{ id: string, name: string, rate: number, isNew?: boolean }[]>([]);
    const [selectedTestId, setSelectedTestId] = useState("");

    const isDoctor = user?.role === 'Doctor';
    const isReceptionist = user?.role === 'Receptionist';
    const isAdmin = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin'].includes(user?.role || '');
    const canEdit = !readOnly && (isDoctor || isReceptionist);

    const effectiveHospitalId = hospitalId || (['HospitalAdmin', 'Receptionist', 'Doctor'].includes(user?.role || '') ? user?.hospitalid : undefined);

    const filteredOPD = (opdVisits || []).filter(visit => {
        if (!user) return false;
        if (effectiveHospitalId && String(visit.hospitalid) !== String(effectiveHospitalId)) return false;
        const matchesDoctor = !activeFilters.doctorId || visit.doctorid === activeFilters.doctorId;
        const matchesStatus = activeFilters.status === "All" || visit.status === activeFilters.status;
        const matchesPatient = !activeFilters.patientId || visit.patientid === activeFilters.patientId;
        let matchesDate = true;
        if (activeFilters.startDate) matchesDate = matchesDate && visit.visitdatetime >= activeFilters.startDate;
        if (activeFilters.endDate) matchesDate = matchesDate && visit.visitdatetime <= `${activeFilters.endDate}T23:59:59`;
        let matchesSpec = true;
        if (activeFilters.specializationId) {
            const doc = doctors.find(d => d.doctorid === visit.doctorid);
            matchesSpec = doc?.specializationid === activeFilters.specializationId;
        }
        if (!matchesDoctor || !matchesStatus || !matchesPatient || !matchesDate || !matchesSpec) return false;
        if (isAdmin || isReceptionist) return true;
        if (isDoctor) {
            const doctorProfile = doctors.find((d: any) => String(d.userid) === String(user.id));
            if (doctorProfile && visit.doctorid === doctorProfile.doctorid) return true;
            if (visit.doctorid === user.id) return true;
            return false;
        }
        if (user.role === 'Patient') {
            if (visit.patientid === user.id) return true;
            return visit.patientName === user.name;
        }
        return false;
    }).sort((a, b) => new Date(b.visitdatetime).getTime() - new Date(a.visitdatetime).getTime());

    const handleAddTreatment = () => {
        if (!selectedTreatmentId) return;
        const treatment = subTreatments.find(t => t.subtreatmenttypeid === selectedTreatmentId);
        if (treatment) {
            setPrescribedItems(prev => [...prev, { id: treatment.subtreatmenttypeid, name: treatment.subtreatmentname, rate: treatment.rate, qty: treatmentQty, isNew: true }]);
            setSelectedTreatmentId(""); setTreatmentQty(1);
        }
    };
    const handleRemoveTreatment = (index: number) => setPrescribedItems(prev => prev.filter((_, i) => i !== index));

    const handleAddMedicine = () => {
        if (!selectedMedicineId) return;
        const med = medicines.find(m => String(m.medicine_id) === String(selectedMedicineId));
        if (med) {
            const alreadyPrescribedQty = prescribedMedicines.filter(item => String(item.id) === String(selectedMedicineId)).reduce((sum, item) => sum + item.qty, 0);
            const availableStock = (med.stock_quantity || 0) - alreadyPrescribedQty;
            if (availableStock < medicineQty) { addToast(`Insufficient stock for ${med.medicine_name}. Only ${availableStock} more available.`, "error"); return; }
            setPrescribedMedicines(prev => [...prev, { id: String(med.medicine_id), name: med.medicine_name, dosage: medicineDosage, qty: medicineQty, duration: medicineDuration, instructions: medicineInstructions, isNew: true }]);
            setSelectedMedicineId(""); setMedicineQty(10); setMedicineDosage("1-0-1"); setMedicineDuration(5); setMedicineInstructions("After meals");
        }
    };
    const handleRemoveMedicine = (index: number) => setPrescribedMedicines(prev => prev.filter((_, i) => i !== index));

    const handleAddTest = () => {
        if (!selectedTestId) return;
        const test = tests.find(t => t.test_id === selectedTestId);
        if (test) { setPrescribedTests(prev => [...prev, { id: test.test_id, name: test.test_name, rate: test.price, isNew: true }]); setSelectedTestId(""); }
    };
    const handleRemoveTest = (index: number) => setPrescribedTests(prev => prev.filter((_, i) => i !== index));

    const handleEditSave = async () => {
        if (!selectedOPD) return;
        setIsLoading(true);
        await updateOPDVisit(selectedOPD.opdid, { diagnosis, notes, status });
        const newMedicines = prescribedMedicines.filter(m => m.isNew);
        const newTests = prescribedTests.filter(t => t.isNew);
        const newProcedures = prescribedItems.filter(p => p.isNew);
        if (newMedicines.length > 0) await savePrescription({ visit_id: Number(selectedOPD.opdid), doctor_id: Number(selectedOPD.doctorid), notes, items: newMedicines.map(m => ({ medicine_id: Number(m.id), dosage: m.dosage, quantity: m.qty, duration_days: m.duration, instructions: m.instructions })) });
        if (newTests.length > 0) await saveOpdTests({ visit_id: Number(selectedOPD.opdid), tests: newTests.map(t => ({ test_id: Number(t.id), test_status: "Ordered" })) });
        if (newProcedures.length > 0) await saveOpdProcedures({ visit_id: Number(selectedOPD.opdid), procedures: newProcedures.map(p => ({ procedure_id: Number(p.id), procedure_date: new Date().toISOString(), remarks: p.name })) });
        const hasNewItems = newMedicines.length > 0 || newTests.length > 0 || newProcedures.length > 0;
        addToast(hasNewItems ? "OPD Record updated with new prescribed items" : "OPD Record updated successfully", "success");
        setIsEditModalOpen(false); setPrescribedItems([]); setPrescribedMedicines([]); setPrescribedTests([]);
        setIsLoading(false);
        fetchOPDVisits();
    };

    const fetchAndSetDetails = async (visit: OPDVisit) => {
        setSelectedOPD(visit); setDiagnosis(visit.diagnosis || ""); setNotes(visit.notes || ""); setStatus(visit.status as "Active" | "Discharged");
        setPrescribedItems([]); setPrescribedMedicines([]); setPrescribedTests([]);
        try {
            const details = await getOpdDetails(visit.opdid);
            if (details) {
                if (details.opd_procedures?.length > 0) setPrescribedItems(details.opd_procedures.map((p: any) => { const m = subTreatments.find(st => st.subtreatmenttypeid === p.procedure_id?.toString()); return { id: p.procedure_id?.toString(), name: p.procedures?.procedure_name || p.remarks || "Unknown Procedure", rate: m?.rate || 0, qty: 1 }; }));
                if (details.opd_tests?.length > 0) setPrescribedTests(details.opd_tests.map((t: any) => { const m = tests.find(ti => ti.test_id === t.test_id?.toString()); return { id: t.test_id?.toString(), name: t.tests?.test_name || "Unknown Test", rate: m?.price || 0 }; }));
                if (details.prescriptions?.length > 0) { const allMeds: any[] = []; details.prescriptions.forEach((rx: any) => { rx.prescription_items?.forEach((item: any) => allMeds.push({ id: item.medicine_id?.toString(), name: item.medicines?.medicine_name || "Unknown Medicine", dosage: item.dosage || "", qty: item.quantity || 1, duration: item.duration_days || 1, instructions: item.instructions || "" })); }); setPrescribedMedicines(allMeds); }
            }
        } catch (error) { console.error("Error fetching OPD details:", error); }
    };

    const openEditModal = async (visit: OPDVisit) => { await fetchAndSetDetails(visit); setIsEditMode(true); setIsEditModalOpen(true); };
    const openViewModal = async (visit: OPDVisit) => { await fetchAndSetDetails(visit); setIsEditMode(false); setIsEditModalOpen(true); };

    const filteredDoctorsForOptions = effectiveHospitalId ? doctors.filter(d => String(d.hospitalid) === String(effectiveHospitalId)) : doctors;
    const filteredPatientsForOptions = effectiveHospitalId ? patients.filter(p => !p.hospitalid || String(p.hospitalid) === String(effectiveHospitalId)) : patients;
    const filteredSubTreatmentsForOptions = effectiveHospitalId ? subTreatments.filter((t: any) => t.is_linked !== false) : subTreatments;
    const filteredMedicinesForOptions = effectiveHospitalId ? medicines.filter((m: any) => m.is_linked !== false) : medicines;
    const filteredTestsForOptions = effectiveHospitalId ? tests.filter((t: any) => t.is_linked !== false) : tests;

    const doctorOptions = filteredDoctorsForOptions.map(d => ({ label: d.doctorname, value: d.doctorid }));
    const patientOptions = filteredPatientsForOptions.map(p => ({ label: p.patientname, value: p.patientid }));
    const specializationOptions = specializations.map(s => ({ label: s.specializationname, value: s.specializationid }));
    const statusOptions = ["All", "Active", "Discharged"].map(s => ({ label: s, value: s }));
    const treatmentOptions = filteredSubTreatmentsForOptions.map(t => ({ label: `${t.subtreatmentname} (₹${t.rate})`, value: t.subtreatmenttypeid }));
    const medicineOptions = filteredMedicinesForOptions.map(m => { const aq = prescribedMedicines.filter(i => String(i.id) === String(m.medicine_id)).reduce((s, i) => s + i.qty, 0); const stock = (m.stock_quantity || 0) - aq; return { label: `${m.medicine_name} (${m.strength}) - ${stock <= 0 ? "Out of Stock" : `Stock: ${stock}`}`, value: String(m.medicine_id) }; });
    const selectedMedicineDetails = medicines.find(m => String(m.medicine_id) === String(selectedMedicineId));
    const testOptions = filteredTestsForOptions.map(t => ({ label: `${t.test_name} (₹${t.price})`, value: t.test_id }));

    const activeFilterCount = [activeFilters.doctorId, activeFilters.patientId, activeFilters.specializationId, activeFilters.startDate, activeFilters.endDate].filter(Boolean).length + (activeFilters.status !== "All" ? 1 : 0);
    const totalCount = filteredOPD.length;
    const activeCount = filteredOPD.filter(v => v.status === 'Active').length;
    const dischargedCount = filteredOPD.filter(v => v.status === 'Discharged').length;

    // Color palette per avatar
    const avatarColors = [
        "from-blue-500 to-cyan-400",
        "from-violet-500 to-purple-400",
        "from-emerald-500 to-teal-400",
        "from-rose-500 to-pink-400",
        "from-amber-500 to-orange-400",
        "from-indigo-500 to-blue-400",
    ];
    const getAvatarColor = (name: string) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
                .opd-root { font-family: 'DM Sans', sans-serif; }
                .opd-root * { font-family: inherit; }
                .opd-mono { font-family: 'DM Mono', monospace; }
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2); opacity: 0; }
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up { animation: slide-up 0.3s ease both; }
                .animate-slide-up-delay-1 { animation: slide-up 0.3s 0.05s ease both; }
                .animate-slide-up-delay-2 { animation: slide-up 0.3s 0.1s ease both; }
                .animate-slide-up-delay-3 { animation: slide-up 0.3s 0.15s ease both; }
                .row-hover:hover .row-actions { opacity: 1; transform: translateX(0); }
                .row-actions { opacity: 0; transform: translateX(6px); transition: all 0.2s ease; }
                .stat-card:hover .stat-glow { opacity: 1; }
                .stat-glow { opacity: 0; transition: opacity 0.3s ease; }
                .tab-pill[data-state=active] { background: white; color: #1e293b; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
                .dark .tab-pill[data-state=active] { background: #1e293b; color: #f1f5f9; }
                .filter-chip { transition: all 0.15s ease; }
                .filter-chip:hover { transform: translateY(-1px); }
            `}</style>

            <div className="opd-root space-y-6 animate-slide-up">
                
                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="animate-slide-up">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Outpatient Department</span>
                        </div>
                        <h2 className="text-[28px] font-bold tracking-tight text-foreground leading-none">Visit Records</h2>
                        <p className="text-sm text-muted-foreground mt-1.5">Manage and review all outpatient visits</p>
                    </div>
                    <div className="flex items-center gap-2 animate-slide-up-delay-1">
                        <button
                            onClick={() => fetchOPDVisits()}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-all"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowFilters(p => !p)}
                            className={cn(
                                "inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium transition-all relative",
                                showFilters
                                    ? "bg-blue-600 text-white border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                                    : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-background">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-3 gap-3 animate-slide-up-delay-1">
                    {/* Total */}
                    <div className="stat-card relative rounded-2xl border border-border/50 bg-card p-5 overflow-hidden group hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-[0_4px_20px_rgba(37,99,235,0.08)] transition-all">
                        <div className="stat-glow absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 rounded-2xl pointer-events-none" />
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                                <ClipboardList className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{totalCount}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Total visits</p>
                    </div>
                    {/* Active */}
                    <div className="stat-card relative rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/60 to-card dark:from-emerald-950/20 p-5 overflow-hidden group hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                                <HeartPulse className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
                            </div>
                        </div>
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">{activeCount}</p>
                        <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70 mt-1">Active now</p>
                    </div>
                    {/* Discharged */}
                    <div className="stat-card relative rounded-2xl border border-border/50 bg-card p-5 overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all">
                        <div className="stat-glow absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent dark:from-slate-800/20 rounded-2xl pointer-events-none" />
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <CheckCircle2 className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-slate-400 transition-colors" />
                        </div>
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{dischargedCount}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Discharged</p>
                    </div>
                </div>

                {/* ── Filter Panel ── */}
                {showFilters && (
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden animate-slide-up shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-muted/20">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Filters</span>
                            </div>
                            {activeFilterCount > 0 && (
                                <button onClick={resetFilters} className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                                    Clear all
                                </button>
                            )}
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {!isDoctor && user?.role !== 'Patient' && (
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Patient</Label>
                                    <SearchableSelect options={patientOptions} value={filters.patientId} onChange={(val) => setFilters(prev => ({ ...prev, patientId: val }))} placeholder="All patients" className="h-10 w-full" />
                                </div>
                            )}
                            {!isDoctor && user?.role !== 'Patient' && (
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Specialization</Label>
                                    <SearchableSelect options={specializationOptions} value={filters.specializationId} onChange={(val) => setFilters(prev => ({ ...prev, specializationId: val }))} placeholder="All" className="h-10 w-full" />
                                </div>
                            )}
                            {!isDoctor && user?.role !== 'Patient' && (
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Doctor</Label>
                                    <SearchableSelect options={doctorOptions} value={filters.doctorId} onChange={(val) => setFilters(prev => ({ ...prev, doctorId: val }))} placeholder="All doctors" className="h-10 w-full" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From</Label>
                                <DatePicker value={filters.startDate} onChange={(val) => setFilters(prev => ({ ...prev, startDate: val }))} placeholder="Start date" className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</Label>
                                <DatePicker value={filters.endDate} onChange={(val) => setFilters(prev => ({ ...prev, endDate: val }))} placeholder="End date" className="h-10 w-full" minDate={filters.startDate} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                                <CustomDropdown options={statusOptions} value={filters.status} onChange={(val) => setFilters(prev => ({ ...prev, status: val }))} placeholder="All" className="h-10 w-full" />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-border/50 bg-muted/10 flex justify-end gap-2">
                            <button onClick={resetFilters} className="px-5 h-9 text-sm font-medium border border-border/60 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                                Reset
                            </button>
                            <button onClick={() => { handleApplyFilters(); setShowFilters(false); }} className="px-5 h-9 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-[0_2px_8px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.4)] transition-all">
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Table ── */}
                <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] animate-slide-up-delay-2">
                    {/* Header */}
                    <div className="hidden md:grid grid-cols-[2.5fr_2fr_1.5fr_1.5fr_1fr_80px] gap-4 px-6 py-3 border-b border-border/50 bg-muted/30">
                        {[user?.role === 'Patient' ? 'Doctor' : 'Patient', 'Physician', 'Visit Date', 'Diagnosis', 'Status', ''].map((col, i) => (
                            <span key={i} className={cn("text-[11px] font-semibold text-muted-foreground uppercase tracking-wider", i === 5 && "text-right")}>{col}</span>
                        ))}
                    </div>

                    {/* Empty state */}
                    {filteredOPD.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center mb-4">
                                <FileText className="h-7 w-7 text-muted-foreground/30" />
                            </div>
                            <p className="text-base font-semibold text-foreground/80">No records found</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xs">No visits match your current filters. Try adjusting the criteria above.</p>
                            {activeFilterCount > 0 && (
                                <button onClick={resetFilters} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}

                    {/* Rows */}
                    <div className="divide-y divide-border/40">
                        {filteredOPD.map((visit, idx) => {
                            const doctor = doctors.find(d => d.doctorid === visit.doctorid);
                            const specName = doctor?.specializationName || "General";
                            const visitDate = new Date(visit.visitdatetime);
                            const displayName = user?.role === 'Patient' ? visit.doctorName : visit.patientName;
                            const initials = displayName?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
                            const isActive = visit.status === 'Active';
                            const avatarGradient = getAvatarColor(displayName || "");

                            return (
                                <div
                                    key={visit.opdid}
                                    className={cn(
                                        "row-hover group grid grid-cols-1 md:grid-cols-[2.5fr_2fr_1.5fr_1.5fr_1fr_80px] gap-4 px-6 py-4 items-center transition-all duration-150 cursor-pointer relative",
                                        "hover:bg-muted/30"
                                    )}
                                    style={{ animationDelay: `${idx * 30}ms` }}
                                    onClick={() => openViewModal(visit)}
                                >
                                    {/* Active indicator stripe */}
                                    {isActive && (
                                        <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-emerald-500 rounded-r-full opacity-70" />
                                    )}

                                    {/* Patient/Doctor cell */}
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={cn(
                                            "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm bg-gradient-to-br transition-transform group-hover:scale-105",
                                            avatarGradient
                                        )}>
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground/90 truncate">{displayName}</p>
                                            <p className={cn("text-[11px] font-medium mt-0.5 opd-mono uppercase tracking-wider", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60")}>
                                                {visit.opdno}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Doctor + dept */}
                                    <div className="hidden lg:flex flex-col min-w-0 gap-0.5">
                                        {user?.role !== 'Patient' ? (
                                            <>
                                                <span className="text-sm font-medium text-foreground/80 truncate">{visit.doctorName}</span>
                                                <span className="text-[11px] font-medium text-muted-foreground truncate">{specName}</span>
                                            </>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">—</span>
                                        )}
                                    </div>

                                    {/* Visit Date */}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground/80">
                                            {visitDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                        <span className="text-[11px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {visitDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>

                                    {/* Diagnosis */}
                                    <div className="hidden md:block min-w-0">
                                        {visit.diagnosis ? (
                                            <span className="inline-block text-sm font-medium text-foreground/80 bg-muted/60 px-2.5 py-1 rounded-lg max-w-full truncate">
                                                {visit.diagnosis}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-muted-foreground/50 italic">Pending</span>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        {isActive ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-semibold">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                                </span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1 text-xs font-semibold">
                                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                Done
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div
                                        className="row-actions flex items-center justify-end gap-1.5"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <Tooltip content="View" side="left">
                                            <button
                                                className="h-8 w-8 rounded-lg border border-border/60 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border transition-all"
                                                onClick={e => { e.stopPropagation(); openViewModal(visit); }}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                        </Tooltip>
                                        {canEdit && (
                                            <Tooltip content={visit.status === 'Discharged' ? "Cannot edit discharged visit" : "Edit"} side="left">
                                                <button
                                                    disabled={visit.status === 'Discharged'}
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg border border-border/60 bg-background flex items-center justify-center transition-all",
                                                        visit.status === 'Discharged'
                                                            ? "text-muted-foreground/30 cursor-not-allowed opacity-50"
                                                            : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-800"
                                                    )}
                                                    onClick={e => { e.stopPropagation(); openEditModal(visit); }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            </Tooltip>
                                        )}
                                        {isDoctor && (
                                            <Tooltip content="Open Visit Detail" side="left">
                                                <button
                                                    className="h-8 w-8 rounded-lg border border-border/60 bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/30 transition-all"
                                                    onClick={e => { e.stopPropagation(); router.push(`/doctor/opd/${visit.opdid}`); }}
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Detail / Edit Dialog ── */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-[96vw] sm:max-w-5xl w-full max-h-[92vh] p-0 gap-0 border-0 shadow-2xl rounded-2xl [&>button]:hidden overflow-hidden flex flex-col sm:flex-row bg-transparent">
                    <DialogDescription className="sr-only">OPD Visit Details</DialogDescription>

                    {/* ── LEFT SIDEBAR ── */}
                    <div className="hidden sm:flex flex-col w-[260px] shrink-0 bg-[#0f172a] rounded-l-2xl relative overflow-hidden">
                        {/* subtle texture */}
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

                        {/* Close */}
                        <button
                            className="absolute top-4 right-4 h-7 w-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-all z-10"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>

                        {/* Avatar + Name */}
                        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-10 pb-6 border-b border-white/8">
                            {selectedOPD && (() => {
                                const dName = user?.role === 'Patient' ? selectedOPD.doctorName : selectedOPD.patientName;
                                const inits = dName?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
                                const grad = getAvatarColor(dName || "");
                                return (
                                    <>
                                        <div className={cn("h-[72px] w-[72px] rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-xl ring-2 ring-white/10", grad)}>
                                            {inits}
                                        </div>
                                        <DialogTitle className="text-[15px] font-bold text-white leading-snug px-2">
                                            {dName}
                                        </DialogTitle>
                                        <span className={cn(
                                            "mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border",
                                            selectedOPD.status === 'Active'
                                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                                : "bg-white/5 border-white/10 text-white/50"
                                        )}>
                                            {selectedOPD.status === 'Active' && (
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                                                </span>
                                            )}
                                            {selectedOPD.status}
                                        </span>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Visit details */}
                        {selectedOPD && (
                            <div className="relative z-10 flex flex-col gap-4 px-5 py-5">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">OPD No.</p>
                                    <p className="text-sm font-bold text-white/90 opd-mono">{selectedOPD.opdno}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Visit Date</p>
                                    <p className="text-sm font-semibold text-white/90">
                                        {new Date(selectedOPD.visitdatetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                    </p>
                                    <p className="text-[11px] text-white/40">
                                        {new Date(selectedOPD.visitdatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                {user?.role !== 'Patient' && (
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Physician</p>
                                        <p className="text-sm font-semibold text-white/90 leading-snug">{selectedOPD.doctorName}</p>
                                        {doctors.find(d => d.doctorid === selectedOPD.doctorid)?.specializationName && (
                                            <p className="text-[11px] text-white/40">{doctors.find(d => d.doctorid === selectedOPD.doctorid)?.specializationName}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mode badge */}
                        <div className="relative z-10 mt-auto px-5 pb-6">
                            <div className={cn(
                                "rounded-xl px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider border transition-all",
                                isEditMode && canEdit
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                    : "bg-white/5 border-white/8 text-white/30"
                            )}>
                                <span className="flex items-center justify-center gap-2">
                                    {isEditMode && canEdit ? <><Pencil className="h-3 w-3" />Edit Mode</> : <><Eye className="h-3 w-3" />View Only</>}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT CONTENT ── */}
                    <div className="flex flex-col flex-1 min-w-0 bg-card rounded-r-2xl rounded-l-2xl sm:rounded-l-none overflow-hidden relative">
                        {/* Mobile header */}
                        <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b bg-[#0f172a]">
                            <div className="flex items-center gap-2.5">
                                {selectedOPD && (() => {
                                    const dName = user?.role === 'Patient' ? selectedOPD.doctorName : selectedOPD.patientName;
                                    const inits = dName?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
                                    const grad = getAvatarColor(dName || "");
                                    return (
                                        <>
                                            <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br text-white text-xs font-bold flex items-center justify-center", grad)}>{inits}</div>
                                            <span className="text-sm font-semibold text-white truncate">{dName}</span>
                                        </>
                                    );
                                })()}
                            </div>
                            <button className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white" onClick={() => setIsEditModalOpen(false)}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {selectedOPD && (
                            <div className="flex flex-col flex-1 min-h-0 pb-[72px]">
                                <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0">
                                    {/* Tab nav */}
                                    <TabsList className="shrink-0 h-12 w-full rounded-none border-b border-border/60 bg-muted/20 p-1.5 px-3 flex justify-start gap-1 overflow-x-auto">
                                        {[
                                            { value: "details", label: "Overview", icon: FileSignature },
                                            { value: "vitals", label: "Vitals", icon: HeartPulse },
                                            { value: "treatments", label: "Procedures", icon: Syringe },
                                            { value: "prescriptions", label: "Rx", icon: Pill },
                                            { value: "tests", label: "Lab Tests", icon: Microscope },
                                        ].map(tab => (
                                            <TabsTrigger
                                                key={tab.value}
                                                value={tab.value}
                                                className="tab-pill h-8 px-3.5 rounded-lg text-[12px] font-semibold text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1.5 shrink-0 transition-all"
                                            >
                                                <tab.icon className="h-3.5 w-3.5" />
                                                {tab.label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>

                                    <div className="overflow-y-auto flex-1 p-5 sm:p-6">
                                        {/* ── DETAILS TAB ── */}
                                        <TabsContent value="details" className="mt-0">
                                            {canEdit && isEditMode ? (
                                                <div className="space-y-5 animate-slide-up">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Diagnosis</Label>
                                                            <SearchableSelect options={diagnoses.map(d => ({ label: d.diagnosisname, value: d.diagnosisname }))} value={diagnosis} onChange={setDiagnosis} placeholder="Select or search diagnosis..." className="h-11" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clinical Status</Label>
                                                            <CustomDropdown options={[{ label: "Active", value: "Active" }, { label: "Discharged", value: "Discharged" }]} value={status} onChange={(v) => setStatus(v as "Active" | "Discharged")} placeholder="Select status" className="h-11 w-full" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clinical Notes</Label>
                                                        <textarea
                                                            className="flex min-h-[200px] w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 resize-none transition-all leading-relaxed"
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            placeholder="Document symptoms, findings, and treatment plan..."
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-5 animate-slide-up">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {/* Diagnosis card */}
                                                        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <Activity className="h-3 w-3" />Diagnosis
                                                            </p>
                                                            <p className="text-[15px] font-semibold text-foreground/90">
                                                                {selectedOPD.diagnosis || <span className="text-muted-foreground font-normal italic text-sm">Not recorded</span>}
                                                            </p>
                                                        </div>
                                                        {/* Status card */}
                                                        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <HeartPulse className="h-3 w-3" />Status
                                                            </p>
                                                            {selectedOPD.status === 'Active' ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-sm font-semibold">
                                                                    <span className="relative flex h-1.5 w-1.5">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                                                    </span>
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1 text-sm font-semibold">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                                    Discharged
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                                            <FileText className="h-3 w-3" />Clinical Notes
                                                        </p>
                                                        <div className="rounded-xl border border-border/60 bg-muted/20 p-5 min-h-[160px] text-sm leading-relaxed font-medium whitespace-pre-wrap">
                                                            {selectedOPD.notes
                                                                ? <span className="text-foreground/80">{selectedOPD.notes}</span>
                                                                : <span className="italic text-muted-foreground/50">No clinical notes for this visit.</span>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* ── VITALS TAB ── */}
                                        <TabsContent value="vitals" className="mt-0">
                                            <div className="animate-slide-up">
                                                <VitalsForm opdId={Number(selectedOPD.opdid)} readOnly={!(canEdit && isEditMode)} />
                                            </div>
                                        </TabsContent>

                                        {/* ── PROCEDURES TAB ── */}
                                        <TabsContent value="treatments" className="mt-0 space-y-4">
                                            <div className="animate-slide-up">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center">
                                                        <Syringe className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-base">Procedures</h3>
                                                        <p className="text-xs text-muted-foreground">Treatments and surgical procedures</p>
                                                    </div>
                                                </div>

                                                {canEdit && isEditMode && (
                                                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 mb-5 space-y-3">
                                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Add Procedure</Label>
                                                        <div className="flex gap-2.5 items-end">
                                                            <div className="flex-1">
                                                                <SearchableSelect options={treatmentOptions} value={selectedTreatmentId} onChange={setSelectedTreatmentId} placeholder="Search procedures..." className="h-10" />
                                                            </div>
                                                            <div className="w-24">
                                                                <Label className="text-[10px] text-muted-foreground block mb-1">Qty</Label>
                                                                <Input type="number" value={treatmentQty} onChange={(e) => setTreatmentQty(Number(e.target.value))} className="h-10" min={1} />
                                                            </div>
                                                            <button onClick={handleAddTreatment} className="h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-sm transition-all hover:shadow-md">
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2.5">
                                                    {prescribedItems.length > 0 ? prescribedItems.map((item, idx) => (
                                                        <div key={idx} className="group/item flex justify-between items-center bg-background border border-border/60 rounded-xl p-4 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                                                            <div>
                                                                <p className="font-semibold text-sm text-foreground/90">{item.name}</p>
                                                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Qty: {item.qty}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-lg">₹{item.rate * item.qty}</span>
                                                                {canEdit && isEditMode && item.isNew && (
                                                                    <button className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center" onClick={() => handleRemoveTreatment(idx)}>
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 flex flex-col items-center">
                                                            <Syringe className="h-8 w-8 text-muted-foreground/20 mb-3" />
                                                            <p className="text-sm font-medium text-foreground/60">No procedures recorded</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">Add procedures using the form above</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* ── RX TAB ── */}
                                        <TabsContent value="prescriptions" className="mt-0 space-y-4">
                                            <div className="animate-slide-up">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-900 flex items-center justify-center">
                                                        <Pill className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-base">Prescriptions</h3>
                                                        <p className="text-xs text-muted-foreground">Medicines and dosage instructions</p>
                                                    </div>
                                                </div>

                                                {canEdit && isEditMode && (
                                                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 mb-5 space-y-3">
                                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Prescribe Medicine</Label>
                                                        <div className="flex flex-wrap gap-3 items-end">
                                                            <div className="flex-[3] min-w-[180px]">
                                                                <SearchableSelect options={medicineOptions} value={selectedMedicineId} onChange={setSelectedMedicineId} placeholder="Search medicine..." className="h-10" />
                                                                {selectedMedicineDetails && (() => {
                                                                    const aq = prescribedMedicines.filter(i => String(i.id) === String(selectedMedicineDetails.medicine_id)).reduce((s, i) => s + i.qty, 0);
                                                                    const ds = (selectedMedicineDetails.stock_quantity || 0) - aq;
                                                                    return ds <= 0
                                                                        ? <span className="text-[11px] text-destructive font-semibold mt-1.5 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Out of Stock</span>
                                                                        : ds < 20
                                                                            ? <span className="text-[11px] text-amber-600 font-semibold mt-1.5 block">⚠ Low Stock ({ds})</span>
                                                                            : <span className="text-[11px] text-emerald-600 font-semibold mt-1.5 block">✓ In Stock: {ds}</span>;
                                                                })()}
                                                            </div>
                                                            <div className="flex-1 min-w-[90px]">
                                                                <Label className="text-[10px] text-muted-foreground block mb-1">Dosage</Label>
                                                                <Input type="text" value={medicineDosage} onChange={(e) => setMedicineDosage(e.target.value)} className="h-10" placeholder="1-0-1" />
                                                            </div>
                                                            <div className="w-20">
                                                                <Label className="text-[10px] text-muted-foreground block mb-1">Days</Label>
                                                                <Input type="number" value={medicineDuration} onChange={(e) => setMedicineDuration(Number(e.target.value))} className="h-10" min={1} />
                                                            </div>
                                                            <div className="w-20">
                                                                <Label className="text-[10px] text-muted-foreground block mb-1">Total Qty</Label>
                                                                <Input type="number" value={medicineQty} onChange={(e) => setMedicineQty(Number(e.target.value))} className="h-10" min={1} />
                                                            </div>
                                                            <div className="flex-[2] min-w-[130px]">
                                                                <Label className="text-[10px] text-muted-foreground block mb-1">Instructions</Label>
                                                                <Input type="text" value={medicineInstructions} onChange={(e) => setMedicineInstructions(e.target.value)} className="h-10" placeholder="After meals" />
                                                            </div>
                                                            <button onClick={handleAddMedicine} className="h-10 w-10 shrink-0 self-end bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center shadow-sm transition-all hover:shadow-md">
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2.5">
                                                    {prescribedMedicines.length > 0 ? prescribedMedicines.map((item, idx) => (
                                                        <div key={idx} className="group/item flex justify-between items-start bg-background border border-border/60 rounded-xl p-4 hover:border-violet-200 dark:hover:border-violet-800 transition-all">
                                                            <div className="flex-1 min-w-0 pr-3">
                                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                                    <p className="font-semibold text-sm text-foreground/90">{item.name}</p>
                                                                    <span className="text-xs text-muted-foreground font-medium">×{item.qty}</span>
                                                                </div>
                                                                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                                                    <span className="bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-md text-[11px] font-semibold opd-mono">{item.dosage}</span>
                                                                    <span className="text-muted-foreground text-[11px] font-medium bg-muted px-2 py-0.5 rounded-md">{item.duration}d</span>
                                                                    {item.instructions && <span className="text-muted-foreground text-[11px] italic">{item.instructions}</span>}
                                                                </div>
                                                            </div>
                                                            {canEdit && isEditMode && item.isNew && (
                                                                <button className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center shrink-0 mt-0.5" onClick={() => handleRemoveMedicine(idx)}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )) : (
                                                        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 flex flex-col items-center">
                                                            <Pill className="h-8 w-8 text-muted-foreground/20 mb-3" />
                                                            <p className="text-sm font-medium text-foreground/60">No medicines prescribed</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">Add prescriptions using the form above</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* ── TESTS TAB ── */}
                                        <TabsContent value="tests" className="mt-0 space-y-4">
                                            <div className="animate-slide-up">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="h-9 w-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center">
                                                        <Microscope className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-base">Lab Tests</h3>
                                                        <p className="text-xs text-muted-foreground">Diagnostic and laboratory orders</p>
                                                    </div>
                                                </div>

                                                {canEdit && isEditMode && (
                                                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 mb-5 space-y-3">
                                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Order Lab Test</Label>
                                                        <div className="flex gap-2.5">
                                                            <div className="flex-1">
                                                                <SearchableSelect options={testOptions} value={selectedTestId} onChange={setSelectedTestId} placeholder="Search tests..." className="h-10" />
                                                            </div>
                                                            <button onClick={handleAddTest} className="h-10 w-10 shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl flex items-center justify-center shadow-sm transition-all hover:shadow-md">
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2.5">
                                                    {prescribedTests.length > 0 ? prescribedTests.map((item, idx) => (
                                                        <div key={idx} className="group/item flex justify-between items-center bg-background border border-border/60 rounded-xl p-4 hover:border-cyan-200 dark:hover:border-cyan-800 transition-all">
                                                            <p className="font-semibold text-sm text-foreground/90">{item.name}</p>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 rounded-lg">₹{item.rate}</span>
                                                                {canEdit && isEditMode && item.isNew && (
                                                                    <button className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center" onClick={() => handleRemoveTest(idx)}>
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 flex flex-col items-center">
                                                            <Microscope className="h-8 w-8 text-muted-foreground/20 mb-3" />
                                                            <p className="text-sm font-medium text-foreground/60">No tests ordered</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">Add tests using the form above</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </div>

                                    {/* ── Bottom Action Bar ── */}
                                    <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-card/95 backdrop-blur-md px-5 py-4 flex items-center justify-between z-20">
                                        <button
                                            onClick={() => setIsEditModalOpen(false)}
                                            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Close
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {canEdit && isEditMode && (
                                                <button
                                                    onClick={() => setIsEditMode(false)}
                                                    className="h-9 px-4 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {canEdit && !isEditMode && selectedOPD?.status !== 'Discharged' && (
                                                <button
                                                    onClick={() => { setDiagnosis(selectedOPD?.diagnosis || ""); setNotes(selectedOPD?.notes || ""); setStatus(selectedOPD?.status as "Active" | "Discharged"); setIsEditMode(true); }}
                                                    className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-all shadow-sm hover:shadow-md"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Edit Record
                                                </button>
                                            )}
                                            {canEdit && isEditMode && (
                                                <button
                                                    onClick={handleEditSave}
                                                    disabled={isLoading}
                                                    className="inline-flex items-center gap-2 h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.4)]"
                                                >
                                                    {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                    {isLoading ? "Saving..." : "Save Changes"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Tabs>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </RoleGuard>
    );
}
"use client";

import { useState, useEffect, useCallback, useReducer } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    Stethoscope, FlaskConical, Syringe, Pill, FileText,
    Plus, Loader2, LogOut, User, Phone, HeartPulse,
    CalendarPlus, CheckCircle2, X, Printer, Activity, Save,
} from "lucide-react";
import { opdService, OpdVisit } from "@/services/opd-service";
import { clinicalService } from "@/services/clinical-service";
import { followupsService } from "@/services/followups-service";
import { Diagnosis, Medicine, Test, Procedure } from "@/types/clinical";
import { clinicalReducer, emptyClinical, ClinicalState, ClinicalAction } from "./clinical-reducer";
import { LiveSummaryPanel } from "./live-summary-panel";

// re-export so live-summary-panel.tsx can import from here (backwards compat)
export type { ClinicalState };

// ─── Props ────────────────────────────────────────────────────────────────────

interface OpdWorkspaceProps {
    opdId: number;
    onDone?: () => void;
    onDischarge?: (status?: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string) {
    if (!dob) return "—";
    const diff = Date.now() - new Date(dob).getTime();
    return `${Math.floor(diff / 3.15576e10)}y`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
    return (
        <div className="grid grid-cols-12 gap-4 h-full animate-pulse">
            <div className="col-span-3 space-y-3">
                <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="col-span-6 space-y-3">
                <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="col-span-3 space-y-3">
                <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
        </div>
    );
}

// ─── Stat cell (used inside LeftPanel vitals) ─────────────────────────────────

function StatCell({ label, value }: { label: string; value?: string | number }) {
    return (
        <div className="flex flex-col gap-0.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700/60">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{value || "—"}</span>
        </div>
    );
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

function LeftPanel({ visit }: { visit: OpdVisit }) {
    const patient = visit.patients;
    const name = patient?.users_patients_user_idTousers?.full_name || "Patient";
    const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const age = calcAge(patient?.dob);
    const v = visit.vitals;

    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-3"
        >
            {/* Patient identity card */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                {/* Gradient header */}
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-4 pt-5 pb-8 relative">
                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg mx-auto">
                        <span className="text-2xl font-extrabold text-white">{initials}</span>
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rotate-45 bg-white dark:bg-slate-900 border-l border-t border-slate-200/60 dark:border-slate-800/60" />
                </div>
                {/* Info */}
                <div className="px-4 pt-6 pb-4 text-center space-y-1">
                    <p className="font-extrabold text-base text-slate-800 dark:text-slate-100 leading-tight">{name}</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {patient?.gender && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-200 dark:border-violet-800 capitalize">
                                {patient.gender}
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            {age}
                        </span>
                    </div>
                    {patient?.phone_number && (
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                            <Phone className="h-3 w-3" />{patient.phone_number}
                        </p>
                    )}
                </div>
                {/* OPD meta row */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground">{visit.opd_no}</span>
                    <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        visit.is_active
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                            : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700"
                    )}>
                        {visit.is_active && (
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                        )}
                        {visit.is_active ? "Active" : "Discharged"}
                    </span>
                </div>
            </div>

            {/* Vitals grid */}
            {v && (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 pb-2">Vitals</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        <StatCell label="BP" value={v.blood_pressure} />
                        <StatCell label="Pulse" value={v.pulse ? `${v.pulse} bpm` : undefined} />
                        <StatCell label="Temp" value={v.temperature ? `${v.temperature}°C` : undefined} />
                        <StatCell label="SpO₂" value={v.spo2 ? `${v.spo2}%` : undefined} />
                        <StatCell label="Height" value={v.height ? `${v.height} cm` : undefined} />
                        <StatCell label="Weight" value={v.weight ? `${v.weight} kg` : undefined} />
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({ id, label, icon: Icon, count, active, onClick }: {
    id: string; label: string; icon: any; count: number; active: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 whitespace-nowrap px-4 h-10 rounded-xl text-sm font-semibold transition-all shrink-0",
                active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
            {count > 0 && (
                <span className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold px-1",
                    active ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"
                )}>
                    {count}
                </span>
            )}
        </button>
    );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ children, color = "default" }: { children: React.ReactNode; color?: string }) {
    const c: Record<string, string> = {
        default: "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
        blue:    "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300",
        primary: "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200",
        cyan:    "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-300",
        orange:  "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300",
        green:   "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
        violet:  "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300",
    };
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold", c[color] || c.default)}
        >
            {children}
        </motion.span>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground/60">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium">{label}</p>
        </div>
    );
}

// ─── Diagnosis Tab ────────────────────────────────────────────────────────────

function DiagnosisTab({ opdId, hospitalId, diagnoses, dispatch }: {
    opdId: number; hospitalId?: number;
    diagnoses: ClinicalState["diagnoses"];
    dispatch: React.Dispatch<ClinicalAction>;
}) {
    const { addToast } = useToast();
    const [master, setMaster] = useState<Diagnosis[]>([]);
    const [selected, setSelected] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        clinicalService.getDiagnoses(hospitalId)
            .then(d => setMaster(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, [hospitalId]);

    const opts = master
        .filter(d => d.diagnosis_id)
        .map(d => ({ label: d.diagnosis_name, value: String(d.diagnosis_id) }));

    const handleAdd = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await opdService.addDiagnosis(opdId, {
                diagnosis_id: Number(selected),
                is_primary: diagnoses.length === 0,
            });
            const m = master.find(d => String(d.diagnosis_id) === selected);
            dispatch({
                type: "ADD_DIAGNOSIS",
                payload: {
                    opd_diagnosis_id: (res as any).opd_diagnosis_id,
                    diagnosis_id: Number(selected),
                    is_primary: diagnoses.length === 0,
                    remarks: "",
                    diagnoses: { diagnosis_id: Number(selected), diagnosis_name: m?.diagnosis_name || "" },
                },
            });
            setSelected("");
            addToast("Diagnosis added", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed", "error");
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="flex-1">
                    <SearchableSelect options={opts} value={selected} onChange={setSelected}
                        placeholder="Search diagnosis..." className="h-10" />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!selected || saving}
                    className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                </button>
            </div>
            {diagnoses.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                    <AnimatePresence>
                        {diagnoses.map(d => (
                            <Chip key={d.opd_diagnosis_id} color={d.is_primary ? "primary" : "blue"}>
                                {d.is_primary && <span className="text-[9px] font-bold uppercase opacity-60">Primary ·</span>}
                                {d.diagnoses?.diagnosis_name}
                            </Chip>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <EmptyState icon={Stethoscope} label="No diagnosis added yet" />
            )}
        </div>
    );
}

// ─── Tests Tab ────────────────────────────────────────────────────────────────

function TestsTab({ opdId, hospitalId, tests, dispatch }: {
    opdId: number; hospitalId?: number;
    tests: ClinicalState["tests"];
    dispatch: React.Dispatch<ClinicalAction>;
}) {
    const { addToast } = useToast();
    const [master, setMaster] = useState<Test[]>([]);
    const [selected, setSelected] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        clinicalService.getTests(hospitalId)
            .then(d => setMaster(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, [hospitalId]);

    const opts = master
        .filter((t: any) => t.test_id && t.is_linked !== false)
        .map(t => ({ label: t.test_name, value: String(t.test_id) }));

    const statusColor: Record<string, string> = { Ordered: "cyan", Completed: "green", Pending: "orange" };

    const handleAdd = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await opdService.addTest(opdId, { test_id: Number(selected) });
            const m = master.find(t => String(t.test_id) === selected);
            dispatch({
                type: "ADD_TEST",
                payload: {
                    opd_test_id: (res as any).opd_test_id,
                    test_id: Number(selected),
                    test_status: "Ordered",
                    tests: { test_id: Number(selected), test_name: m?.test_name || "" },
                },
            });
            setSelected("");
            addToast("Test ordered", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed", "error");
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="flex-1">
                    <SearchableSelect options={opts} value={selected} onChange={setSelected}
                        placeholder="Search lab test..." className="h-10" />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!selected || saving}
                    className="h-10 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Order
                </button>
            </div>
            {tests.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1">
                    <AnimatePresence>
                        {tests.map(t => (
                            <motion.div
                                key={t.opd_test_id}
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/20"
                            >
                                <FlaskConical className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5 self-start" />
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <span className="text-sm font-semibold">{t.tests?.test_name}</span>
                                    {t.result_summary && (
                                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.result_summary}</p>
                                    )}
                                </div>
                                <div className="self-start">
                                    <Chip color={statusColor[t.test_status] || "cyan"}>
                                        {t.test_status}
                                    </Chip>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <EmptyState icon={FlaskConical} label="No tests ordered yet" />
            )}
        </div>
    );
}

// ─── Procedures Tab ───────────────────────────────────────────────────────────

function ProceduresTab({ opdId, hospitalId, procedures, dispatch }: {
    opdId: number; hospitalId?: number;
    procedures: ClinicalState["procedures"];
    dispatch: React.Dispatch<ClinicalAction>;
}) {
    const { addToast } = useToast();
    const [master, setMaster] = useState<Procedure[]>([]);
    const [selected, setSelected] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        clinicalService.getProcedures(hospitalId)
            .then(d => setMaster(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, [hospitalId]);

    const opts = master
        .filter((p: any) => p.procedure_id && p.is_linked !== false)
        .map(p => ({ label: p.procedure_name, value: String(p.procedure_id) }));

    const handleAdd = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const date = new Date().toISOString().split("T")[0];
            const res = await opdService.addProcedure(opdId, { procedure_id: Number(selected), procedure_date: date });
            const m = master.find(p => String(p.procedure_id) === selected);
            dispatch({
                type: "ADD_PROCEDURE",
                payload: {
                    opd_procedure_id: (res as any).opd_procedure_id,
                    procedure_id: Number(selected),
                    procedure_date: date,
                    remarks: "",
                    procedures: { procedure_id: Number(selected), procedure_name: m?.procedure_name || "" },
                },
            });
            setSelected("");
            addToast("Procedure added", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed", "error");
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="flex-1">
                    <SearchableSelect options={opts} value={selected} onChange={setSelected}
                        placeholder="Search procedure..." className="h-10" />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!selected || saving}
                    className="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                </button>
            </div>
            {procedures.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                    <AnimatePresence>
                        {procedures.map(p => (
                            <Chip key={p.opd_procedure_id} color="orange">
                                <Syringe className="h-3 w-3 opacity-60" />
                                {(p as any).procedures?.procedure_name}
                            </Chip>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <EmptyState icon={Syringe} label="No procedures added yet" />
            )}
        </div>
    );
}

// ─── Prescription Tab ─────────────────────────────────────────────────────────

interface DraftItem { medicine_id: number; name: string; dosage: string; qty: number; days: number; instructions: string; }

function PrescriptionTab({ opdId, doctorId, hospitalId, medicines, dispatch }: {
    opdId: number; doctorId?: number; hospitalId?: number;
    medicines: ClinicalState["medicines"];
    dispatch: React.Dispatch<ClinicalAction>;
}) {
    const { addToast } = useToast();
    const [master, setMaster] = useState<Medicine[]>([]);
    const [draft, setDraft] = useState<DraftItem[]>([]);
    const [notes, setNotes] = useState("");
    const [selectedMed, setSelectedMed] = useState("");
    const [dosage, setDosage] = useState("1-0-1");
    const [qty, setQty] = useState(1);
    const [days, setDays] = useState(5);
    const [instructions, setInstructions] = useState("After Meal");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        clinicalService.getMedicines(hospitalId)
            .then(d => setMaster(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, [hospitalId]);

    const opts = master
        .filter((m: any) => m.medicine_id && m.is_linked !== false)
        .map(m => ({ label: `${m.medicine_name} ${m.strength || ""}`.trim(), value: String(m.medicine_id) }));

    const addToDraft = () => {
        if (!selectedMed) return;
        const m = master.find(x => String(x.medicine_id) === selectedMed);
        setDraft(prev => [...prev, { medicine_id: Number(selectedMed), name: m?.medicine_name || "", dosage, qty, days, instructions }]);
        setSelectedMed(""); setDosage("1-0-1"); setQty(1); setDays(5); setInstructions("After Meal");
    };

    const savePrescription = async () => {
        if (draft.length === 0) { addToast("Add at least one medicine", "error"); return; }
        setSaving(true);
        try {
            const res = await opdService.addPrescription(opdId, {
                doctor_id: doctorId || 0,
                notes,
                items: draft.map(i => ({ medicine_id: i.medicine_id, dosage: i.dosage, quantity: i.qty, duration_days: i.days, instructions: i.instructions })),
            });
            // Embed prescription_items from draft so live count updates immediately
            dispatch({
                type: "ADD_MEDICINE",
                payload: {
                    ...(res as any),
                    prescription_items: draft.map(i => ({
                        prescription_item_id: Date.now() + i.medicine_id,
                        medicine_id: i.medicine_id,
                        dosage: i.dosage,
                        quantity: i.qty,
                        duration_days: i.days,
                        instructions: i.instructions,
                        medicines: { medicine_id: i.medicine_id, medicine_name: i.name },
                    })),
                },
            });
            setDraft([]); setNotes("");
            addToast("Prescription saved!", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed", "error");
        } finally { setSaving(false); }
    };

    const savedCount = medicines.reduce((a, p) => a + ((p as any).prescription_items?.length || 0), 0);

    return (
        <div className="space-y-4">
            {/* Medicine selector row */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <SearchableSelect options={opts} value={selectedMed} onChange={setSelectedMed}
                        placeholder="Search medicine..." className="h-10" />
                </div>
                <input
                    className="h-10 w-24 px-3 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    placeholder="1-0-1" value={dosage} onChange={e => setDosage(e.target.value)} />
            </div>
            {/* Qty / Days / Instructions */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: "Qty", val: qty, set: (v: number) => setQty(v) },
                    { label: "Days", val: days, set: (v: number) => setDays(v) },
                ].map(f => (
                    <div key={f.label} className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{f.label}</label>
                        <input type="number" min={1} value={f.val} onChange={e => f.set(+e.target.value)}
                            className="h-9 w-full px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
                    </div>
                ))}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Instructions</label>
                    <input value={instructions} onChange={e => setInstructions(e.target.value)}
                        className="h-9 w-full px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all truncate"
                        placeholder="After meal" />
                </div>
            </div>
            {/* Add to draft */}
            <button onClick={addToDraft} disabled={!selectedMed}
                className="w-full h-9 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" /> Add to Prescription
            </button>
            {/* Draft list */}
            {draft.length > 0 && (
                <div className="rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
                    <div className="bg-violet-50/60 dark:bg-violet-950/20 px-4 py-2 border-b border-violet-200 dark:border-violet-800">
                        <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                            Draft · {draft.length} item{draft.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="divide-y divide-violet-100 dark:divide-violet-900/40">
                        {draft.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-2.5 group">
                                <Pill className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{item.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{item.dosage} · {item.days}d · {item.instructions}</p>
                                </div>
                                <button onClick={() => setDraft(d => d.filter((_, j) => j !== i))}
                                    className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-lg hover:bg-red-50 text-red-400 flex items-center justify-center transition-all">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Notes + Save */}
            <textarea
                className="w-full h-16 px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-muted-foreground/50"
                placeholder="Prescription notes (optional)..." value={notes} onChange={e => setNotes(e.target.value)} />
            <button onClick={savePrescription} disabled={draft.length === 0 || saving}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Prescription</>}
            </button>
            {/* Saved confirm */}
            {savedCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {savedCount} medicine{savedCount !== 1 ? "s" : ""} prescribed
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Main OpdWorkspace ────────────────────────────────────────────────────────

export function OpdWorkspace({ opdId, onDone, onDischarge }: OpdWorkspaceProps) {
    const { addToast } = useToast();
    const { user } = useAuth();
    const [visit, setVisit] = useState<OpdVisit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [complaint, setComplaint] = useState("");
    const [notes, setNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isDischarging, setIsDischarging] = useState(false);
    const [showFollowup, setShowFollowup] = useState(false);
    const [followupDate, setFollowupDate] = useState("");
    const [followupReason, setFollowupReason] = useState("");
    const [isSavingFollowup, setIsSavingFollowup] = useState(false);
    const [activeTab, setActiveTab] = useState("diagnosis");
    const [clinical, dispatch] = useReducer(clinicalReducer, emptyClinical);

    const doctorId  = Number((user as any)?.doctorid)  || undefined;
    const hospitalId = Number((user as any)?.hospitalid) || undefined;

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const v = await opdService.getVisit(opdId);
            setVisit(v);
            setComplaint(v.chief_complaint || "");
            setNotes(v.clinical_notes || "");
            dispatch({ type: "RESET", payload: {
                diagnoses:  v.opd_diagnoses  || [],
                tests:      v.opd_tests      || [],
                procedures: v.opd_procedures || [],
                medicines:  v.prescriptions  || [],
            }});
        } catch (e: any) {
            addToast(e?.message || "Failed to load visit", "error");
        } finally { setIsLoading(false); }
    }, [opdId, addToast]);

    useEffect(() => { load(); }, [load]);

    const saveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await opdService.updateVisit(opdId, { chief_complaint: complaint, clinical_notes: notes });
            addToast("Notes saved", "success");
        } catch { addToast("Failed to save notes", "error"); }
        finally { setIsSavingNotes(false); }
    };

    const handleDischarge = async () => {
        setIsDischarging(true);
        try {
            await opdService.updateVisit(opdId, { is_active: false });
            addToast("Patient discharged", "success");
            setVisit(prev => prev ? { ...prev, is_active: false } : null);
            setShowFollowup(true);
        } catch (e: any) {
            addToast(e?.message || "Discharge failed", "error");
        } finally { setIsDischarging(false); }
    };

    const handleFollowupSave = async () => {
        if (followupDate && followupReason) {
            setIsSavingFollowup(true);
            try {
                await followupsService.create({ visit_id: opdId, recommended_date: followupDate, reason: followupReason });
                addToast("Follow-up scheduled", "success");
            } catch { addToast("Follow-up save failed, patient is still discharged", "error"); }
            finally { setIsSavingFollowup(false); }
        }
        setShowFollowup(false);
        onDischarge?.("Completed");
    };

    if (isLoading) return <WorkspaceSkeleton />;
    if (!visit) return null;

    const dxCount   = clinical.diagnoses.length;
    const testCount = clinical.tests.length;
    const procCount = clinical.procedures.length;
    const rxCount   = clinical.medicines.reduce((a, p) => a + ((p as any).prescription_items?.length || 0), 0);

    const tabs = [
        { id: "diagnosis",  label: "Diagnosis",  icon: Stethoscope,  count: dxCount },
        { id: "medicines",  label: "Medicines",  icon: Pill,         count: rxCount },
        { id: "tests",      label: "Tests",      icon: FlaskConical,  count: testCount },
        { id: "procedures", label: "Procedures", icon: Syringe,      count: procCount },
    ];

    const generatePrescriptionPDF = () => {
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();

        // ── Violet header bar ──
        doc.setFillColor(109, 40, 217);
        doc.rect(0, 0, pw, 38, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20); doc.setFont("helvetica", "bold");
        doc.text("PRESCRIPTION", 14, 16);
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(`OPD: ${visit.opd_no}`, 14, 26);
        doc.text(`Date: ${new Date(visit.visit_datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, 14, 33);
        const docName = visit.doctors?.users_doctors_user_idTousers?.full_name;
        if (docName) doc.text(`Dr. ${docName}`, pw - 14, 30, { align: "right" });

        // ── Patient card ──
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 44, pw - 28, 26, 3, 3, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 44, pw - 28, 26, 3, 3, "S");
        const patName = visit.patients?.users_patients_user_idTousers?.full_name || "Patient";
        const dob = visit.patients?.dob;
        const age = dob ? `${Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10)}y` : "";
        const gen = visit.patients?.gender || "";
        const phone = visit.patients?.phone_number || "";
        doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text(patName, 20, 55);
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
        doc.text([age, gen, phone].filter(Boolean).join(" · "), 20, 63);

        let y = 80;

        // ── Complaint ──
        if (complaint) {
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(109, 40, 217);
            doc.text("CHIEF COMPLAINT", 14, y); y += 5;
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
            doc.text(complaint, 14, y, { maxWidth: pw - 28 }); y += 10;
        }

        // ── Diagnoses ──
        if (clinical.diagnoses.length > 0) {
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(109, 40, 217);
            doc.text("DIAGNOSES", 14, y); y += 5;
            clinical.diagnoses.forEach((d, i) => {
                doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
                doc.text(`${i + 1}. ${d.diagnoses?.diagnosis_name || ""}${d.is_primary ? " (Primary)" : ""}`, 18, y); y += 6;
            }); y += 2;
        }

        // ── Medicines table ──
        const allMeds: any[] = [];
        clinical.medicines.forEach(rx => {
            ((rx as any).prescription_items || []).forEach((item: any) => {
                allMeds.push([item.medicines?.medicine_name || "", item.dosage || "", String(item.quantity || ""), `${item.duration_days || ""} days`, item.instructions || ""]);
            });
        });
        if (allMeds.length > 0) {
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(109, 40, 217);
            doc.text("Rx — MEDICINES", 14, y); y += 3;
            autoTable(doc, {
                startY: y,
                head: [["Medicine", "Dosage", "Qty", "Duration", "Instructions"]],
                body: allMeds,
                headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: "bold", fontSize: 8 },
                bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 14, right: 14 },
                theme: "grid",
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }

        // ── Tests ──
        if (clinical.tests.length > 0) {
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(109, 40, 217);
            doc.text("TESTS ORDERED", 14, y); y += 5;
            clinical.tests.forEach((t, i) => {
                doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
                doc.text(`${i + 1}. ${t.tests?.test_name || ""} [${t.test_status}]`, 18, y); y += 6;
            }); y += 2;
        }

        // ── Procedures ──
        if (clinical.procedures.length > 0) {
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(109, 40, 217);
            doc.text("PROCEDURES", 14, y); y += 5;
            clinical.procedures.forEach((p, i) => {
                doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
                doc.text(`${i + 1}. ${(p as any).procedures?.procedure_name || ""}`, 18, y); y += 6;
            }); y += 2;
        }

        // ── Clinical notes ──
        if (notes) {
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(109, 40, 217);
            doc.text("CLINICAL NOTES", 14, y); y += 5;
            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
            doc.text(notes, 14, y, { maxWidth: pw - 28 }); y += 12;
        }

        // ── Footer ──
        const ph = doc.internal.pageSize.getHeight();
        doc.setDrawColor(226, 232, 240); doc.line(14, ph - 18, pw - 14, ph - 18);
        doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text("This prescription was generated electronically from the OPD Management System.", pw / 2, ph - 11, { align: "center" });

        doc.save(`prescription-${visit.opd_no}.pdf`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-12 gap-4 items-start"
        >
            {/* ── LEFT (col-span-3) ── */}
            <div className="col-span-12 lg:col-span-3">
                <LeftPanel visit={visit} />
            </div>

            {/* ── CENTER (col-span-6) ── */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
                {/* Notes section */}
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chief Complaint &amp; Notes</span>
                    </div>
                    <div className="p-5 space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chief Complaint</label>
                            <textarea
                                className="w-full h-16 px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground/50 disabled:opacity-50"
                                placeholder="Patient's chief complaint..."
                                value={complaint}
                                onChange={e => setComplaint(e.target.value)}
                                disabled={!visit.is_active}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Examination &amp; Clinical Notes</label>
                            <textarea
                                className="w-full h-24 px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground/50 disabled:opacity-50"
                                placeholder="Clinical observations, examination findings..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                disabled={!visit.is_active}
                            />
                        </div>
                        {visit.is_active && (
                            <div className="flex justify-end">
                                <button
                                    onClick={saveNotes}
                                    disabled={isSavingNotes}
                                    className="h-9 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-all"
                                >
                                    {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save Notes
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Clinical tabs */}
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                    {/* Tab nav */}
                    <div className="flex overflow-x-auto gap-1 p-2 bg-slate-50/60 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 no-scrollbar">
                        {tabs.map(t => (
                            <TabBtn key={t.id} {...t} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
                        ))}
                    </div>
                    {/* Tab content */}
                    <div className={cn("p-5", !visit.is_active && "opacity-60 pointer-events-none")}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === "diagnosis"  && <DiagnosisTab  opdId={opdId} hospitalId={hospitalId} diagnoses={clinical.diagnoses}   dispatch={dispatch} />}
                                {activeTab === "tests"      && <TestsTab      opdId={opdId} hospitalId={hospitalId} tests={clinical.tests}             dispatch={dispatch} />}
                                {activeTab === "procedures" && <ProceduresTab opdId={opdId} hospitalId={hospitalId} procedures={clinical.procedures}   dispatch={dispatch} />}
                                {activeTab === "medicines"  && <PrescriptionTab opdId={opdId} doctorId={doctorId || visit.doctor_id} hospitalId={hospitalId} medicines={clinical.medicines} dispatch={dispatch} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Back to Queue button (non-discharge) */}
                {onDone && visit.is_active && (
                    <button
                        onClick={onDone}
                        className="w-full h-10 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex items-center justify-center gap-2"
                    >
                        ← Back to Queue (OPD stays active)
                    </button>
                )}
            </div>

            {/* ── RIGHT (col-span-3) ── */}
            <div className="col-span-12 lg:col-span-3">
                <LiveSummaryPanel
                    clinical={clinical}
                    isActive={visit.is_active !== false}
                    isDischarging={isDischarging}
                    opdNo={visit.opd_no}
                    patientName={visit.patients?.users_patients_user_idTousers?.full_name || "Patient"}
                    complaint={complaint}
                    notes={notes}
                    onDischarge={handleDischarge}
                    onPrint={generatePrescriptionPDF}
                    onScheduleFollowup={!visit.is_active ? () => setShowFollowup(true) : undefined}
                />
            </div>

            {/* Follow-up Dialog */}
            <Dialog open={showFollowup} onOpenChange={setShowFollowup}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <CalendarPlus className="h-4 w-4 text-blue-500" />
                            Schedule Follow-up
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Patient has been discharged. Schedule a follow-up if needed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-1">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Follow-up Date</label>
                            <Input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]} className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reason</label>
                            <Input value={followupReason} onChange={e => setFollowupReason(e.target.value)}
                                placeholder="e.g. Review blood test results..." className="h-10 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <button onClick={() => { setShowFollowup(false); onDischarge?.("Completed"); }}
                            className="flex-1 h-10 rounded-xl border border-input text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">
                            Skip
                        </button>
                        <button
                            disabled={!followupDate || !followupReason || isSavingFollowup}
                            onClick={handleFollowupSave}
                            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
                            {isSavingFollowup ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><CalendarPlus className="h-4 w-4" /> Save Follow-up</>}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
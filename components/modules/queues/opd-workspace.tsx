"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import {
    User, Stethoscope, FlaskConical, Pill, Activity,
    CheckCircle2, X, Plus, Save, LogOut, Loader2, ClipboardList, CalendarPlus, Calendar,
    Phone, HeartPulse, FileText, ChevronDown, ChevronUp, AlertCircle, Syringe, Printer
} from "lucide-react";
import { opdService, OpdVisit } from "@/services/opd-service";
import { clinicalService } from "@/services/clinical-service";
import { followupsService } from "@/services/followups-service";
import { Diagnosis, Medicine, Test, Procedure } from "@/types/clinical";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface OpdWorkspaceProps {
    opdId: number;
    onDischarge?: (status?: string) => void;
}

function calculateAge(dob: string) {
    if (!dob) return "—";
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return `${age}y`;
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({
    icon: Icon,
    title,
    subtitle,
    accentColor,
    badgeCount,
    children,
    disabled,
}: {
    icon: any;
    title: string;
    subtitle?: string;
    accentColor: string;
    badgeCount?: number;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <div className={cn(
            "ws-section rounded-2xl border border-border/60 bg-card overflow-hidden transition-all",
            disabled && "opacity-60 pointer-events-none"
        )}>
            <div className={cn("flex items-center gap-3 px-5 py-4 border-b border-border/40", "bg-muted/20")}>
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", accentColor)}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{title}</span>
                        {badgeCount !== undefined && badgeCount > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-foreground/10 text-[10px] font-bold text-foreground/70">
                                {badgeCount}
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ─── Tag Chip ─────────────────────────────────────────────────────────────────

function Chip({ children, color = "default", onRemove }: { children: React.ReactNode; color?: string; onRemove?: () => void }) {
    const colorMap: Record<string, string> = {
        default: "bg-muted/60 border-border/60 text-foreground/70",
        blue: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
        primary: "bg-blue-100 dark:bg-blue-900/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
        purple: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
        green: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
        orange: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
    };
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
            colorMap[color] || colorMap.default
        )}>
            {children}
            {onRemove && (
                <button onClick={onRemove} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </span>
    );
}

// ─── Add Row (shared pattern) ─────────────────────────────────────────────────

function AddRow({
    options,
    value,
    onChange,
    placeholder,
    onAdd,
    isSaving,
    buttonLabel,
    buttonColor = "blue",
    extra,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    onAdd: () => void;
    isSaving: boolean;
    buttonLabel: string;
    buttonColor?: string;
    extra?: React.ReactNode;
}) {
    const colorCls: Record<string, string> = {
        blue: "bg-blue-600 hover:bg-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.25)]",
        purple: "bg-violet-600 hover:bg-violet-700 shadow-[0_2px_8px_rgba(124,58,237,0.25)]",
        orange: "bg-orange-500 hover:bg-orange-600 shadow-[0_2px_8px_rgba(249,115,22,0.25)]",
        cyan: "bg-cyan-600 hover:bg-cyan-700 shadow-[0_2px_8px_rgba(8,145,178,0.25)]",
    };
    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <div className="flex-1">
                    <SearchableSelect options={options} value={value} onChange={onChange} placeholder={placeholder} className="h-10" />
                </div>
                {extra}
                <button
                    disabled={isSaving || !value}
                    onClick={onAdd}
                    className={cn(
                        "h-10 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                        colorCls[buttonColor]
                    )}
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {buttonLabel}
                </button>
            </div>
        </div>
    );
}

// ─── Sub-panel: Diagnoses ─────────────────────────────────────────────────────

function DiagnosisPanel({ opdId, hospitalId, existing }: { opdId: number; hospitalId?: number; existing: OpdVisit["opd_diagnoses"] }) {
    const { addToast } = useToast();
    const [masterDiagnoses, setMasterDiagnoses] = useState<Diagnosis[]>([]);
    const [selectedDx, setSelectedDx] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [localDx, setLocalDx] = useState(existing || []);

    useEffect(() => {
        clinicalService.getDiagnoses(hospitalId).then(d => setMasterDiagnoses(Array.isArray(d) ? d : [])).catch(() => { });
    }, [hospitalId]);
    useEffect(() => { setLocalDx(existing || []); }, [existing]);

    const diagnosisOptions = (masterDiagnoses || []).filter((d: any) => d.diagnosis_id).map((d: any) => ({
        label: d.diagnosis_name, value: String(d.diagnosis_id),
    }));

    const handleAdd = async () => {
        if (!selectedDx) { addToast("Select a diagnosis", "error"); return; }
        setIsSaving(true);
        try {
            const res = await opdService.addDiagnosis(opdId, { diagnosis_id: Number(selectedDx), is_primary: localDx.length === 0 });
            const master = (masterDiagnoses || []).find((d: any) => String(d.diagnosis_id) === selectedDx);
            setLocalDx(prev => [...prev, {
                opd_diagnosis_id: (res as any).opd_diagnosis_id, diagnosis_id: Number(selectedDx),
                is_primary: localDx.length === 0, remarks: "",
                diagnoses: { diagnosis_id: Number(selectedDx), diagnosis_name: master?.diagnosis_name || "" }
            }]);
            setSelectedDx("");
            addToast("Diagnosis added", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed to add diagnosis", "error");
        } finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-3">
            <AddRow options={diagnosisOptions} value={selectedDx} onChange={setSelectedDx}
                placeholder="Search diagnosis..." onAdd={handleAdd} isSaving={isSaving}
                buttonLabel="Add" buttonColor="blue" />
            {localDx.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                    {localDx.map(d => (
                        <Chip key={d.opd_diagnosis_id} color={d.is_primary ? "primary" : "blue"}>
                            {d.is_primary && <span className="text-[9px] font-bold uppercase opacity-70">Primary ·</span>}
                            {d.diagnoses?.diagnosis_name}
                        </Chip>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground/60 italic">No diagnoses added yet</p>
            )}
        </div>
    );
}

// ─── Sub-panel: Tests ─────────────────────────────────────────────────────────

function TestsPanel({ opdId, hospitalId, existing }: { opdId: number; hospitalId?: number; existing: OpdVisit["opd_tests"] }) {
    const { addToast } = useToast();
    const [masterTests, setMasterTests] = useState<Test[]>([]);
    const [selectedTest, setSelectedTest] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [localTests, setLocalTests] = useState(existing || []);

    useEffect(() => {
        clinicalService.getTests(hospitalId).then(d => setMasterTests(Array.isArray(d) ? d : [])).catch(() => { });
    }, [hospitalId]);
    useEffect(() => { setLocalTests(existing || []); }, [existing]);

    const testOptions = (masterTests || [])
        .filter((t: any) => t.test_id && t.is_linked !== false)
        .map((t: any) => ({
            label: t.test_name, value: String(t.test_id),
        }));

    const handleAdd = async () => {
        if (!selectedTest) { addToast("Select a test", "error"); return; }
        setIsSaving(true);
        try {
            const res = await opdService.addTest(opdId, { test_id: Number(selectedTest) });
            const master = (masterTests || []).find((t: any) => String(t.test_id) === selectedTest);
            setLocalTests(prev => [...prev, {
                opd_test_id: (res as any).opd_test_id, test_id: Number(selectedTest),
                test_status: "Ordered",
                tests: { test_id: Number(selectedTest), test_name: master?.test_name || "" }
            }]);
            setSelectedTest("");
            addToast("Test ordered", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed to order test", "error");
        } finally { setIsSaving(false); }
    };

    const statusColor: Record<string, string> = {
        Ordered: "blue", Completed: "green", Pending: "orange",
    };

    return (
        <div className="space-y-3">
            <AddRow options={testOptions} value={selectedTest} onChange={setSelectedTest}
                placeholder="Search lab test..." onAdd={handleAdd} isSaving={isSaving}
                buttonLabel="Order" buttonColor="cyan" />
            {localTests.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1">
                    {localTests.map(t => (
                        <div key={t.opd_test_id} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/60 bg-muted/10">
                            <div className="flex items-center gap-2">
                                <Chip color={statusColor[t.test_status] || "blue"}>
                                    <FlaskConical className="h-3 w-3 opacity-60" />
                                    {t.tests?.test_name}
                                    <span className="opacity-50">· {t.test_status}</span>
                                </Chip>
                            </div>
                            {t.test_status === "Completed" && t.result_summary && (
                                <div className="mt-1 ml-1 text-sm text-foreground/80 bg-background border border-border/50 rounded-lg p-3 whitespace-pre-wrap">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Laboratory Findings</p>
                                    {t.result_summary}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground/60 italic">No tests ordered yet</p>
            )}
        </div>
    );
}

// ─── Sub-panel: Procedures ────────────────────────────────────────────────────

function ProceduresPanel({ opdId, hospitalId, existing }: { opdId: number; hospitalId?: number; existing: OpdVisit["opd_procedures"] }) {
    const { addToast } = useToast();
    const [masterProcedures, setMasterProcedures] = useState<Procedure[]>([]);
    const [selectedProcedure, setSelectedProcedure] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [localProcedures, setLocalProcedures] = useState(existing || []);

    useEffect(() => {
        clinicalService.getProcedures(hospitalId).then(d => setMasterProcedures(Array.isArray(d) ? d : [])).catch(() => { });
    }, [hospitalId]);
    useEffect(() => { setLocalProcedures(existing || []); }, [existing]);

    const procedureOptions = (masterProcedures || [])
        .filter((p: any) => p.procedure_id && p.is_linked !== false)
        .map((p: any) => ({
            label: p.procedure_name, value: String(p.procedure_id),
        }));

    const handleAdd = async () => {
        if (!selectedProcedure) { addToast("Select a procedure", "error"); return; }
        setIsSaving(true);
        try {
            const procedure_date = new Date().toISOString().split('T')[0];
            const res = await opdService.addProcedure(opdId, { procedure_id: Number(selectedProcedure), procedure_date });
            const master = (masterProcedures || []).find((p: any) => String(p.procedure_id) === selectedProcedure);
            setLocalProcedures(prev => [...prev, {
                opd_procedure_id: (res as any).opd_procedure_id, procedure_id: Number(selectedProcedure),
                procedure_date, remarks: "",
                procedures: { procedure_id: Number(selectedProcedure), procedure_name: master?.procedure_name || "" }
            }]);
            setSelectedProcedure("");
            addToast("Procedure added", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed to add procedure", "error");
        } finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-3">
            <AddRow options={procedureOptions} value={selectedProcedure} onChange={setSelectedProcedure}
                placeholder="Search procedure..." onAdd={handleAdd} isSaving={isSaving}
                buttonLabel="Add" buttonColor="orange" />
            {localProcedures.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                    {(localProcedures as any[]).map((p) => (
                        <Chip key={p.opd_procedure_id} color="orange">
                            <Syringe className="h-3 w-3 opacity-60" />
                            {p.procedures?.procedure_name}
                            {p.procedure_date && <span className="opacity-50">· {new Date(p.procedure_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>}
                        </Chip>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground/60 italic">No procedures added yet</p>
            )}
        </div>
    );
}

// ─── Sub-panel: Prescription ──────────────────────────────────────────────────

interface PrescriptionItem { medicine_id: number; medicine_name: string; dosage: string; quantity: number; duration_days: number; instructions: string; }

function PrescriptionPanel({ opdId, doctorId, hospitalId, existing }: { opdId: number; doctorId?: number; hospitalId?: number; existing: OpdVisit["prescriptions"] }) {
    const { addToast } = useToast();
    const [masterMedicines, setMasterMedicines] = useState<Medicine[]>([]);
    const [items, setItems] = useState<PrescriptionItem[]>([]);
    const [selectedMed, setSelectedMed] = useState("");
    const [dosage, setDosage] = useState("1-0-1");
    const [qty, setQty] = useState(1);
    const [duration, setDuration] = useState(5);
    const [instructions, setInstructions] = useState("After Meal");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [savedPrescriptions, setSavedPrescriptions] = useState(existing || []);

    useEffect(() => {
        clinicalService.getMedicines(hospitalId).then(d => setMasterMedicines(Array.isArray(d) ? d : [])).catch(() => { });
    }, [hospitalId]);
    useEffect(() => { setSavedPrescriptions(existing || []); }, [existing]);

    const medOptions = (masterMedicines || [])
        .filter((m: any) => m.medicine_id && m.is_linked !== false)
        .map((m: any) => ({
            label: m.medicine_name, value: String(m.medicine_id),
        }));

    const handleAddItem = () => {
        if (!selectedMed || !dosage) { addToast("Select medicine and enter dosage", "error"); return; }
        const master = (masterMedicines || []).find((m: any) => String(m.medicine_id) === selectedMed);
        setItems(prev => [...prev, { medicine_id: Number(selectedMed), medicine_name: master?.medicine_name || "", dosage, quantity: qty, duration_days: duration, instructions }]);
        setSelectedMed(""); setDosage("1-0-1"); setQty(1); setDuration(5); setInstructions("After Meal");
    };

    const handleSave = async () => {
        if (items.length === 0) { addToast("Add at least one medicine", "error"); return; }
        setIsSaving(true);
        try {
            const res = await opdService.addPrescription(opdId, {
                doctor_id: doctorId || 0, notes,
                items: items.map(i => ({ medicine_id: i.medicine_id, dosage: i.dosage, quantity: i.quantity, duration_days: i.duration_days, instructions: i.instructions }))
            });
            setSavedPrescriptions(prev => [...prev, res as any]);
            setItems([]); setNotes("");
            addToast("Prescription saved!", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed to save prescription", "error");
        } finally { setIsSaving(false); }
    };

    const totalPrescriptions = savedPrescriptions.reduce((acc, p) => acc + (p.prescription_items?.length || 0), 0);

    return (
        <div className="space-y-4">
            {/* Med selector row */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <SearchableSelect options={medOptions} value={selectedMed} onChange={setSelectedMed} placeholder="Search medicine..." className="h-10" />
                </div>
                <input
                    className="h-10 w-28 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all opd-mono"
                    placeholder="1-0-1"
                    value={dosage}
                    onChange={e => setDosage(e.target.value)}
                />
            </div>

            {/* Qty / Days / Instructions */}
            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Qty</label>
                    <input type="number" min={1} className="h-9 w-full px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" value={qty} onChange={e => setQty(+e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Days</label>
                    <input type="number" min={1} className="h-9 w-full px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" value={duration} onChange={e => setDuration(+e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Instructions</label>
                    <input className="h-9 w-full px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all truncate" placeholder="After meals" value={instructions} onChange={e => setInstructions(e.target.value)} />
                </div>
            </div>

            <button
                onClick={handleAddItem}
                className="w-full h-9 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-300 transition-all flex items-center justify-center gap-1.5"
            >
                <Plus className="h-3.5 w-3.5" /> Add to Prescription
            </button>

            {/* Staged items */}
            {items.length > 0 && (
                <div className="rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
                    <div className="bg-violet-50/60 dark:bg-violet-950/20 px-4 py-2.5 border-b border-violet-200 dark:border-violet-800">
                        <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Prescription Draft · {items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="divide-y divide-border/40">
                        {items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 group hover:bg-muted/20 transition-colors">
                                <div className="flex items-baseline gap-2.5 min-w-0">
                                    <span className="text-sm font-semibold text-foreground/90 truncate">{item.medicine_name}</span>
                                    <span className="text-[11px] text-muted-foreground opd-mono shrink-0">{item.dosage}</span>
                                    <span className="text-[11px] text-muted-foreground shrink-0">{item.duration_days}d</span>
                                    {item.instructions && <span className="text-[11px] text-muted-foreground/60 italic shrink-0 hidden sm:inline">{item.instructions}</span>}
                                </div>
                                <button
                                    onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                                    className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="px-4 py-3 border-t border-violet-100 dark:border-violet-900 space-y-3 bg-background/60">
                        <textarea
                            className="w-full h-14 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            placeholder="Prescription notes (optional)..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                        <button
                            disabled={isSaving}
                            onClick={handleSave}
                            className="w-full h-9 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(124,58,237,0.3)] transition-all"
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save Prescription
                        </button>
                    </div>
                </div>
            )}

            {totalPrescriptions > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {totalPrescriptions} medicine{totalPrescriptions !== 1 ? 's' : ''} prescribed across {savedPrescriptions.length} prescription{savedPrescriptions.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Main Workspace ───────────────────────────────────────────────────────────

export function OpdWorkspace({ opdId, onDischarge }: OpdWorkspaceProps) {
    const { addToast } = useToast();
    const { user } = useAuth();
    const [visit, setVisit] = useState<OpdVisit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [complaint, setComplaint] = useState("");
    const [notes, setNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isDischarging, setIsDischarging] = useState(false);
    const [showFollowupDialog, setShowFollowupDialog] = useState(false);
    const [followupDate, setFollowupDate] = useState("");
    const [followupReason, setFollowupReason] = useState("");
    const [isSavingFollowup, setIsSavingFollowup] = useState(false);

    const doctorId = Number((user as any)?.doctorid) || undefined;
    const hospitalId = Number((user as any)?.hospitalid) || undefined;

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const v = await opdService.getVisit(opdId);
            setVisit(v); setComplaint(v.chief_complaint || ""); setNotes(v.clinical_notes || "");
        } catch (e: any) {
            addToast(e?.message || "Failed to load OPD visit", "error");
        } finally { setIsLoading(false); }
    }, [opdId, addToast]);

    useEffect(() => { load(); }, [load]);

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await opdService.updateVisit(opdId, { chief_complaint: complaint, clinical_notes: notes });
            addToast("Notes saved", "success");
        } catch (e: any) {
            addToast(e?.message || "Failed to save notes", "error");
        } finally { setIsSavingNotes(false); }
    };

    const handleDischarge = async () => {
        setIsDischarging(true);
        try {
            await opdService.updateVisit(opdId, { is_active: false });
            addToast("Patient discharged", "success");
            setVisit(prev => prev ? { ...prev, is_active: false } : null); // Optimistic update
            setShowFollowupDialog(true);
        } catch (e: any) {
            addToast(e?.message || "Failed to discharge", "error");
        } finally { setIsDischarging(false); }
    };

    const handleFollowupSave = async () => {
        if (followupDate && followupReason) {
            setIsSavingFollowup(true);
            try {
                await followupsService.create({ visit_id: opdId, recommended_date: followupDate, reason: followupReason });
                addToast("Follow-up scheduled", "success");
            } catch {
                addToast("Failed to save follow-up, but patient is discharged", "error");
            } finally { setIsSavingFollowup(false); }
        }
        setShowFollowupDialog(false);
        onDischarge?.("Completed");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <div className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <p className="text-sm font-medium">Loading visit...</p>
            </div>
        );
    }

    if (!visit) return null;

    const patient = visit.patients;
    const patientName = patient?.users_patients_user_idTousers?.full_name || "Patient";
    const age = calculateAge(patient?.dob || "");

    const dxCount = visit.opd_diagnoses?.length || 0;
    const testCount = visit.opd_tests?.length || 0;
    const procCount = visit.opd_procedures?.length || 0;
    const rxCount = visit.prescriptions?.reduce((a, p) => a + (p.prescription_items?.length || 0), 0) || 0;
    
    const handlePrint = () => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
            let html = `
                <html>
                    <head>
                        <title>Prescription - ${patientName}</title>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                            @page { margin: 15mm; size: A4; }
                            body { font-family: 'Inter', sans-serif; color: #111; line-height: 1.5; font-size: 13px; }
                            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
                            .header-left h1 { margin: 0; font-size: 24px; color: #1e3a8a; letter-spacing: -0.5px; }
                            .header-left p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
                            .header-right { text-align: right; }
                            .header-right h2 { margin: 0; font-size: 18px; color: #334155; }
                            .header-right p { margin: 2px 0 0; color: #64748b; font-size: 12px; }
                            
                            .patient-card { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
                            .p-grid { display: grid; grid-template-columns: max-content auto; gap: 4px 12px; }
                            .p-label { color: #64748b; font-weight: 500; font-size: 12px; }
                            .p-val { font-weight: 600; color: #0f172a; }
                            
                            .section { margin-bottom: 25px; page-break-inside: avoid; }
                            .section-title { font-size: 14px; font-weight: 700; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                            
                            p.notes { background: #f8fafc; padding: 10px; border-left: 3px solid #cbd5e1; margin: 0; white-space: pre-wrap; }
                            
                            ul { margin: 0; padding-left: 20px; }
                            li { margin-bottom: 6px; color: #334155; }
                            li strong { color: #0f172a; }
                            
                            table { w-full; border-collapse: collapse; margin-top: 5px; width: 100%; }
                            th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; }
                            th { background: #f1f5f9; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; }
                            td { color: #1e293b; font-size: 13px; }
                            
                            .rx-symbol { font-size: 24px; font-weight: bold; color: #3b82f6; font-family: serif; float: left; margin-right: 15px; margin-top: -5px; }
                            
                            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
                            .sign-box { text-align: center; width: 200px; }
                            .sign-line { border-top: 1px dashed #64748b; padding-top: 8px; font-weight: 600; color: #0f172a; font-size: 14px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="header-left">
                                <h1>MEDCORE HOSPITAL</h1>
                                <p>Excellence in Healthcare</p>
                            </div>
                            <div class="header-right">
                                <h2>Dr. ${visit.doctors?.users_doctors_user_idTousers?.full_name || 'Doctor'}</h2>
                                <p>${(visit.doctors as any)?.departments_master?.department_name || ''} Specialist</p>
                                <p>Reg No: ${(visit.doctors as any)?.medical_license_no || 'N/A'}</p>
                            </div>
                        </div>

                        <div class="patient-card">
                            <div class="p-grid">
                                <span class="p-label">Patient Name:</span> <span class="p-val">${patientName}</span>
                                <span class="p-label">Age / Gender:</span> <span class="p-val">${age} / ${patient?.gender || '—'}</span>
                                <span class="p-label">Patient ID:</span> <span class="p-val">${patient?.patient_no || '—'}</span>
                            </div>
                            <div class="p-grid">
                                <span class="p-label">Date:</span> <span class="p-val">${new Date((visit as any).visit_datetime || (visit as any).visitdatetime || new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span class="p-label">OPD No:</span> <span class="p-val">${visit.opd_no}</span>
                            </div>
                        </div>
            `;

            if (complaint || notes) {
                html += `<div class="section"><div class="section-title">Clinical Notes</div>`;
                if (complaint) html += `<p style="margin-bottom:8px;"><strong>Chief Complaint:</strong> ${complaint}</p>`;
                if (notes) html += `<p class="notes"><strong>Examination:</strong><br/>${notes}</p>`;
                html += `</div>`;
            }

            if (visit.opd_diagnoses && visit.opd_diagnoses.length > 0) {
                html += `<div class="section"><div class="section-title">Diagnoses</div><ul>`;
                visit.opd_diagnoses.forEach(d => {
                    html += `<li><strong>${d.diagnoses?.diagnosis_name}</strong> ${d.is_primary ? '<span style="color:#2563eb; font-size:11px;">(Primary)</span>' : ''}</li>`;
                });
                html += `</ul></div>`;
            }

            if ((visit.opd_tests && visit.opd_tests.length > 0) || (visit.opd_procedures && visit.opd_procedures.length > 0)) {
                html += `<div style="display: flex; gap: 30px; margin-bottom: 25px; page-break-inside: avoid;">`;
                if (visit.opd_tests && visit.opd_tests.length > 0) {
                    html += `<div style="flex: 1;"><div class="section-title">Investigations Ordered</div><ul>`;
                    visit.opd_tests.forEach(t => { html += `<li>${t.tests?.test_name}</li>`; });
                    html += `</ul></div>`;
                }
                if (visit.opd_procedures && visit.opd_procedures.length > 0) {
                    html += `<div style="flex: 1;"><div class="section-title">Procedures</div><ul>`;
                    visit.opd_procedures.forEach(p => { html += `<li>${p.procedures?.procedure_name}</li>`; });
                    html += `</ul></div>`;
                }
                html += `</div>`;
            }

            if (visit.prescriptions && visit.prescriptions.length > 0) {
                html += `<div class="section"><span class="rx-symbol">℞</span><div class="section-title" style="margin-left: 35px;">Prescription</div><table>
                        <thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>`;
                
                visit.prescriptions.forEach(rx => {
                    if (rx.prescription_items) {
                        rx.prescription_items.forEach(item => {
                            html += `<tr>
                                <td><strong>${item.medicines?.medicine_name}</strong></td>
                                <td>${item.dosage}</td>
                                <td>${item.duration_days} Days</td>
                                <td style="color: #64748b;">${item.instructions || '-'}</td>
                            </tr>`;
                        });
                    }
                });
                
                html += `</tbody></table></div>`;
            }

            html += `
                        <div class="footer">
                            <div style="font-size: 11px; color: #94a3b8;">
                                <p style="margin:0;">Printed on: ${new Date().toLocaleString('en-IN')}</p>
                                <p style="margin:0;">Valid only at MedCore Hospital and affiliated pharmacies.</p>
                            </div>
                            <div class="sign-box">
                                <div class="sign-line">Doctor's Signature</div>
                            </div>
                        </div>
                    </body>
                </html>
            `;

            doc.open();
            doc.write(html);
            doc.close();
            
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 250);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Karla:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fira+Mono:wght@400;500&display=swap');
                .ws-root { font-family: 'Karla', sans-serif; }
                .ws-root * { font-family: inherit; }
                .ws-display { font-family: 'Syne', sans-serif !important; }
                .opd-mono { font-family: 'Fira Mono', monospace !important; }
                @keyframes ws-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .ws-animate { animation: ws-in 0.35s ease both; }
                .ws-animate-1 { animation: ws-in 0.35s 0.05s ease both; }
                .ws-animate-2 { animation: ws-in 0.35s 0.1s ease both; }
                .ws-animate-3 { animation: ws-in 0.35s 0.15s ease both; }
                .ws-animate-4 { animation: ws-in 0.35s 0.2s ease both; }
                .ws-animate-5 { animation: ws-in 0.35s 0.25s ease both; }
                .ws-animate-6 { animation: ws-in 0.35s 0.3s ease both; }
                .ws-section { animation: ws-in 0.3s ease both; }
            `}</style>

            <div className="ws-root space-y-4">
                {/* ── Patient Identity Banner ── */}
                <div className="ws-animate rounded-2xl border border-border/50 bg-card overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-stretch">
                        {/* Left: identity */}
                        <div className="flex items-start gap-4 p-5 flex-1">
                            {/* Avatar */}
                            <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center shadow-md">
                                <span className="ws-display text-xl font-bold text-white">
                                    {patientName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="ws-display text-xl font-bold text-foreground leading-tight truncate">{patientName}</h2>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    <span className="text-sm font-medium text-muted-foreground">{age}</span>
                                    <span className="h-1 w-1 rounded-full bg-border" />
                                    <span className="text-sm font-medium text-muted-foreground capitalize">{patient?.gender || "—"}</span>
                                    {patient?.phone_number && (
                                        <>
                                            <span className="h-1 w-1 rounded-full bg-border" />
                                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                <Phone className="h-3 w-3 opacity-50" />{patient.phone_number}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: meta */}
                        <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 px-5 pb-5 sm:pt-5 sm:pb-5 sm:border-l border-border/40">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 justify-end">
                                    <span className="opd-mono text-[11px] font-medium text-muted-foreground">{visit.opd_no}</span>
                                    {visit.is_active ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-semibold">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                            </span>
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 px-2.5 py-0.5 text-[11px] font-semibold">
                                            Discharged
                                        </span>
                                    )}
                                </div>
                                {patient?.patient_no && (
                                    <p className="text-[11px] text-muted-foreground/60 text-right">UHID: <span className="opd-mono">{patient.patient_no}</span></p>
                                )}
                                
                                <button
                                    onClick={handlePrint}
                                    className="w-full mt-2 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all border border-transparent hover:border-border"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print Rx
                                </button>
                            </div>

                            {/* Clinical summary pills */}
                            <div className="flex flex-wrap gap-1.5 justify-end">
                                {dxCount > 0 && <span className="opd-mono text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md px-2 py-0.5">{dxCount} Dx</span>}
                                {testCount > 0 && <span className="opd-mono text-[10px] bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded-md px-2 py-0.5">{testCount} Test{testCount !== 1 ? 's' : ''}</span>}
                                {procCount > 0 && <span className="opd-mono text-[10px] bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-md px-2 py-0.5">{procCount} Proc</span>}
                                {rxCount > 0 && <span className="opd-mono text-[10px] bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 rounded-md px-2 py-0.5">{rxCount} Rx</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Complaint & Notes ── */}
                <div className="ws-animate-1">
                    <Section
                        icon={FileText}
                        title="Chief Complaint & Notes"
                        subtitle="Record symptoms and clinical observations"
                        accentColor="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chief Complaint</label>
                                <textarea
                                    className="w-full h-16 px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:bg-muted/30"
                                    placeholder="Patient's chief complaint..."
                                    value={complaint}
                                    onChange={e => setComplaint(e.target.value)}
                                    disabled={!visit.is_active}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clinical Notes</label>
                                <textarea
                                    className="w-full h-24 px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:bg-muted/30"
                                    placeholder="Examination findings, clinical notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    disabled={!visit.is_active}
                                />
                            </div>
                            {visit.is_active && (
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={isSavingNotes}
                                    className="inline-flex items-center gap-2 h-9 px-5 rounded-xl border border-border/60 bg-background text-sm font-semibold text-foreground/80 hover:bg-muted/50 hover:text-foreground disabled:opacity-50 transition-all"
                                >
                                    {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save Notes
                                </button>
                            )}
                        </div>
                    </Section>
                </div>

                {/* ── Clinical sections (only when active) ── */}
                {visit.is_active && (
                    <>
                        <div className="ws-animate-2">
                            <Section
                                icon={Stethoscope}
                                title="Diagnoses"
                                subtitle="ICD diagnoses for this visit"
                                accentColor="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900"
                                badgeCount={dxCount}
                            >
                                <DiagnosisPanel opdId={opdId} hospitalId={hospitalId} existing={visit.opd_diagnoses} />
                            </Section>
                        </div>

                        <div className="ws-animate-3">
                            <Section
                                icon={FlaskConical}
                                title="Lab Tests"
                                subtitle="Diagnostic and investigation orders"
                                accentColor="bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900"
                                badgeCount={testCount}
                            >
                                <TestsPanel opdId={opdId} hospitalId={hospitalId} existing={visit.opd_tests} />
                            </Section>
                        </div>

                        <div className="ws-animate-4">
                            <Section
                                icon={Syringe}
                                title="Procedures"
                                subtitle="Clinical and surgical procedures"
                                accentColor="bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900"
                                badgeCount={procCount}
                            >
                                <ProceduresPanel opdId={opdId} hospitalId={hospitalId} existing={visit.opd_procedures} />
                            </Section>
                        </div>

                        <div className="ws-animate-5">
                            <Section
                                icon={Pill}
                                title="Prescription"
                                subtitle="Medicines and dosage instructions"
                                accentColor="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900"
                                badgeCount={rxCount}
                            >
                                <PrescriptionPanel opdId={opdId} doctorId={visit.doctor_id} hospitalId={hospitalId} existing={visit.prescriptions} />
                            </Section>
                        </div>
                    </>
                )}

                {/* ── Dedicated Read-Only / Print-Only Clinical Summary ── */}
                <div className={cn("mt-6 space-y-6 print-clinical-summary", !visit.is_active && "block")}>
                    {/* Complaint & Notes */}
                    {(complaint || notes) && (
                        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border">
                            <h3 className="font-bold border-b pb-1 text-sm text-slate-700">Clinical Notes</h3>
                            {complaint && <p className="text-sm"><strong>Chief Complaint:</strong> {complaint}</p>}
                            {notes && <p className="text-sm"><strong>Examination:</strong> {notes}</p>}
                        </div>
                    )}

                    {/* Diagnoses */}
                    {visit.opd_diagnoses && visit.opd_diagnoses.length > 0 && (
                        <div className="space-y-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <h3 className="font-bold border-b border-blue-200 pb-1 text-sm text-blue-800">Diagnoses</h3>
                            <ul className="list-disc pl-5 text-sm text-blue-900">
                                {visit.opd_diagnoses.map(d => (
                                    <li key={d.opd_diagnosis_id}>
                                        {d.diagnoses?.diagnosis_name} {d.is_primary && <strong>(Primary)</strong>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tests & Procedures */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {visit.opd_tests && visit.opd_tests.length > 0 && (
                            <div className="space-y-2 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100">
                                <h3 className="font-bold border-b border-cyan-200 pb-1 text-sm text-cyan-800">Lab Tests Ordered</h3>
                                <ul className="list-disc pl-5 text-sm text-cyan-900">
                                    {visit.opd_tests.map(t => <li key={t.opd_test_id}>{t.tests?.test_name}</li>)}
                                </ul>
                            </div>
                        )}
                        {visit.opd_procedures && visit.opd_procedures.length > 0 && (
                            <div className="space-y-2 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                <h3 className="font-bold border-b border-orange-200 pb-1 text-sm text-orange-800">Procedures</h3>
                                <ul className="list-disc pl-5 text-sm text-orange-900">
                                    {visit.opd_procedures.map(p => <li key={p.opd_procedure_id}>{p.procedures?.procedure_name}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Prescriptions */}
                    {visit.prescriptions && visit.prescriptions.length > 0 && (
                        <div className="space-y-2 bg-violet-50/50 p-4 rounded-xl border border-violet-100">
                            <h3 className="font-bold border-b border-violet-200 pb-1 text-sm text-violet-800">Rx (Prescription)</h3>
                            <div className="w-full border border-violet-200 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-violet-50 border-b border-violet-200 text-violet-900">
                                        <tr>
                                            <th className="p-2 w-10 text-center">#</th>
                                            <th className="p-2">Medicine Name</th>
                                            <th className="p-2 w-24">Dosage</th>
                                            <th className="p-2 w-20">Days</th>
                                            <th className="p-2 w-48">Instructions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {visit.prescriptions.flatMap(p => p.prescription_items || []).map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 text-center text-gray-500">{idx + 1}</td>
                                                <td className="p-2 font-semibold">{item.medicines?.medicine_name}</td>
                                                <td className="p-2 font-mono text-xs">{item.dosage}</td>
                                                <td className="p-2">{item.duration_days} days</td>
                                                <td className="p-2 italic text-gray-600">{item.instructions || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Discharge / Complete Action ── */}
                <div className="ws-animate-6 pt-2 pb-1 print-hide">
                    {visit.is_active ? (
                        <div className="rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0 mt-0.5">
                                    <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Discharge Patient</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">This will mark the visit as complete and close the active inputs.</p>
                                </div>
                            </div>
                            <button
                                disabled={isDischarging}
                                onClick={handleDischarge}
                                className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(220,38,38,0.3)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.4)] transition-all shrink-0"
                            >
                                {isDischarging ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                Discharge
                            </button>
                        </div>
                    ) : onDischarge ? (
                        <div className="rounded-2xl overflow-hidden border border-blue-100 dark:border-blue-900/50 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 sm:px-5 flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-white leading-tight">Patient Discharged</p>
                                    <p className="text-blue-100 text-xs">Schedule a follow-up or finalize the token.</p>
                                </div>
                            </div>
                            <div className="bg-card p-4 sm:px-5 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Follow-up Date</label>
                                        <Input
                                            type="date"
                                            value={followupDate}
                                            onChange={e => setFollowupDate(e.target.value)}
                                            min={new Date().toISOString().split("T")[0]}
                                            className="h-9 text-sm rounded-lg"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason / Instructions</label>
                                        <Input
                                            value={followupReason}
                                            onChange={e => setFollowupReason(e.target.value)}
                                            placeholder="e.g. Review blood test results..."
                                            className="h-9 text-sm rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                                    <button
                                        onClick={() => onDischarge("Completed")}
                                        className="sm:flex-1 h-10 px-4 rounded-xl border border-input text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                    >
                                        Skip &amp; Mark Completed
                                    </button>
                                    <button
                                        disabled={!followupDate || !followupReason || isSavingFollowup}
                                        onClick={handleFollowupSave}
                                        className="sm:flex-1 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(5,150,105,0.3)] transition-all"
                                    >
                                        {isSavingFollowup ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                                        Save Follow-up &amp; Complete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
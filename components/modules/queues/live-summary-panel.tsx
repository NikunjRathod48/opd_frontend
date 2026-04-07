"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Stethoscope, FlaskConical, Syringe, Pill,
    LogOut, Loader2, CheckCircle2, ClipboardList,
    Printer, CalendarPlus, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import type { ClinicalState } from "./clinical-reducer";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LiveSummaryPanelProps {
    clinical: ClinicalState;
    isActive: boolean;
    isDischarging: boolean;
    opdNo: string;
    patientName: string;
    complaint: string;
    notes: string;
    onDischarge: () => void;
    onPrint: () => void;
    onScheduleFollowup?: () => void;
}

// ─── Section item types ───────────────────────────────────────────────────────

interface SummarySection {
    label: string;
    count: number;
    icon: React.ReactNode;
    iconBg: string;
    items: string[];
    emptyText: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveSummaryPanel({
    clinical,
    isActive,
    isDischarging,
    opdNo,
    patientName,
    complaint,
    notes,
    onDischarge,
    onPrint,
    onScheduleFollowup,
}: LiveSummaryPanelProps) {
    const [showDischargeDialog, setShowDischargeDialog] = useState(false);

    const rxCount = clinical.medicines.reduce(
        (a, p) => a + ((p as any).prescription_items?.length || 0),
        0
    );

    const hasMissingData =
        clinical.diagnoses.length === 0 &&
        clinical.medicines.length === 0 &&
        !complaint.trim() &&
        !notes.trim();

    const pendingTestsCount = clinical.tests.filter(
        (t) => t.test_status === "Ordered"
    ).length;

    const sections: SummarySection[] = [
        {
            label: "Diagnoses",
            count: clinical.diagnoses.length,
            icon: <Stethoscope className="h-3.5 w-3.5" />,
            iconBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
            items: clinical.diagnoses.map((d) => d.diagnoses?.diagnosis_name || ""),
            emptyText: "No diagnosis added",
        },
        {
            label: "Tests",
            count: clinical.tests.length,
            icon: <FlaskConical className="h-3.5 w-3.5" />,
            iconBg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400",
            items: clinical.tests.map((t) => `${t.tests?.test_name || ""} · ${t.test_status}`),
            emptyText: "No tests ordered",
        },
        {
            label: "Procedures",
            count: clinical.procedures.length,
            icon: <Syringe className="h-3.5 w-3.5" />,
            iconBg: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400",
            items: clinical.procedures.map((p) => (p as any).procedures?.procedure_name || ""),
            emptyText: "No procedures added",
        },
        {
            label: "Medicines",
            count: rxCount,
            icon: <Pill className="h-3.5 w-3.5" />,
            iconBg: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
            items: clinical.medicines.flatMap((rx) =>
                ((rx as any).prescription_items || []).map(
                    (m: any) => m.medicines?.medicine_name || ""
                )
            ),
            emptyText: "No medicines prescribed",
        },
    ];

    const totalItems =
        clinical.diagnoses.length +
        clinical.tests.length +
        clinical.procedures.length +
        rxCount;

    return (
        <>
            {/* Sticky wrapper */}
            <div className="sticky top-4 flex flex-col gap-3">

                {/* ── Header card ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden"
                >
                    {/* Gradient header strip */}
                    <div className="px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">
                                Visit Summary
                            </p>
                            <p className="text-xs font-mono text-white/80 mt-0.5">{opdNo}</p>
                        </div>
                        <div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center">
                            <ClipboardList className="h-4 w-4 text-white" />
                        </div>
                    </div>

                    {/* Total count pill */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            Total entries
                        </span>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={totalItems}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.7, opacity: 0 }}
                                className={cn(
                                    "inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full text-xs font-bold",
                                    totalItems > 0
                                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                )}
                            >
                                {totalItems}
                            </motion.span>
                        </AnimatePresence>
                    </div>

                    {/* Sections */}
                    <div className="p-3 space-y-2">
                        <AnimatePresence>
                            {sections.map((sec, i) => (
                                <motion.div
                                    key={sec.label}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.25 }}
                                    className="rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden"
                                >
                                    {/* Section header row */}
                                    <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50/60 dark:bg-slate-800/30">
                                        <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center shrink-0", sec.iconBg)}>
                                            {sec.icon}
                                        </div>
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
                                            {sec.label}
                                        </span>
                                        <AnimatePresence mode="wait">
                                            <motion.span
                                                key={sec.count}
                                                initial={{ scale: 0.6, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.6, opacity: 0 }}
                                                className={cn(
                                                    "inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold",
                                                    sec.count > 0
                                                        ? "bg-slate-800/10 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                )}
                                            >
                                                {sec.count}
                                            </motion.span>
                                        </AnimatePresence>
                                    </div>

                                    {/* Items preview (max 3) */}
                                    {sec.items.length > 0 && (
                                        <div className="px-3 py-2 space-y-1">
                                            {sec.items.slice(0, 3).map((item, j) => (
                                                <motion.p
                                                    key={j}
                                                    initial={{ opacity: 0, x: -6 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: j * 0.04 }}
                                                    className="text-[11px] text-muted-foreground truncate flex items-center gap-1"
                                                >
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                                    {item}
                                                </motion.p>
                                            ))}
                                            {sec.items.length > 3 && (
                                                <p className="text-[10px] font-semibold text-muted-foreground/60 pl-2">
                                                    +{sec.items.length - 3} more
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* ── Actions card ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.35 }}
                    className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm p-3 space-y-2"
                >
                    {/* Print */}
                    <button
                        onClick={onPrint}
                        className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                    >
                        <Printer className="h-3.5 w-3.5" />
                        Print Prescription
                    </button>

                    {/* Follow-up */}
                    {onScheduleFollowup && !isActive && (
                        <button
                            onClick={onScheduleFollowup}
                            className="w-full h-9 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                        >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            Schedule Follow-up
                        </button>
                    )}

                    {/* Discharge */}
                    {isActive ? (
                        <button
                            onClick={() => setShowDischargeDialog(true)}
                            disabled={isDischarging}
                            className="w-full h-11 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {isDischarging
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Discharging...</>
                                : <><LogOut className="h-4 w-4" /> Discharge Patient</>
                            }
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                Patient discharged
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* ── Quick completeness indicator ── */}
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className={cn(
                            "rounded-xl px-4 py-3 border text-xs font-medium flex items-start gap-2",
                            hasMissingData
                                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                        )}
                    >
                        <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {hasMissingData
                            ? "Add a diagnosis, prescription or notes before discharge."
                            : "Visit data looks complete. Ready to discharge."}
                    </motion.div>
                )}
            </div>

            {/* ── Discharge Confirmation Dialog ── */}
            <Dialog open={showDischargeDialog} onOpenChange={setShowDischargeDialog}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-rose-500" />
                            Confirm Patient Discharge
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                            This will close the OPD visit and lock all clinical inputs.
                            The linked appointment and queue token will be automatically
                            completed by the system.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Warnings */}
                    <div className="space-y-2 py-1">
                        {hasMissingData && (
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
                                ⚠️  No diagnosis, prescription, or clinical notes recorded.
                            </div>
                        )}
                        {pendingTestsCount > 0 && (
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-xs text-blue-800 dark:text-blue-300 font-medium">
                                ℹ️  {pendingTestsCount} pending test{pendingTestsCount !== 1 ? "s" : ""} will remain open after discharge.
                            </div>
                        )}
                        {!hasMissingData && pendingTestsCount === 0 && (
                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                                ✓  Visit summary complete.{" "}
                                {clinical.diagnoses.length} diagnosis · {clinical.tests.length} tests · {rxCount} medicines
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <button
                            onClick={() => setShowDischargeDialog(false)}
                            className="flex-1 h-10 rounded-xl border border-input text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isDischarging}
                            onClick={() => {
                                setShowDischargeDialog(false);
                                onDischarge();
                            }}
                            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 transition-all"
                        >
                            {isDischarging
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Discharging...</>
                                : <><LogOut className="h-4 w-4" /> Discharge Now</>
                            }
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

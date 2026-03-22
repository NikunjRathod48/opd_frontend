"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Plus, Pencil, CheckCircle2, Stethoscope, Loader2, RefreshCw, UserX, UserCheck, X, Users, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Specialization {
    specialization_id: number;
    specialization_name: string;
    description?: string;
    is_active: boolean;
}

// ─── Motion variants ──────────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardVariants : import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show:   { opacity: 1, y: 0,  scale: 1,    transition: { type: "spring", stiffness: 300, damping: 24 } },
};

// ─── Gradient palette ─────────────────────────────────────────────────────────

const GRADIENTS = [
    "from-blue-500 to-indigo-500",   "from-violet-500 to-purple-500",
    "from-emerald-500 to-teal-500",  "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",  "from-cyan-500 to-blue-500",
    "from-indigo-500 to-violet-500", "from-teal-500 to-emerald-500",
];
const getGrad = (name: string) => GRADIENTS[(name?.charCodeAt(0) || 0) % GRADIENTS.length];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconBg, glow, delay }: {
    label: string; value: number; icon: any; iconBg: string; glow: string; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 group hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300"
        >
            <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500", glow)} />
            <div className="relative z-10">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4 border", iconBg)}>
                    <Icon className="h-[18px] w-[18px]" />
                </div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground leading-none">{value}</p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">{label}</p>
            </div>
        </motion.div>
    );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SpecCardSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
            className="rounded-2xl border border-border/50 bg-card overflow-hidden animate-pulse"
        >
            {/* top accent */}
            <div className="h-[3px] w-full bg-muted/60" />
            <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl bg-muted/60" />
                    <div className="flex gap-1.5">
                        <div className="h-7 w-7 rounded-lg bg-muted/50" />
                        <div className="h-7 w-7 rounded-lg bg-muted/50" />
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-5 w-3/4 rounded-full bg-muted/60" />
                    <div className="h-3.5 w-full rounded-full bg-muted/40" />
                    <div className="h-3.5 w-2/3 rounded-full bg-muted/30" />
                </div>
                <div className="h-4 w-20 rounded-full bg-muted/40" />
            </div>
        </motion.div>
    );
}

// ─── Specialization Card ──────────────────────────────────────────────────────

function SpecCard({ spec, onEdit, onToggle }: {
    spec: Specialization;
    onEdit: () => void;
    onToggle: () => void;
}) {
    const grad = getGrad(spec.specialization_name);
    const initial = spec.specialization_name?.charAt(0)?.toUpperCase() || "S";

    return (
        <motion.div
            variants={cardVariants} layout
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
                "group relative rounded-2xl border bg-card overflow-hidden",
                "hover:border-border hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)]",
                "hover:-translate-y-0.5 transition-all duration-250",
                !spec.is_active && "opacity-60"
            )}
        >
            {/* Status accent bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-[3px] transition-colors duration-500",
                spec.is_active ? "bg-gradient-to-r from-indigo-400 to-blue-500" : "bg-muted"
            )} />

            {/* Hover glow */}
            <div className={cn(
                "absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none",
                spec.is_active ? "bg-indigo-500" : "bg-slate-400"
            )} />

            <div className="p-5 relative z-10">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                    {/* Avatar */}
                    <div className={cn("h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-250", grad)}>
                        {initial}
                    </div>

                    {/* Action buttons — reveal on hover */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 transition-all duration-200">
                        <Tooltip content="Edit" side="top">
                            <button
                                onClick={e => { e.stopPropagation(); onEdit(); }}
                                className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 shadow-sm flex items-center justify-center text-muted-foreground hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </Tooltip>
                        <Tooltip content={spec.is_active ? "Deactivate" : "Activate"} side="top">
                            <button
                                onClick={e => { e.stopPropagation(); onToggle(); }}
                                className={cn(
                                    "h-7 w-7 rounded-lg border shadow-sm flex items-center justify-center transition-all",
                                    spec.is_active
                                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-100"
                                        : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-100"
                                )}
                            >
                                {spec.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Name + description */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-[15px] text-foreground/90 truncate">{spec.specialization_name}</h3>
                        {!spec.is_active && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                Inactive
                            </span>
                        )}
                    </div>
                    <p className="text-[12px] text-muted-foreground line-clamp-2 min-h-[32px] leading-relaxed">
                        {spec.description || <span className="italic opacity-50">No description provided.</span>}
                    </p>
                </div>

                {/* Footer: active indicator */}
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2">
                    {spec.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SpecializationManager() {
    const { user }     = useAuth();
    const { addToast } = useToast();

    const [specializations, setSpecializations] = useState<Specialization[]>([]);
    const [isLoading,       setIsLoading]       = useState(false);
    const [searchQuery,     setSearchQuery]     = useState("");
    const [isModalOpen,     setIsModalOpen]     = useState(false);
    const [formData,        setFormData]        = useState({ id: 0, name: "", description: "" });
    const [isEditing,       setIsEditing]       = useState(false);
    const [isSubmitting,    setIsSubmitting]    = useState(false);
    const [deleteState,     setDeleteState]     = useState<{ open: boolean; id: number; name: string }>({ open: false, id: 0, name: "" });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get<Specialization[]>("/master-data/specializations");
            setSpecializations(res);
        } catch {
            addToast("Failed to fetch specializations", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredSpecs = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return specializations
            .filter(s => !q || s.specialization_name.toLowerCase().includes(q))
            .sort((a, b) => a.specialization_name.localeCompare(b.specialization_name));
    }, [specializations, searchQuery]);

    const openAdd = () => { setIsEditing(false); setFormData({ id: 0, name: "", description: "" }); setIsModalOpen(true); };
    const openEdit = (s: Specialization) => { setIsEditing(true); setFormData({ id: s.specialization_id, name: s.specialization_name, description: s.description || "" }); setIsModalOpen(true); };

    const handleSubmit = async () => {
        if (!formData.name.trim()) { addToast("Name is required", "error"); return; }
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/master-data/specializations/${formData.id}`, { specialization_name: formData.name, description: formData.description });
                addToast("Specialization updated", "success");
            } else {
                await api.post("/master-data/specializations", { specialization_name: formData.name, description: formData.description, is_active: true });
                addToast("Specialization created", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch {
            addToast("Failed to save specialization", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggle = async () => {
        try {
            await api.patch(`/master-data/specializations/${deleteState.id}/status`, {});
            addToast("Status updated", "success");
            setDeleteState(p => ({ ...p, open: false }));
            fetchData();
        } catch {
            addToast("Failed to update status", "error");
        }
    };

    const totalCount  = specializations.length;
    const activeCount = specializations.filter(s => s.is_active).length;
    const inactiveCount = specializations.filter(s => !s.is_active).length;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
                .spec-root { font-family: 'DM Sans', sans-serif; }
                .spec-root * { font-family: inherit; }
            `}</style>

            <div className="spec-root space-y-6 pb-10">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Master Data</span>
                        </div>
                        <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-none">Specializations</h1>
                        <p className="text-sm text-muted-foreground mt-1.5">Manage global doctor specializations</p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <Tooltip content="Refresh data">
                            <button
                                onClick={fetchData}
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-all"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                                Refresh
                            </button>
                        </Tooltip>
                        <Tooltip content="Add new specialization">
                            <button
                                onClick={openAdd}
                                className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.45)] transition-all"
                            >
                                <Plus className="h-4 w-4" /> Add Specialization
                            </button>
                        </Tooltip>
                    </div>
                </motion.div>

                {/* ── Stat Cards ── */}
                {isLoading ? (
                    <div className="grid grid-cols-3 gap-4">
                        {[0,1,2].map(i => (
                            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 animate-pulse">
                                <div className="h-10 w-10 rounded-xl bg-muted/60 mb-4" />
                                <div className="h-8 w-12 rounded-xl bg-muted/60 mb-2" />
                                <div className="h-3 w-24 rounded-full bg-muted/40" />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        <StatCard label="Total"    value={totalCount}   delay={0}    icon={Users}     iconBg="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900"   glow="bg-indigo-400/20"  />
                        <StatCard label="Active"   value={activeCount}  delay={0.07} icon={UserCheck} iconBg="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" glow="bg-emerald-400/20" />
                        <StatCard label="Inactive" value={inactiveCount}delay={0.14} icon={UserX}    iconBg="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900"             glow="bg-rose-400/20"    />
                    </div>
                )}

                {/* ── Search ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search specializations..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </motion.div>

                {/* ── Grid ── */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => <SpecCardSkeleton key={i} delay={i * 0.05} />)}
                    </div>
                ) : filteredSpecs.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border/40 bg-muted/10"
                    >
                        <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mb-4">
                            <Stethoscope className="h-7 w-7 text-indigo-400" />
                        </div>
                        <p className="text-base font-semibold text-foreground/80">No specializations found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery ? "Try adjusting your search." : "Add your first specialization to get started."}
                        </p>
                        {!searchQuery && (
                            <button onClick={openAdd} className="mt-4 inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all">
                                <Plus className="h-4 w-4" /> Create Specialization
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key={searchQuery}
                        variants={containerVariants} initial="hidden" animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredSpecs.map(spec => (
                                <SpecCard
                                    key={spec.specialization_id}
                                    spec={spec}
                                    onEdit={() => openEdit(spec)}
                                    onToggle={() => setDeleteState({ open: true, id: spec.specialization_id, name: spec.specialization_name })}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* ── Add / Edit Dialog ── */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden spec-root">
                    {/* Gradient header */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 px-7 pt-7 pb-6 shrink-0">
                        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                                    {isEditing ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white">
                                        {isEditing ? "Edit Specialization" : "New Specialization"}
                                    </DialogTitle>
                                    <DialogDescription className="text-indigo-200 text-xs mt-0.5">
                                        {isEditing ? "Update the specialization details" : "Create a new medical specialization"}
                                    </DialogDescription>
                                </div>
                            </div>
                            <button
                                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                                onClick={() => setIsModalOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Form body */}
                    <div className="px-7 py-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Name <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Cardiology"
                                    onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder="Optional description..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-indigo-300 transition-all placeholder:text-muted-foreground/50"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-border/50 bg-muted/10 flex justify-end gap-2.5">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSubmitting}
                            className="h-9 px-5 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_2px_8px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)] flex items-center gap-2 transition-all"
                        >
                            {isSubmitting
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{isEditing ? "Saving..." : "Creating..."}</>
                                : <><CheckCircle2 className="h-3.5 w-3.5" />{isEditing ? "Save Changes" : "Create"}</>
                            }
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Status Toggle Confirm ── */}
            <DeleteConfirmationDialog
                open={deleteState.open}
                onOpenChange={val => setDeleteState(p => ({ ...p, open: val }))}
                onConfirm={handleToggle}
                itemName={deleteState.name}
                title="Update Status?"
                description="Are you sure you want to change the status of this specialization?"
                confirmText="Confirm"
            />
        </>
    );
}
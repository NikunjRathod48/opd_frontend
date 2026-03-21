"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { cn } from "@/lib/utils";
import {
    Plus, Activity, Hash, RefreshCw, Users, XCircle,
    ChevronRight, Stethoscope, User, Search, UserPlus, Loader2, RotateCcw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { queuesService, DailyQueue, QueueToken } from "@/services/queues-service";
import { opdService, OpdVisit, PatientSearchResult } from "@/services/opd-service";
import { useData } from "@/context/data-context";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// --- Schema Definition ---
const patientSchema = z.object({
    full_name: z.string().min(1, "Name is required"),
    dob: z.string().min(1, "Date of Birth is required"),
    gender: z.string().min(1, "Gender is required"),
    blood_group_id: z.string().optional(),
    phone_number: z.string().min(10, "Valid phone number required").optional().or(z.literal("")),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.string().min(1, "Address is required"),
    city_id: z.string().optional(),
    state_id: z.string().optional(),
    pincode: z.string().min(4, "Invalid Pincode").max(6, "Invalid Pincode"),
    emergency_contact_name: z.string().optional(),
    emergency_contact_number: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

// ─── Configs ──────────────────────────────────────────────────────────────────

const TOKEN_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    "Waiting": { label: "Waiting", color: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500" },
    "In Progress": { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
    "Completed": { label: "Completed", color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
    "Skipped": { label: "Skipped", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
};

const QUEUE_STATUS_CONFIG: Record<string, string> = {
    "Active": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Closed": "bg-gray-100 text-gray-700 border-gray-200",
};

// ─── Issue Token Modal ────────────────────────────────────────────────────────

type IssueTab = "existingopd" | "patient" | "walkin";

interface IssueTokenModalProps {
    open: boolean;
    onClose: () => void;
    queue: DailyQueue;
    hospitalGroupId?: number;
    onIssued: () => void;
}

function IssueTokenModal({ open, onClose, queue, hospitalGroupId, onIssued }: IssueTokenModalProps) {
    const { addToast } = useToast();
    const [tab, setTab] = useState<IssueTab>("existingopd");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tab 1: Existing OPD
    const [opdVisits, setOpdVisits] = useState<OpdVisit[]>([]);
    const [opdLoading, setOpdLoading] = useState(false);
    const [selectedOpdId, setSelectedOpdId] = useState<string>("");

    // Tab 2: Patient search
    const [patientQ, setPatientQ] = useState("");
    const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

    // Tab 3: Walk-in (React Hook Form)
    const { bloodGroups, states, getCities } = useData();
    const [formCityList, setFormCityList] = useState<any[]>([]);

    const { control, handleSubmit, watch, setValue, reset: resetForm, formState: { errors } } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: { gender: "Male" }
    });

    const selectedState = watch("state_id");

    useEffect(() => {
        if (selectedState) {
            getCities(selectedState).then(setFormCityList);
        } else {
            setFormCityList([]);
        }
    }, [selectedState, getCities]);

    // Load today's OPD visits for this doctor when modal opens or tab switches
    useEffect(() => {
        if (!open || tab !== "existingopd") return;
        setOpdLoading(true);
        setSelectedOpdId("");
        opdService.getVisits({ hospital_id: queue.hospital_id, is_active: true })
            .then(d => setOpdVisits(Array.isArray(d) ? d : []))
            .catch(() => setOpdVisits([]))
            .finally(() => setOpdLoading(false));
    }, [open, tab, queue]);

    // Debounced patient search
    useEffect(() => {
        if (tab !== "patient" || patientQ.length < 2) return;
        const t = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await opdService.searchPatients(patientQ, hospitalGroupId);
                setPatientResults(Array.isArray(res) ? res : []);
            } catch { setPatientResults([]); }
            finally { setIsSearching(false); }
        }, 400);
        return () => clearTimeout(t);
    }, [patientQ, tab, hospitalGroupId]);

    const reset = () => {
        setTab("existingopd"); setSelectedOpdId(""); setPatientQ(""); setPatientResults([]);
        setSelectedPatient(null); resetForm({ gender: "Male" });
    };

    const handleClose = () => { reset(); onClose(); };

    const handleIssue = async () => {
        setIsSubmitting(true);
        try {
            let opdIdToLink: number | null = null;

            if (tab === "existingopd") {
                // Link to existing OPD visit
                opdIdToLink = (selectedOpdId && selectedOpdId !== "emergency_walkin") ? Number(selectedOpdId) : null;
            } else if (tab === "patient" && selectedPatient) {
                // Create new OPD for existing patient with this doctor
                const opd = await opdService.createVisit({
                    hospital_id: queue.hospital_id,
                    doctor_id: queue.doctor_id,
                    patient_id: selectedPatient.patientid,
                });
                opdIdToLink = opd.opd_id;
            }

            // Issue token (with or without opd_id)
            await queuesService.generateToken(queue.daily_queue_id, opdIdToLink);
            addToast("Token issued!", "success");
            handleClose();
            onIssued();
        } catch (e: any) {
            addToast(e?.message || "Failed to issue token", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onWalkInSubmit: SubmitHandler<PatientFormValues> = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                gender: data.gender,
                city_id: data.city_id ? parseInt(data.city_id) : undefined,
                state_id: data.state_id ? parseInt(data.state_id) : undefined,
                hospital_group_id: hospitalGroupId
            };

            const patient = await opdService.createWalkInPatient(payload as any);
            const opd = await opdService.createVisit({
                hospital_id: queue.hospital_id,
                doctor_id: queue.doctor_id,
                patient_id: (patient as any).patient_id,
            });

            // Issue token
            await queuesService.generateToken(queue.daily_queue_id, opd.opd_id);
            addToast("Walk-in patient registered and Token issued!", "success");
            handleClose();
            onIssued();
        } catch (e: any) {
            addToast(e?.message || "Failed to issue token", "error");
        } finally { setIsSubmitting(false); }
    };

    const opdOptions = opdVisits.map(v => ({
        label: `${v.opd_no || (v as any).opdno || 'OPD'} — ${(v as any).patientName || "Patient"}`,
        value: String(v.opd_id || (v as any).opdid)
    }));
    const selectedVisit = opdVisits.find(v => String(v.opd_id || (v as any).opdid) === selectedOpdId);

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
            <DialogContent className="max-w-md border-none shadow-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-primary">Issue Token</DialogTitle>
                </DialogHeader>

                {/* Tab bar */}
                <div className="flex gap-1 bg-muted rounded-lg p-1 mt-1">
                    {([
                        { k: "existingopd", label: "OPD Visit", icon: Stethoscope },
                        { k: "patient", label: "Patient", icon: Search },
                        { k: "walkin", label: "Walk-in", icon: UserPlus },
                    ] as { k: IssueTab; label: string; icon: any }[]).map(({ k, label, icon: Icon }) => (
                        <button key={k} onClick={() => setTab(k)} className={cn(
                            "flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md font-medium transition-colors",
                            tab === k ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}>
                            <Icon className="h-3 w-3" /> {label}
                        </button>
                    ))}
                </div>

                <div className="space-y-4 pb-2 min-h-[180px]">

                    {/* ── Tab 1: Existing OPD ── */}
                    {tab === "existingopd" && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Select an existing OPD visit for today to link with this token.</p>
                            {opdLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading visits...</div>
                            ) : (
                                <SearchableSelect
                                    options={[{ label: "Emergency Walk-in (No OPD)", value: "emergency_walkin" }, ...opdOptions]}
                                    value={selectedOpdId}
                                    onChange={setSelectedOpdId}
                                    placeholder="Search OPD or select Emergency Walk-in..."
                                    className="h-10"
                                />
                            )}
                            {selectedOpdId && selectedVisit && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm">{(selectedVisit as any).patientName}</p>
                                            <p className="text-xs text-muted-foreground">{selectedVisit.opd_no || (selectedVisit as any).opdno}</p>
                                        </div>
                                        <Badge variant="outline" className="ml-auto bg-green-100 text-green-800 border-green-200 text-[10px]">Active</Badge>
                                    </div>
                                    {(selectedVisit as any).chief_complaint && (
                                        <p className="text-xs text-muted-foreground ml-6">Chief Complaint: {(selectedVisit as any).chief_complaint}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab 2: Registered Patient ── */}
                    {tab === "patient" && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Search by name, phone, or UHID. A new OPD visit will be created for them with this doctor.</p>
                            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
                                <span className="mt-0.5 shrink-0">ℹ️</span>
                                <span>
                                    If an active OPD already exists for this doctor, the same visit is reused (no duplicate).
                                    For a <strong>different doctor</strong>, issue a separate token on that doctor&apos;s queue — each doctor gets their own OPD visit.
                                </span>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input className="w-full pl-8 pr-3 h-9 rounded-md border bg-background text-sm"
                                    placeholder="Search patients..."
                                    value={patientQ} onChange={e => { setPatientQ(e.target.value); setSelectedPatient(null); }} />
                                {isSearching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            {selectedPatient ? (
                                <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm">{selectedPatient.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{selectedPatient.patientno} · {selectedPatient.phone_number}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedPatient(null)} className="text-muted-foreground hover:text-destructive">
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : patientResults.length > 0 ? (
                                <div className="divide-y rounded-lg border max-h-44 overflow-y-auto">
                                    {patientResults.map(p => (
                                        <button key={p.patientid} onClick={() => setSelectedPatient(p)}
                                            className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2">
                                            <div>
                                                <p className="font-medium text-sm">{p.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{p.patientno} · {p.phone_number} · {p.gender}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            ) : patientQ.length >= 2 && !isSearching ? (
                                <p className="text-sm text-center text-muted-foreground py-4">No patients found.</p>
                            ) : null}
                        </div>
                    )}

                    {/* ── Tab 3: Walk-in ── */}
                    {tab === "walkin" && (
                        <form onSubmit={handleSubmit(onWalkInSubmit)} className="space-y-4">
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">Register a new walk-in patient and create an OPD visit instantly.</p>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Full Name *</Label>
                                    <input {...control.register("full_name")} className={cn("w-full h-9 px-3 rounded-md border bg-background text-sm", errors.full_name && "border-red-500")} placeholder="Patient name" />
                                    {errors.full_name && <span className="text-[10px] text-red-500">{errors.full_name.message}</span>}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Phone</Label>
                                        <input {...control.register("phone_number")} className={cn("w-full h-9 px-3 rounded-md border bg-background text-sm", errors.phone_number && "border-red-500")} placeholder="Phone number" />
                                        {errors.phone_number && <span className="text-[10px] text-red-500">{errors.phone_number.message}</span>}
                                    </div>
                                    <div className="space-y-1 relative">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Date of Birth *</Label>
                                        <Controller
                                            control={control}
                                            name="dob"
                                            render={({ field }) => (
                                                <DatePicker value={field.value} onChange={field.onChange} placeholder="Select DOB" className={cn("w-full h-9", errors.dob && "border-red-500")} maxDate={new Date().toISOString().split('T')[0]} />
                                            )}
                                        />
                                        {errors.dob && <span className="text-[10px] text-red-500">{errors.dob.message}</span>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Gender *</Label>
                                        <Controller
                                            control={control}
                                            name="gender"
                                            render={({ field }) => (
                                                <select {...field} className={cn("w-full h-9 px-3 rounded-md border bg-background text-sm", errors.gender && "border-red-500")}>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Blood Group</Label>
                                        <Controller
                                            control={control}
                                            name="blood_group_id"
                                            render={({ field }) => (
                                                <SearchableSelect
                                                    options={bloodGroups.map(bg => ({ label: bg.bloodgroupname, value: bg.bloodgroupid }))}
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                    placeholder="Select Group"
                                                    className="w-full text-sm h-9"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Info */}
                            <div className="space-y-3 pt-2 border-t mt-3">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Address</Label>
                                <div className="space-y-1">
                                    <input {...control.register("address")} className={cn("w-full h-9 px-3 rounded-md border bg-background text-sm", errors.address && "border-red-500")} placeholder="Street address *" />
                                    {errors.address && <span className="text-[10px] text-red-500">{errors.address.message}</span>}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Controller
                                            control={control}
                                            name="state_id"
                                            render={({ field }) => (
                                                <SearchableSelect
                                                    options={states.map(s => ({ label: s.state_name, value: s.state_id.toString() }))}
                                                    value={field.value || ""}
                                                    onChange={(val) => { field.onChange(val); setValue("city_id", ""); }}
                                                    placeholder="State"
                                                    className="w-full text-xs h-9"
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Controller
                                            control={control}
                                            name="city_id"
                                            render={({ field }) => (
                                                <SearchableSelect
                                                    options={formCityList.map(c => ({ label: c.city_name, value: c.city_id.toString() }))}
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                    placeholder="City"
                                                    disabled={!selectedState}
                                                    className="w-full text-xs h-9"
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <input {...control.register("pincode")} className={cn("w-full h-9 px-3 rounded-md border bg-background text-sm", errors.pincode && "border-red-500")} placeholder="Pincode *" maxLength={6} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 mt-2">
                                <Button type="submit" disabled={isSubmitting} className="text-white w-full">
                                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registering...</> : "Register & Issue Token"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    {tab !== "walkin" && (
                        <Button className="text-white" disabled={isSubmitting ||
                            (tab === "existingopd" && !selectedOpdId) ||
                            (tab === "patient" && !selectedPatient)}
                            onClick={handleIssue}>
                            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Issuing...</> :
                                tab === "existingopd" ? (selectedOpdId === "emergency_walkin" ? "Issue Emergency Token" : "Issue Token with OPD") :
                                    "Create OPD & Issue Token"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Receptionist Queue View ─────────────────────────────────────────────

export function ReceptionistQueueView() {
    const { addToast } = useToast();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { doctors } = useData();

    const [queues, setQueues] = useState<DailyQueue[]>([]);
    const [selectedQueue, setSelectedQueue] = useState<DailyQueue | null>(null);
    const [tokens, setTokens] = useState<QueueToken[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isIssueTokenOpen, setIsIssueTokenOpen] = useState(false);

    const hospitalId = (user as any)?.hospitalid;
    const hospitalGroupId = (user as any)?.hospitalgroupid;

    // ─── Loaders ────────────────────────────────────────────────────────────────

    const loadQueues = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            const data = await queuesService.getAllQueues({ hospital_id: hospitalId, date: today });
            setQueues(Array.isArray(data) ? data : []);
        } catch (e: any) {
            addToast(e?.message || "Failed to load queues", "error");
            setQueues([]);
        } finally { setIsLoading(false); setIsRefreshing(false); }
    }, [hospitalId, addToast]);

    const loadTokens = useCallback(async (queueId: number) => {
        try {
            const data = await queuesService.getTokensForQueue(queueId);
            setTokens(Array.isArray(data) ? data : []);
        } catch { setTokens([]); }
    }, []);

    useEffect(() => { loadQueues(); }, [loadQueues]);
    useEffect(() => {
        if (selectedQueue) loadTokens(selectedQueue.daily_queue_id);
        else setTokens([]);
    }, [selectedQueue, loadTokens]);

    // Listen for WebSocket queue updates
    useEffect(() => {
        if (!socket) return;
        const handleQueueUpdate = () => {
            if (selectedQueue) {
                loadTokens(selectedQueue.daily_queue_id);
            }
            loadQueues(); // refresh all queues info
        };
        socket.on("queue:updated", handleQueueUpdate);
        return () => {
            socket.off("queue:updated", handleQueueUpdate);
        };
    }, [socket, selectedQueue, loadTokens, loadQueues]);

    // ─── Actions ────────────────────────────────────────────────────────────────

    const handleTokenIssued = async () => {
        if (!selectedQueue) return;
        await Promise.all([loadTokens(selectedQueue.daily_queue_id), loadQueues()]);
    };

    // ─── Derived ────────────────────────────────────────────────────────────────

    const hospitalDoctors = doctors.filter(d => !hospitalId || String(d.hospitalid) === String(hospitalId));
    const doctorOptions = hospitalDoctors.map(d => ({ label: d.doctorname, value: String(d.doctorid) }));
    const waitingCount = tokens.filter(t => t.status === "Waiting").length;
    const inProgressCount = tokens.filter(t => t.status === "In Progress").length;
    const completedCount = tokens.filter(t => t.status === "Completed").length;

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Queues & Tokens</h2>
                    <p className="text-muted-foreground">Manage daily OPD queues and issue patient tokens</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                        loadQueues(true);
                        if (selectedQueue) loadTokens(selectedQueue.daily_queue_id);
                    }} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ── Queue List ── */}
                <div className="lg:col-span-2 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today's Queues</h3>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm animate-pulse">Loading queues...</div>
                    ) : queues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 bg-muted/20 rounded-xl border border-dashed text-center gap-3">
                            <Activity className="h-8 w-8 text-muted-foreground/50" />
                            <div><p className="font-medium">No queues today</p><p className="text-sm text-muted-foreground">Doctors must open their queues first</p></div>
                        </div>
                    ) : queues.map(q => {
                        const doctorName = q.doctors?.users_doctors_user_idTousers?.full_name || "Doctor";
                        const isSelected = selectedQueue?.daily_queue_id === q.daily_queue_id;
                        return (
                            <Card key={q.daily_queue_id} onClick={() => setSelectedQueue(q)}
                                className={cn("cursor-pointer transition-all duration-200 border hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5",
                                    isSelected && "border-primary shadow-md bg-primary/5")}>
                                <CardContent className="py-4 px-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{doctorName}</p>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <Badge variant="outline" className={cn("text-[10px] px-2 py-0", QUEUE_STATUS_CONFIG[q.status] || "")}>
                                                    {q.status}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Users className="h-3 w-3" /> {q._count?.queue_tokens ?? 0} tokens
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Hash className="h-3 w-3" /> Now: {q.current_token ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isSelected && "text-primary rotate-90")} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* ── Token Panel ── */}
                <div className="lg:col-span-3">
                    {!selectedQueue ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-xl border border-dashed bg-muted/10 text-center gap-3">
                            <Activity className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-muted-foreground">Select a queue to view tokens</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Queue header  */}
                            <Card>
                                <CardContent className="py-4 px-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-lg">{selectedQueue.doctors?.users_doctors_user_idTousers?.full_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Queue #{selectedQueue.daily_queue_id} • {String(selectedQueue.queue_date).split("T")[0]}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {selectedQueue.status === "Active" && (
                                                <Button onClick={() => setIsIssueTokenOpen(true)} className="gap-2 text-white shadow-sm" size="sm">
                                                    <Plus className="h-4 w-4" /> Issue Token
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                                        {[
                                            { label: "Waiting", count: waitingCount, cls: "text-yellow-600" },
                                            { label: "In Progress", count: inProgressCount, cls: "text-blue-600" },
                                            { label: "Completed", count: completedCount, cls: "text-green-600" },
                                        ].map(s => (
                                            <div key={s.label} className="text-center">
                                                <p className={cn("text-2xl font-bold", s.cls)}>{s.count}</p>
                                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Token list */}
                            <div className="space-y-2">
                                {tokens.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-10 rounded-xl border border-dashed text-center gap-2">
                                        <Hash className="h-8 w-8 text-muted-foreground/40" />
                                        <p className="text-muted-foreground text-sm">No tokens issued yet</p>
                                    </div>
                                ) : tokens.map(token => {
                                    const cfg = TOKEN_STATUS_CONFIG[token.status] || TOKEN_STATUS_CONFIG["Waiting"];
                                    const patientName = token.opd_visits?.patients?.users_patients_user_idTousers?.full_name;
                                    const opdNo = token.opd_visits?.opd_no || (token.opd_visits as any)?.opdno;
                                    return (
                                        <div key={token.token_id} className={cn(
                                            "flex items-center gap-4 bg-card border rounded-lg px-4 py-3 transition-all",
                                            token.status === "In Progress" && "ring-2 ring-blue-400 border-blue-300 shadow-sm"
                                        )}>
                                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                                                token.status === "In Progress" ? "bg-blue-500 text-white" :
                                                    token.status === "Completed" ? "bg-green-500 text-white" :
                                                        token.status === "Skipped" ? "bg-gray-300 text-gray-600" :
                                                            "bg-yellow-100 text-yellow-800")}>
                                                {token.token_number}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                                    {patientName || "Walk-in Patient"}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    {opdNo ? <><Stethoscope className="h-3 w-3 shrink-0" />{opdNo}</> : "No OPD linked"}
                                                    {" · "}
                                                    {token.issued_at ? new Date(token.issued_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className={cn("text-[10px] shrink-0 flex items-center gap-1", cfg.color)}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                                                {cfg.label}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Issue Token Modal */}
            {selectedQueue && (
                <IssueTokenModal
                    open={isIssueTokenOpen}
                    onClose={() => setIsIssueTokenOpen(false)}
                    queue={selectedQueue}
                    hospitalGroupId={hospitalGroupId}
                    onIssued={handleTokenIssued}
                />
            )}
        </div>
    );
}

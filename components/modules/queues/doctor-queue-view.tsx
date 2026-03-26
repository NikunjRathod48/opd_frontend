"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context"; // Added this import
import { cn } from "@/lib/utils";
import {
    Activity, Hash, Users, RefreshCw, ChevronRight, Plus,
    CheckCircle2, SkipForward, ArrowRight, Search, UserPlus, XCircle, RotateCcw,
    X, Loader2, Stethoscope, AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queuesService, DailyQueue, QueueToken } from "@/services/queues-service";
import { opdService, PatientSearchResult } from "@/services/opd-service";
import { OpdWorkspace } from "./opd-workspace";
import { City, useData } from "@/context/data-context";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

// --- Schema Definition ---
const patientSchema = z.object({
    full_name: z.string().min(1, "Name is required"),
    dob: z.string().min(1, "Date of Birth is required"),
    gender: z.string().min(1, "Gender is required"),
    blood_group_id: z.string().optional(),
    phone_number: z.string().min(10, "Valid phone number required").optional().or(z.literal("")),
    email: z.email("Invalid email").optional().or(z.literal("")),
    address: z.string().min(1, "Address is required"),
    city_id: z.string().optional(),
    state_id: z.string().optional(),
    pincode: z.string().min(4, "Invalid Pincode").max(6, "Invalid Pincode"),
    emergency_contact_name: z.string().optional(),
    emergency_contact_number: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CIRCLE: Record<string, string> = {
    "Waiting": "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-500 text-white",
    "Completed": "bg-green-500 text-white",
    "Skipped": "bg-gray-300 text-gray-600",
};

// ─── Walk-in / Patient Lookup Panel ──────────────────────────────────────────
// Shown when an In-Progress token has no opd_id

interface StartConsultationProps {
    token: QueueToken;
    queue: DailyQueue;
    hospitalGroupId?: number;
    onLinked: (opdId: number) => void;
    onRevert: (tokenId: number) => void;
}

type ConsultTab = "search" | "walkin";

function StartConsultation({ token, queue, hospitalGroupId, onLinked, onRevert }: StartConsultationProps) {
    const { addToast } = useToast();
    const { user } = useAuth();
    const [tab, setTab] = useState<ConsultTab>("search");

    // Search state
    const [searchQ, setSearchQ] = useState("");
    const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLinking, setIsLinking] = useState(false);

    // Walk-in form (React Hook Form)
    const [isCreating, setIsCreating] = useState(false);
    const { bloodGroups, states, getCities } = useData();
    const [formCityList, setFormCityList] = useState<City[]>([]);

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PatientFormValues>({
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

    const doctorId = (queue as any).doctor_id;
    const hospitalId = (queue as any).hospital_id;

    const handleSearch = useCallback(async () => {
        if (searchQ.length < 2) return;
        setIsSearching(true);
        try {
            const res = await opdService.searchPatients(searchQ, hospitalGroupId);
            setSearchResults(Array.isArray(res) ? res : []);
        } catch { setSearchResults([]); }
        finally { setIsSearching(false); }
    }, [searchQ, hospitalGroupId]);

    useEffect(() => {
        const t = setTimeout(handleSearch, 400);
        return () => clearTimeout(t);
    }, [handleSearch]);

    const linkExistingPatient = async (patient: PatientSearchResult) => {
        setIsLinking(true);
        try {
            // Create a new OPD visit for this patient with the queue's doctor
            const opd = await opdService.createVisit({
                hospital_id: hospitalId,
                patient_id: patient.patientid,
                doctor_id: doctorId,
                chief_complaint: "",
            });
            // Link the token to this OPD
            await queuesService.linkTokenToOpd(token.token_id, opd.opd_id);
            addToast(`OPD created for ${patient.full_name}`, "success");
            onLinked(opd.opd_id);
        } catch (e: any) {
            addToast(e?.message || "Failed to create OPD", "error");
        } finally { setIsLinking(false); }
    };

    const onWalkInSubmit: SubmitHandler<PatientFormValues> = async (data) => {
        setIsCreating(true);
        try {
            const payload = {
                ...data,
                gender: data.gender,
                city_id: data.city_id ? parseInt(data.city_id) : undefined,
                state_id: data.state_id ? parseInt(data.state_id) : undefined,
                hospital_group_id: hospitalGroupId
            };

            // Create patient (walk-in)
            const patient = await opdService.createWalkInPatient(payload as any);
            // Create OPD visit
            const opd = await opdService.createVisit({
                hospital_id: hospitalId,
                patient_id: (patient as any).patient_id,
                doctor_id: doctorId,
                chief_complaint: "",
            });
            // Link token
            await queuesService.linkTokenToOpd(token.token_id, opd.opd_id);
            addToast("Walk-in patient registered and OPD created!", "success");
            onLinked(opd.opd_id);
        } catch (e: any) {
            addToast(e?.message || "Failed to register patient", "error");
        } finally { setIsCreating(false); }
    };

    return (
        <div className="rounded-xl border bg-card p-5 space-y-4 animate-in fade-in duration-300 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-base">Start Consultation — Token #{token.token_number}</h3>
                </div>
                <button 
                    onClick={() => onRevert(token.token_id)}
                    className="h-8 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1.5 transition-colors border border-red-200"
                >
                    <ArrowRight className="h-3 w-3 rotate-180" /> Revert Token
                </button>
            </div>
            <p className="text-sm text-muted-foreground">This token has no OPD record. Search for the patient or register a walk-in.</p>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
                {([
                    { k: "search", label: "Search Patient", icon: Search },
                    { k: "walkin", label: "Walk-in", icon: UserPlus },
                ] as const).map(({ k, label, icon: Icon }) => (
                    <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm rounded-md font-medium transition-colors",
                            tab === k ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                ))}
            </div>

            {/* ── Search Patient ── */}
            {tab === "search" && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            className="w-full pl-8 pr-3 h-9 rounded-md border bg-background text-sm"
                            placeholder="Search by name, phone, or UHID..."
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                        />
                        {isSearching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="divide-y rounded-lg border max-h-56 overflow-y-auto">
                            {searchResults.map(p => (
                                <button
                                    key={p.patientid}
                                    disabled={isLinking}
                                    onClick={() => linkExistingPatient(p)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
                                >
                                    <div>
                                        <p className="font-medium text-sm">{p.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{p.patientno} · {p.phone_number} · {p.gender}</p>
                                    </div>
                                    {isLinking ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                    {searchQ.length >= 2 && !isSearching && searchResults.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No patients found. Try the Walk-in tab to register.</p>
                    )}
                </div>
            )}

            {/* ── Walk-in Registration ── */}
            {tab === "walkin" && (
                <form onSubmit={handleSubmit(onWalkInSubmit)} className="space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
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
                    <div className="space-y-3 pt-2 border-t">
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

                    <Button type="submit" className="w-full text-white gap-2 mt-4" disabled={isCreating}>
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Register & Start Consultation
                    </Button>
                </form>
            )}
        </div>
    );
}

// ─── Main Doctor Queue View ──────────────────────────────────────────────────

export function DoctorQueueView() {
    const { addToast } = useToast();
    const { user } = useAuth();
    const { socket } = useSocket(); // Added this hook call

    const [activeQueue, setActiveQueue] = useState<DailyQueue | null>(null);
    const [previousOpenQueues, setPreviousOpenQueues] = useState<DailyQueue[]>([]);
    const [tokens, setTokens] = useState<QueueToken[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // OPD Workspace modal
    const [workspaceOpdId, setWorkspaceOpdId] = useState<number | null>(null);
    const [consultToken, setConsultToken] = useState<QueueToken | null>(null); // walk-in consult

    const { doctors } = useData();

    // Find the actual doctor profile using the user.id (which is user_id in DB)
    const doctorProfile = doctors.find((d: any) => String(d.userid) === String(user?.id));
    const finalDoctorId = doctorProfile?.doctorid || (user as any)?.doctorid || (user as any)?.id;

    const hospitalId = (user as any)?.hospitalid || (user as any)?.hospital_id || (user as any)?.hospitalId;
    const hospitalGroupId = (user as any)?.hospitalgroupid || (user as any)?.hospital_group_id;

    // ─── Loaders ──────────────────────────────────────────────────────────────

    const loadQueue = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            const params: Record<string, any> = { date: today };
            if (hospitalId) params.hospital_id = hospitalId;
            if (finalDoctorId) params.doctor_id = finalDoctorId;
            else params.resolve_doctor = "true";

            const data = await queuesService.getAllQueues(params);
            const list = Array.isArray(data) ? data : [];
            const active = list.find(q => q.status === "Active") || list[0] || null;
            setActiveQueue(active);

            // Fetch to see if previous days have active queues
            const activeParams: Record<string, any> = { status: "Active" };
            if (hospitalId) activeParams.hospital_id = hospitalId;
            if (finalDoctorId) activeParams.doctor_id = finalDoctorId;
            else activeParams.resolve_doctor = "true";

            const activeData = await queuesService.getAllQueues(activeParams);
            const activeList = Array.isArray(activeData) ? activeData : [];
            const prevOpen = activeList.filter(q => !q.queue_date.startsWith(today));
            setPreviousOpenQueues(prevOpen);

        } catch (e: any) {
            addToast(e?.message || "Failed to load queue", "error");
            setActiveQueue(null);
            setPreviousOpenQueues([]);
        } finally { setIsLoading(false); setIsRefreshing(false); }
    }, [finalDoctorId, hospitalId, addToast]);

    const loadTokens = useCallback(async (queueId: number) => {
        try {
            const data = await queuesService.getTokensForQueue(queueId);
            setTokens(Array.isArray(data) ? data : []);
        } catch { setTokens([]); }
    }, []);

    useEffect(() => { loadQueue(); }, [loadQueue]);
    useEffect(() => {
        if (activeQueue) loadTokens(activeQueue.daily_queue_id);
        else setTokens([]);
    }, [activeQueue, loadTokens]);

    // Listen for WebSocket queue updates
    useEffect(() => {
        if (!socket || !activeQueue) return;
        const handleQueueUpdate = () => {
            loadTokens(activeQueue.daily_queue_id);
            loadQueue(); // refresh queue stats as well
        };
        socket.on("queue:updated", handleQueueUpdate);
        return () => {
            socket.off("queue:updated", handleQueueUpdate);
        };
    }, [socket, activeQueue, loadTokens, loadQueue]);

    // ─── Actions ──────────────────────────────────────────────────────────────

    const handleCreateQueue = async () => {
        setIsLoading(true);
        try {
            if (!finalDoctorId) {
                addToast("Doctor ID not found in user profile. Please wait for data to load or re-login.", "error");
                setIsLoading(false);
                return;
            }

            await queuesService.createQueue({
                hospital_id: Number(hospitalId || (user as any)?.hospital_id),
                doctor_id: Number(finalDoctorId),
                queue_date: new Date().toISOString().split("T")[0],
            });
            addToast("Queue opened successfully!", "success");
            loadQueue();
        } catch (e: any) {
            addToast(e?.message || "Failed to create queue", "error");
            setIsLoading(false);
        }
    };

    const handleCloseQueue = async () => {
        if (!activeQueue) return;
        try {
            await queuesService.updateQueueStatus(activeQueue.daily_queue_id, "Closed");
            addToast("Queue closed", "info");
            loadQueue();
        } catch (e: any) {
            addToast(e?.message || "Failed to close queue", "error");
        }
    };

    const handleCloseSpecificQueue = async (queueId: number) => {
        try {
            await queuesService.updateQueueStatus(queueId, "Closed");
            addToast("Previous queue closed successfully", "success");
            loadQueue();
        } catch (e: any) {
            addToast(e?.message || "Failed to close previous queue", "error");
        }
    };

    const handleReopenQueue = async () => {
        if (!activeQueue) return;
        try {
            await queuesService.updateQueueStatus(activeQueue.daily_queue_id, "Active");
            addToast("Queue reopened!", "success");
            loadQueue();
        } catch (e: any) {
            addToast(e?.message || "Failed to reopen queue", "error");
        }
    };

    const handleTokenAction = async (tokenId: number, status: string) => {
        setActionLoading(tokenId);
        try {
            await queuesService.updateTokenStatus(tokenId, status);
            addToast(`Token marked as ${status}`, "success");
            if (activeQueue) await loadTokens(activeQueue.daily_queue_id);
        } catch (e: any) {
            addToast(e?.message || "Failed to update token", "error");
        } finally { setActionLoading(null); }
    };

    const handleCallToken = async (token: QueueToken) => {
        // Set token to In Progress
        setActionLoading(token.token_id);
        try {
            await queuesService.updateTokenStatus(token.token_id, "In Progress");
            if (activeQueue) await loadTokens(activeQueue.daily_queue_id);
        } catch (e: any) {
            addToast(e?.message || "Failed to call token", "error");
            setActionLoading(null);
            return;
        }
        setActionLoading(null);

        // Open workspace or start-consult flow
        if (token.opd_id) {
            setWorkspaceOpdId(token.opd_id);
        } else {
            setConsultToken(token);
        }
    };

    const handleTokenLinked = async (opdId: number) => {
        setConsultToken(null);
        setWorkspaceOpdId(opdId);
        if (activeQueue) await loadTokens(activeQueue.daily_queue_id);
    };

    const handleRevertToken = async (tokenId: number) => {
        setActionLoading(tokenId);
        try {
            await queuesService.updateTokenStatus(tokenId, "Waiting");
            addToast("Token reverted to waiting list", "success");
            setConsultToken(null);
            if (activeQueue) await loadTokens(activeQueue.daily_queue_id);
        } catch (e: any) {
            addToast(e?.message || "Failed to revert token", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDischarge = async (status?: string) => {
        // If status is passed (e.g. "Completed"), close workspace and complete token
        if (status === "Completed") {
            const opdId = workspaceOpdId;
            setWorkspaceOpdId(null);
            if (activeQueue) {
                const isCurrentToken = tokens.find(t => t.status === "In Progress" && t.opd_id === opdId);
                if (isCurrentToken) {
                    await handleTokenAction(isCurrentToken.token_id, "Completed");
                } else {
                    await loadTokens(activeQueue.daily_queue_id);
                }
            }
        } else {
            // Just refresh tokens to reflect discharge in the background, but keep workspace open for Follow-up Dialog
            if (activeQueue) await loadTokens(activeQueue.daily_queue_id);
        }
    };

    // ─── Derived ──────────────────────────────────────────────────────────────

    const inProgressToken = tokens.find(t => t.status === "In Progress");
    const waitingTokens = tokens.filter(t => t.status === "Waiting");
    const completedTokens = tokens.filter(t => t.status === "Completed");
    const skippedTokens = tokens.filter(t => t.status === "Skipped");

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">Loading your queue...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Queue</h2>
                    <p className="text-muted-foreground">
                        {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => {
                        loadQueue(true);
                        if (activeQueue) loadTokens(activeQueue.daily_queue_id);
                    }} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} /> Refresh
                    </Button>
                    {activeQueue && activeQueue.status === "Active" && (
                        <Button variant="outline" size="sm"
                            onClick={handleCloseQueue}
                            className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                            <XCircle className="h-4 w-4" /> Close Queue
                        </Button>
                    )}
                    {activeQueue && activeQueue.status === "Closed" && (
                        <Button variant="outline" size="sm"
                            onClick={handleReopenQueue}
                            className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                            <RotateCcw className="h-4 w-4" /> Reopen Queue
                        </Button>
                    )}
                </div>
            </div>

            {previousOpenQueues.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-5 w-5" />
                        Action Required: You have {previousOpenQueues.length} open queue{previousOpenQueues.length > 1 ? "s" : ""} from previous days.
                    </div>
                    <p className="text-sm">You must close previous active queues before opening a new one for today.</p>
                    <div className="space-y-2 mt-2">
                        {previousOpenQueues.map(q => (
                            <div key={q.daily_queue_id} className="flex items-center justify-between bg-white/60 p-2.5 rounded-lg border border-red-100">
                                <span className="text-sm font-medium">Queue from {new Date(q.queue_date).toLocaleDateString()}</span>
                                <Button size="sm" variant="destructive" onClick={() => handleCloseSpecificQueue(q.daily_queue_id)}>
                                    Close Queue
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!activeQueue ? (
                <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-dashed bg-muted/10 text-center gap-4">
                    <Activity className="h-12 w-12 text-muted-foreground/30" />
                    <div>
                        <p className="font-semibold text-lg">No active queue today</p>
                        <p className="text-sm text-muted-foreground mt-1">Open a queue to start seeing patients</p>
                    </div>
                    <Button onClick={handleCreateQueue} disabled={previousOpenQueues.length > 0} className="mt-4 gap-2 text-white shadow-sm">
                        <Plus className="h-4 w-4" /> Open Queue
                    </Button>
                </div>
            ) : (
                <div className="space-y-5">
                    {activeQueue.status === "Closed" && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex justify-center font-medium">
                            Queue is currently closed. You cannot call new tokens until you reopen it.
                        </div>
                    )}
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: "Waiting", count: waitingTokens.length, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
                            { label: "In Progress", count: inProgressToken ? 1 : 0, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
                            { label: "Completed", count: completedTokens.length, color: "text-green-600", bg: "bg-green-50 border-green-200" },
                            { label: "Skipped", count: skippedTokens.length, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
                        ].map(s => (
                            <Card key={s.label} className={cn("border", s.bg)}>
                                <CardContent className="py-3 text-center">
                                    <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Start Consultation (walk-in / unlinked token) */}
                    {consultToken && activeQueue && (
                        <StartConsultation
                            token={consultToken}
                            queue={activeQueue}
                            hospitalGroupId={hospitalGroupId}
                            onLinked={handleTokenLinked}
                            onRevert={handleRevertToken}
                        />
                    )}

                    {/* Now Serving */}
                    {inProgressToken && !consultToken && (
                        <div className="relative overflow-hidden rounded-xl border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-5 shadow-md">
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-100 border border-blue-200 rounded-full px-2.5 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Now Serving
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="h-16 w-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg shrink-0">
                                    {inProgressToken.token_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Token #{inProgressToken.token_number}</p>
                                    <p className="font-semibold text-lg truncate">
                                        {inProgressToken.opd_visits?.patients?.users_patients_user_idTousers?.full_name
                                            || (inProgressToken.opd_id ? `OPD #${inProgressToken.opd_id}` : "Walk-in Patient")}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        {inProgressToken.opd_id && (
                                            <Button size="sm" className="gap-1.5 text-white" onClick={() => setWorkspaceOpdId(inProgressToken.opd_id!)}>
                                                <Stethoscope className="h-4 w-4" /> Open Workspace
                                            </Button>
                                        )}
                                        {!inProgressToken.opd_id && (
                                            <Button size="sm" className="gap-1.5 text-white bg-indigo-600 hover:bg-indigo-700" onClick={() => setConsultToken(inProgressToken)}>
                                                <UserPlus className="h-4 w-4" /> Start Consultation
                                            </Button>
                                        )}
                                        <Button size="sm" disabled={actionLoading === inProgressToken.token_id}
                                            onClick={() => handleTokenAction(inProgressToken.token_id, "Completed")}
                                            className="gap-2 text-white bg-green-600 hover:bg-green-700 shadow-sm">
                                            <CheckCircle2 className="h-4 w-4" /> Done
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={actionLoading === inProgressToken.token_id}
                                            onClick={() => handleTokenAction(inProgressToken.token_id, "Skipped")}
                                            className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-100">
                                            <SkipForward className="h-4 w-4" /> Skip
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Call Next */}
                    {!inProgressToken && waitingTokens.length > 0 && activeQueue.status === "Active" && (
                        <Button className="w-full h-14 text-white text-base font-semibold shadow-md gap-3"
                            disabled={actionLoading !== null}
                            onClick={() => handleCallToken(waitingTokens[0])}>
                            <ArrowRight className="h-5 w-5" />
                            Call Token #{waitingTokens[0].token_number}
                        </Button>
                    )}

                    {/* Waiting List */}
                    {waitingTokens.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Users className="h-4 w-4" /> Waiting ({waitingTokens.length})
                            </h3>
                            {waitingTokens.map((token, idx) => {
                                const patientName = token.opd_visits?.patients?.users_patients_user_idTousers?.full_name;
                                const isFirst = idx === 0;
                                return (
                                    <div key={token.token_id} className="flex items-center gap-4 bg-card border rounded-lg px-4 py-3">
                                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                                            isFirst ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                            {token.token_number}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {patientName || (token.opd_id ? `OPD #${token.opd_id}` : "Walk-in Patient")}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Issued {new Date(token.issued_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                        {isFirst && !inProgressToken && activeQueue.status === "Active" && (
                                            <Button size="sm" disabled={actionLoading !== null}
                                                onClick={() => handleCallToken(token)}
                                                className="text-white gap-1.5 shrink-0">
                                                <ChevronRight className="h-4 w-4" /> Call
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Completed */}
                    {completedTokens.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" /> Completed ({completedTokens.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {completedTokens.map(token => (
                                    <div key={token.token_id} className="flex items-center gap-2 bg-green-50/50 border border-green-100 rounded-lg px-3 py-2">
                                        <div className="h-7 w-7 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                            {token.token_number}
                                        </div>
                                        <p className="text-xs truncate text-muted-foreground">
                                            {token.opd_visits?.patients?.users_patients_user_idTousers?.full_name || "Walk-in"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tokens.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed bg-muted/10 text-center gap-3">
                            <Hash className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No tokens issued yet. Queue is open and ready.</p>
                        </div>
                    )}
                </div>
            )}

            {/* OPD Workspace Modal */}
            <Dialog open={!!workspaceOpdId} onOpenChange={open => { if (!open) setWorkspaceOpdId(null); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                            <span className="font-bold text-lg">OPD Consultation</span>
                        </DialogTitle>
                    </DialogHeader>
                    {workspaceOpdId && (
                        <OpdWorkspace
                            opdId={workspaceOpdId}
                            onDischarge={handleDischarge}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

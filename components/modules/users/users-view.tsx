"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
    Search, Users, UserCircle, Building, Mail, Phone, Shield, CheckCircle2,
    XCircle, Loader2, ChevronRight, ChevronLeft, RefreshCw, Plus, Eye, Pencil, X,
    Stethoscope, GraduationCap, HeartPulse, MapPin, PhoneCall, IndianRupee, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserForm, UserFormValues } from "./user-form";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
    user_id: number;
    username: string;
    full_name: string;
    email: string;
    phone_number: string;
    role_name: string;
    hospital_name?: string;
    hospital_group_name?: string;
    is_active: boolean;
    profile_image_url?: string;
    created_at: string;
}

// ── Role badge config ──────────────────────────────────────────────────────────
const roleConfig: Record<string, { color: string; dot: string }> = {
    "Super Admin":    { color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",   dot: "bg-purple-500" },
    "Group Admin":    { color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",   dot: "bg-indigo-500" },
    "Hospital Admin": { color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",               dot: "bg-blue-500" },
    "Doctor":        { color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
    "Receptionist":  { color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",         dot: "bg-amber-500" },
    "Patient":       { color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",            dot: "bg-slate-400" },
};

const avatarGradients = [
    "from-violet-500 to-indigo-500", "from-blue-500 to-cyan-400",
    "from-emerald-500 to-teal-400", "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400", "from-fuchsia-500 to-violet-400",
    "from-teal-500 to-emerald-400", "from-indigo-500 to-blue-400",
];

const getGradient = (name: string) => avatarGradients[(name?.charCodeAt(0) || 0) % avatarGradients.length];

// ── Skeleton row ───────────────────────────────────────────────────────────────
function SkeletonRow() {
    return (
        <div className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 items-center animate-pulse">
            <div className="col-span-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 w-3/4" />
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 w-1/2" />
                </div>
            </div>
            <div className="col-span-3"><div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 w-40" /></div>
            <div className="col-span-2 flex justify-center"><div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" /></div>
            <div className="col-span-2"><div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 w-28" /></div>
            <div className="col-span-1 flex justify-center"><div className="h-5 w-9 rounded-full bg-slate-100 dark:bg-slate-800" /></div>
            <div className="col-span-1 flex justify-end gap-1"><div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
        </div>
    );
}

// ── Info Row for View Modal ──────────────────────────────────────────────────
function InfoRow({ icon: Icon, color, label, value, mono = false }: { icon: any; color: string; label: string; value?: string | number; mono?: boolean; }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
            <div className={cn("h-9 w-9 rounded-full border flex items-center justify-center shrink-0", color)}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={cn("text-sm font-semibold truncate text-foreground", mono && "font-mono")}>{value || "—"}</p>
            </div>
        </div>
    );
}

const accentMap: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    blue:    { bg: "bg-blue-50 dark:bg-blue-950/30",    text: "text-blue-700 dark:text-blue-300",    border: "border-blue-100 dark:border-blue-900",    icon: "text-blue-500" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-100 dark:border-emerald-900", icon: "text-emerald-500" },
    indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/30",  text: "text-indigo-700 dark:text-indigo-300",  border: "border-indigo-100 dark:border-indigo-900",  icon: "text-indigo-500" },
    violet:  { bg: "bg-violet-50 dark:bg-violet-950/30",  text: "text-violet-700 dark:text-violet-300",  border: "border-violet-100 dark:border-violet-900",  icon: "text-violet-500" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-700 dark:text-amber-300",   border: "border-amber-100 dark:border-amber-900",   icon: "text-amber-500" },
    teal:    { bg: "bg-teal-50 dark:bg-teal-950/30",    text: "text-teal-700 dark:text-teal-300",    border: "border-teal-100 dark:border-teal-900",    icon: "text-teal-500" },
};

function ViewInfoTile({ label, value, accent = "blue", mono = false }: { label: string; value?: string | number; accent?: string; mono?: boolean }) {
    const a = accentMap[accent] || accentMap.blue;
    return (
        <div className={cn("flex flex-col gap-0.5 px-3.5 py-3 rounded-xl border", a.bg, a.border)}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
            <span className={cn("text-sm font-bold truncate", a.text, mono && "font-mono")}>{value ?? "—"}</span>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function UsersView() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const { data: users = [], isLoading, mutate: fetchUsers } = useApi<User[]>(user ? "/users" : null);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchingAction, setFetchingAction] = useState<{ id: number, type: 'view' | 'edit' } | null>(null);

    const availableRoles = useMemo(() => Array.from(new Set(users.map(u => u.role_name))).filter(Boolean), [users]);

    const filteredUsers = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return users.filter(u => {
            const matchesSearch =
                (u.full_name?.toLowerCase().includes(q) ?? false) ||
                (u.email?.toLowerCase().includes(q) ?? false) ||
                (u.username?.toLowerCase().includes(q) ?? false);
            const matchesRole = roleFilter === "All" || u.role_name === roleFilter;
            const matchesStatus =
                statusFilter === "All" ||
                (statusFilter === "Active" && u.is_active) ||
                (statusFilter === "Inactive" && !u.is_active);
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, roleFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalCount = users.length;
    const activeCount = users.filter(u => u.is_active).length;
    const inactiveCount = totalCount - activeCount;

    const stats = [
        { label: "Total Users",    value: totalCount,   icon: <Users className="h-5 w-5" />,        color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600" },
        { label: "Active",         value: activeCount,  icon: <CheckCircle2 className="h-5 w-5" />,  color: "from-emerald-500 to-teal-500",  bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
        { label: "Inactive",       value: inactiveCount, icon: <XCircle className="h-5 w-5" />,      color: "from-slate-400 to-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/60 text-slate-500" },
        { label: "Roles",          value: availableRoles.length, icon: <Shield className="h-5 w-5" />, color: "from-blue-500 to-cyan-500",  bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
    ];

    const statusOptions = [{ label: "All Statuses", value: "All" }, { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }];

    // ── Actions ──
    const fetchUserDetails = async (user_id: number, type: 'view' | 'edit') => {
        setFetchingAction({ id: user_id, type });
        try {
            const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/users/${user_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch full user details");
            return await res.json();
        } catch (error: any) {
            addToast(error.message, "error");
            return null;
        } finally {
            setFetchingAction(null);
        }
    };

    const handleOpenAdd = () => { setSelectedUser(null); setModalMode("add"); setIsModalOpen(true); };
    
    const handleOpenEdit = async (u: User) => {
        const details = await fetchUserDetails(u.user_id, 'edit');
        if (details) {
            setSelectedUser(details);
            setModalMode("edit");
            setIsModalOpen(true);
        }
    };

    const handleOpenView = async (u: User) => {
        const details = await fetchUserDetails(u.user_id, 'view');
        if (details) {
            setSelectedUser(details);
            setModalMode("view");
            setIsModalOpen(true);
        }
    };

    const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedUser(null), 300); };

    const handleFormSubmit = async (data: UserFormValues, file: File | string | null) => {
        setIsSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== "") fd.append(k, String(v)); });
            if (file instanceof File) fd.append("file", file);

            // Determine endpoint logic
            let endpoint = "";
            let method = "POST";
            if (modalMode === "add") {
                if (data.role_name === "Doctor") endpoint = "/doctors";
                else if (data.role_name === "Super Admin") endpoint = "/auth/register-super-admin";
                else if (data.role_name === "Group Admin") endpoint = "/auth/register-group-admin";
                else if (data.role_name === "Hospital Admin") endpoint = "/auth/register-hospital-admin";
                else if (data.role_name === "Receptionist") endpoint = "/auth/register-receptionist";
                else if (data.role_name === "Patient") endpoint = "/auth/register";
            } else {
                endpoint = `/users/${selectedUser?.user_id}`;
                method = "PUT";
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}${endpoint}`, {
                method, headers: { Authorization: `Bearer ${token}` }, body: fd
            });
            const resData = await res.json();
            if (!res.ok) throw new Error(resData.message || "Failed operation");
            
            addToast(`User successfully ${modalMode === "add" ? "created" : "updated"}!`, "success");
            await fetchUsers();
            handleCloseModal();
        } catch (error: any) {
            addToast(error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (userToToggle: User) => {
        const newStatus = !userToToggle.is_active;
        // Optimistic UI update
        fetchUsers(users.map(u => u.user_id === userToToggle.user_id ? { ...u, is_active: newStatus } : u), { revalidate: false });
        try {
            const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/users/${userToToggle.user_id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ is_active: newStatus })
            });
            if (!res.ok) throw new Error("Failed to update status");
            addToast(`User ${newStatus ? 'activated' : 'deactivated'}`, "success");
        } catch (error) {
            // Revert
            fetchUsers(users.map(u => u.user_id === userToToggle.user_id ? { ...u, is_active: !newStatus } : u), { revalidate: false });
            addToast("Failed to toggle status", "error");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent pb-1">
                        System Users
                    </h2>
                    <p className="text-muted-foreground/80 font-medium text-lg mt-1">
                        View and manage all registered users across the platform.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <Button variant="outline" onClick={() => fetchUsers()} disabled={isLoading} className="gap-2 rounded-xl h-11 px-5 border-slate-200 dark:border-slate-800 font-semibold transition-all duration-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
                    </Button>
                    <Button onClick={handleOpenAdd} className="gap-2 rounded-xl h-11 px-6 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.35)] hover:shadow-[0_4px_16px_rgba(124,58,237,0.45)] transition-all">
                        <Plus className="h-4 w-4" /> Add User
                    </Button>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className={cn("inline-flex items-center justify-center h-10 w-10 rounded-xl mb-3", stat.bg)}>{stat.icon}</div>
                            <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{stat.value}</div>
                            <div className="text-xs font-semibold text-muted-foreground mt-0.5">{stat.label}</div>
                            <div className={cn("absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-10", stat.color)} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Search Bar ── */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, email or username..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base" />
            </div>

            {/* ── Filter Chips ── */}
            <div className="flex flex-wrap gap-2">
                {["All", ...availableRoles].map(role => (
                    <button key={role} onClick={() => setRoleFilter(role)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200", roleFilter === role ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300")}>
                        {role === "All" ? "All Roles" : role}
                    </button>
                ))}
                <span className="h-6 w-px bg-slate-200 dark:bg-slate-700 self-center mx-1" />
                {statusOptions.map(opt => (
                    <button key={opt.value} onClick={() => setStatusFilter(opt.value)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200", statusFilter === opt.value ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300")}>
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* ── Users Table ── */}
            {isLoading ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <div className="col-span-3">User</div><div className="col-span-3">Contact</div><div className="col-span-2 text-center">Role</div><div className="col-span-2">Facility</div><div className="col-span-1 text-center">Status</div><div className="col-span-1 text-right">Actions</div>
                    </div>
                    {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
            ) : filteredUsers.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-black/20">
                    <div className="h-20 w-20 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4"><UserCircle className="h-9 w-9 text-violet-400" /></div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No users found</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{searchQuery || roleFilter !== "All" || statusFilter !== "All" ? "Try adjusting your filters." : "No registered users to display."}</p>
                </motion.div>
            ) : (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <div className="col-span-3">User</div>
                        <div className="col-span-3">Contact</div>
                        <div className="col-span-2 text-center">Role</div>
                        <div className="col-span-2">Facility</div>
                        <div className="col-span-1 text-center">Status</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>

                    <AnimatePresence>
                        {paginatedUsers.map((u, i) => {
                            const cfg = roleConfig[u.role_name] || { color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
                            const grad = getGradient(u.full_name);
                            const initials = u.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";
                            return (
                                <motion.div key={u.user_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ delay: i * 0.03 }} className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group items-center last:border-0 relative">
                                    {/* User */}
                                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                                        <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm shrink-0 relative", grad)}>
                                            {u.profile_image_url ? <img src={u.profile_image_url} alt={u.full_name} className="h-9 w-9 rounded-full object-cover" /> : initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{u.full_name}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono truncate">@{u.username}</p>
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className="col-span-3 flex flex-col gap-0.5 min-w-0">
                                        {u.email && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                                                <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{u.email}</span>
                                            </div>
                                        )}
                                        {u.phone_number && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                <Phone className="h-3 w-3 shrink-0" /><span className="font-mono">{u.phone_number}</span>
                                            </div>
                                        )}
                                        {!u.email && !u.phone_number && <span className="text-xs italic text-muted-foreground/40">—</span>}
                                    </div>

                                    {/* Role */}
                                    <div className="col-span-2 flex justify-center">
                                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border", cfg.color)}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />{u.role_name}
                                        </span>
                                    </div>

                                    {/* Facility */}
                                    <div className="col-span-2 min-w-0">
                                        {(u.hospital_name || u.hospital_group_name) ? (
                                            <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                                                <Building className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
                                                <div className="min-w-0">
                                                    {u.hospital_name && <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{u.hospital_name}</p>}
                                                    {u.hospital_group_name && <p className="truncate text-[10px]">{u.hospital_group_name}</p>}
                                                </div>
                                            </div>
                                        ) : <span className="text-xs italic text-muted-foreground/40">—</span>}
                                    </div>

                                    {/* Status Toggle */}
                                    <div className="col-span-1 flex justify-center opacity-70 hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleStatus(u); }} className={cn("relative h-5 w-9 rounded-full transition-colors duration-300 focus:outline-none", u.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700")}>
                                            <motion.span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm" animate={{ x: u.is_active ? 16 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex justify-end gap-1.5">
                                        <Tooltip content="View Details">
                                            <button onClick={() => handleOpenView(u)} disabled={fetchingAction?.id === u.user_id} className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                {fetchingAction?.id === u.user_id && fetchingAction.type === 'view' ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Edit User">
                                            <button onClick={() => handleOpenEdit(u)} disabled={fetchingAction?.id === u.user_id} className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-900/40 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                {fetchingAction?.id === u.user_id && fetchingAction.type === 'edit' ? <Loader2 className="h-4 w-4 animate-spin text-violet-500" /> : <Pencil className="h-4 w-4" />}
                                            </button>
                                        </Tooltip>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 text-sm">
                            <span className="text-xs font-medium text-slate-500">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 shadow-sm rounded-lg border-slate-200 dark:border-slate-700"><ChevronLeft className="h-4 w-4 mr-1" /> Prev</Button>
                                <span className="text-xs font-bold px-2 text-slate-600 dark:text-slate-400">Page {currentPage} of {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 shadow-sm rounded-lg border-slate-200 dark:border-slate-700">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Add/Edit Modal (Directly opens UserForm) ── */}
            <Dialog open={isModalOpen && (modalMode === "add" || modalMode === "edit")} onOpenChange={open => !open && handleCloseModal()}>
                <DialogContent className="max-w-3xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden flex flex-col max-h-[90vh]">
                    <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 px-7 pt-7 pb-6 shrink-0">
                        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                                    {modalMode === "edit" ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white">{modalMode === "edit" ? "Edit User Profile" : "Add New User"}</DialogTitle>
                                    <DialogDescription className="text-violet-200 text-xs mt-0.5">{modalMode === "edit" ? "Update access credentials and details" : "Register and assign a role to a new system user"}</DialogDescription>
                                </div>
                            </div>
                            <button className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all focus:outline-none" onClick={handleCloseModal}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    {isModalOpen && (modalMode === "add" || modalMode === "edit") && (
                        <div className="flex-1 min-h-0 bg-background">
                            <UserForm 
                                mode={modalMode}
                                initialValues={modalMode === "edit" && selectedUser ? {
                                    ...selectedUser,
                                    avatar: selectedUser.profile_image_url,
                                } : undefined}
                                onSubmit={handleFormSubmit}
                                onCancel={handleCloseModal}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── View Modal (Read-Only) ── */}
            <Dialog open={isModalOpen && modalMode === "view"} onOpenChange={open => !open && handleCloseModal()}>
                {selectedUser && (
                    <DialogContent className="max-w-2xl w-full p-0 border-0 shadow-2xl rounded-2xl bg-card overflow-hidden [&>button]:hidden flex">
                        <DialogTitle className="sr-only">User Profile — {selectedUser.full_name}</DialogTitle>

                        {/* LEFT: Gradient Identity Sidebar */}
                        <div className={cn("relative flex flex-col items-center justify-start pt-10 pb-8 px-5 w-48 shrink-0 bg-gradient-to-b min-h-[400px]", getGradient(selectedUser.full_name))}>
                            <div className="absolute -top-10 -left-10 h-36 w-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-10 -right-5 h-28 w-28 rounded-full bg-black/10 blur-2xl pointer-events-none" />

                            <button onClick={handleCloseModal} className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/80 hover:text-white transition-all focus:outline-none">
                                <X className="h-3.5 w-3.5" />
                            </button>

                            {/* Avatar */}
                            <div className="relative mb-4 mt-2 shrink-0">
                                <div className="h-20 w-20 rounded-2xl bg-white/20 ring-4 ring-white/30 overflow-hidden shadow-xl flex items-center justify-center text-white text-3xl font-bold">
                                    {selectedUser.profile_image_url
                                        ? <img src={selectedUser.profile_image_url} alt={selectedUser.full_name} className="h-full w-full object-cover" />
                                        : <span>{selectedUser.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                                    }
                                </div>
                                <span className={cn("absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white shadow-md", selectedUser.is_active ? "bg-emerald-400" : "bg-slate-400")} />
                            </div>

                            <h2 className="text-sm font-bold text-white text-center leading-tight mb-3 drop-shadow">{selectedUser.full_name}</h2>

                            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-2">
                                <Shield className="h-3 w-3 shrink-0" />
                                {selectedUser.role_name}
                            </span>

                            <span className={cn(
                                "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border",
                                selectedUser.is_active
                                    ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-50"
                                    : "bg-slate-400/20 border-slate-300/40 text-white/60"
                            )}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", selectedUser.is_active ? "bg-emerald-300" : "bg-slate-400")} />
                                {selectedUser.is_active ? "Active" : "Inactive"}
                            </span>

                            <div className="mt-auto pt-6 text-center">
                                <p className="text-[9px] text-white/50 uppercase tracking-widest mb-0.5">User ID</p>
                                <p className="text-white/80 text-xs font-mono font-bold">#{selectedUser.user_id}</p>
                            </div>
                        </div>

                        {/* RIGHT: Info panels */}
                        <div className="flex-1 min-w-0 flex flex-col">
                            <ScrollArea className="flex-1 max-h-[480px]">
                                <div className="p-5 space-y-5">

                                    {/* Contact */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="h-5 w-5 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                                <Mail className="h-3 w-3 text-blue-600" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact</span>
                                        </div>
                                        <div className="space-y-2">
                                            <a href={`mailto:${selectedUser.email}`} className="block group">
                                                <ViewInfoTile label="Email Address" value={selectedUser.email} accent="blue" />
                                            </a>
                                            <a href={`tel:${selectedUser.phone_number}`} className="block group">
                                                <ViewInfoTile label="Phone Number" value={selectedUser.phone_number} accent="emerald" mono />
                                            </a>
                                        </div>
                                    </section>

                                    {/* Organization */}
                                    {(selectedUser.hospital_group_name || selectedUser.hospital_name) && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <div className="h-5 w-5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                    <Building className="h-3 w-3 text-indigo-600" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Organization</span>
                                            </div>
                                            <div className="space-y-2">
                                                {selectedUser.hospital_group_name && <ViewInfoTile label="Hospital Group" value={selectedUser.hospital_group_name} accent="indigo" />}
                                                {selectedUser.hospital_name && <ViewInfoTile label="Hospital / Branch" value={selectedUser.hospital_name} accent="violet" />}
                                            </div>
                                        </section>
                                    )}

                                    {/* Doctor-specific section */}
                                    {selectedUser.role_name === "Doctor" && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <div className="h-5 w-5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                                    <Stethoscope className="h-3 w-3 text-emerald-600" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Details</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedUser.gender && <ViewInfoTile label="Gender" value={selectedUser.gender} accent="blue" />}
                                                {selectedUser.qualification && <ViewInfoTile label="Qualification" value={selectedUser.qualification} accent="indigo" />}
                                                {selectedUser.medical_license_no && <ViewInfoTile label="License No." value={selectedUser.medical_license_no} accent="violet" mono />}
                                                {selectedUser.experience_years != null && <ViewInfoTile label="Experience" value={`${selectedUser.experience_years} yr${selectedUser.experience_years !== 1 ? 's' : ''}`} accent="teal" />}
                                                {selectedUser.consultation_fees != null && <ViewInfoTile label="Consultation Fee" value={`₹ ${selectedUser.consultation_fees}`} accent="amber" />}
                                            </div>
                                        </section>
                                    )}

                                    {/* Patient-specific section */}
                                    {selectedUser.role_name === "Patient" && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <div className="h-5 w-5 rounded-md bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                                                    <HeartPulse className="h-3 w-3 text-rose-600" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Patient Details</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedUser.gender && <ViewInfoTile label="Gender" value={selectedUser.gender} accent="blue" />}
                                                {selectedUser.dob && <ViewInfoTile label="Date of Birth" value={new Date(selectedUser.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} accent="indigo" />}
                                                {selectedUser.blood_group_id && <ViewInfoTile label="Blood Group" value={selectedUser.blood_group_id} accent="violet" />}
                                                {selectedUser.patient_no && <ViewInfoTile label="Patient No." value={selectedUser.patient_no} accent="teal" mono />}
                                            </div>
                                            {selectedUser.address && (
                                                <div className="mt-2">
                                                    <ViewInfoTile label="Address" value={selectedUser.address} accent="amber" />
                                                </div>
                                            )}
                                            {(selectedUser.emergency_contact_name || selectedUser.emergency_contact_number) && (
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    {selectedUser.emergency_contact_name && <ViewInfoTile label="Emergency Contact" value={selectedUser.emergency_contact_name} accent="emerald" />}
                                                    {selectedUser.emergency_contact_number && (
                                                        <a href={`tel:${selectedUser.emergency_contact_number}`} className="block">
                                                            <ViewInfoTile label="Emergency Phone" value={selectedUser.emergency_contact_number} accent="teal" mono />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {/* Identity & Activity */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="h-5 w-5 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                                <UserCircle className="h-3 w-3 text-amber-600" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Identity & Activity</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <ViewInfoTile label="Username" value={selectedUser.username} accent="amber" mono />
                                            <ViewInfoTile label="Joined" value={new Date(selectedUser.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} accent="teal" />
                                        </div>
                                    </section>

                                </div>
                            </ScrollArea>

                            <div className="px-5 py-3.5 border-t border-border/40 bg-muted/5 flex justify-end shrink-0">
                                <Button variant="outline" className="rounded-xl font-semibold h-9 text-sm px-5 border-border/60" onClick={handleCloseModal}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
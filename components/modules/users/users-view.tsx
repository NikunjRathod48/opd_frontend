"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
    Search,
    Users,
    UserCircle,
    Building,
    Mail,
    Phone,
    Shield,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronRight,
    ChevronLeft,
    RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
    "from-violet-500 to-indigo-500",
    "from-blue-500 to-cyan-400",
    "from-emerald-500 to-teal-400",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-fuchsia-500 to-violet-400",
    "from-teal-500 to-emerald-400",
    "from-indigo-500 to-blue-400",
];

const getGradient = (name: string) =>
    avatarGradients[(name?.charCodeAt(0) || 0) % avatarGradients.length];

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
            <div className="col-span-2 flex justify-end"><div className="h-5 w-14 rounded-full bg-slate-100 dark:bg-slate-800" /></div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function UsersView() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await api.get<User[]>("/users");
            setUsers(data);
        } catch (error: any) {
            addToast(error.message || "Failed to fetch users", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchUsers();
    }, [user]);

    const availableRoles = useMemo(
        () => Array.from(new Set(users.map(u => u.role_name))).filter(Boolean),
        [users]
    );

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

    // Reset page on filter change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, roleFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalCount = users.length;
    const activeCount = users.filter(u => u.is_active).length;
    const inactiveCount = totalCount - activeCount;

    // Stats
    const stats = [
        { label: "Total Users",    value: totalCount,   icon: <Users className="h-5 w-5" />,        color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600" },
        { label: "Active Users",   value: activeCount,  icon: <CheckCircle2 className="h-5 w-5" />,  color: "from-emerald-500 to-teal-500",  bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
        { label: "Inactive Users", value: inactiveCount, icon: <XCircle className="h-5 w-5" />,      color: "from-slate-400 to-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/60 text-slate-500" },
        { label: "Roles",          value: availableRoles.length, icon: <Shield className="h-5 w-5" />, color: "from-blue-500 to-cyan-500",  bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
    ];

    const statusOptions = [
        { label: "All Statuses", value: "All" },
        { label: "Active",   value: "Active" },
        { label: "Inactive", value: "Inactive" },
    ];

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
                <Button
                    variant="outline"
                    onClick={fetchUsers}
                    disabled={isLoading}
                    className="gap-2 rounded-xl h-11 px-5 border-slate-200 dark:border-slate-800 font-semibold transition-all duration-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 self-start"
                >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className={cn("inline-flex items-center justify-center h-10 w-10 rounded-xl mb-3", stat.bg)}>
                                {stat.icon}
                            </div>
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
                <Input
                    placeholder="Search by name, email or username..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base"
                />
            </div>

            {/* ── Filter Chips ── */}
            <div className="flex flex-wrap gap-2">
                {/* Role filters */}
                {["All", ...availableRoles].map(role => (
                    <button
                        key={role}
                        onClick={() => setRoleFilter(role)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200",
                            roleFilter === role
                                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300"
                        )}
                    >
                        {role === "All" ? "All Roles" : role}
                    </button>
                ))}
                <span className="h-6 w-px bg-slate-200 dark:bg-slate-700 self-center mx-1" />
                {/* Status filters */}
                {statusOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200",
                            statusFilter === opt.value
                                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* ── Users Table ── */}
            {isLoading ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <div className="col-span-3">User</div>
                        <div className="col-span-3">Contact</div>
                        <div className="col-span-2 text-center">Role</div>
                        <div className="col-span-2">Facility</div>
                        <div className="col-span-2 text-right">Status</div>
                    </div>
                    {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
            ) : filteredUsers.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-black/20"
                >
                    <div className="h-20 w-20 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
                        <UserCircle className="h-9 w-9 text-violet-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No users found</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {searchQuery || roleFilter !== "All" || statusFilter !== "All"
                            ? "Try adjusting your filters."
                            : "No registered users to display."}
                    </p>
                </motion.div>
            ) : (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <div className="col-span-3">User</div>
                        <div className="col-span-3">Contact</div>
                        <div className="col-span-2 text-center">Role</div>
                        <div className="col-span-2">Facility</div>
                        <div className="col-span-2 text-right">Status</div>
                    </div>

                    <AnimatePresence>
                        {paginatedUsers.map((u, i) => {
                            const cfg = roleConfig[u.role_name] || { color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
                            const grad = getGradient(u.full_name);
                            const initials = u.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";
                            return (
                                <motion.div
                                    key={u.user_id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 8 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group items-center last:border-0"
                                >
                                    {/* User */}
                                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                                        <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm shrink-0 relative", grad)}>
                                            {u.profile_image_url
                                                ? <img src={u.profile_image_url} alt={u.full_name} className="h-9 w-9 rounded-full object-cover" />
                                                : initials
                                            }
                                            {/* active dot */}
                                            <span className={cn(
                                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900",
                                                u.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                                            )} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{u.full_name}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono truncate">@{u.username}</p>
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className="col-span-3 flex flex-col gap-0.5 min-w-0">
                                        {u.email && (
                                            <a href={`mailto:${u.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 transition-colors truncate">
                                                <Mail className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{u.email}</span>
                                            </a>
                                        )}
                                        {u.phone_number && (
                                            <a href={`tel:${u.phone_number}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors">
                                                <Phone className="h-3 w-3 shrink-0" />
                                                <span className="font-mono">{u.phone_number}</span>
                                            </a>
                                        )}
                                        {!u.email && !u.phone_number && <span className="text-xs italic text-muted-foreground/40">—</span>}
                                    </div>

                                    {/* Role */}
                                    <div className="col-span-2 flex justify-center">
                                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border", cfg.color)}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                                            {u.role_name}
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
                                        ) : (
                                            <span className="text-xs italic text-muted-foreground/40">—</span>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2 flex justify-end">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                                            u.is_active
                                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                        )}>
                                            {u.is_active
                                                ? <><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>Active</>
                                                : <><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Inactive</>
                                            }
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 text-sm">
                            <span className="text-xs font-medium text-slate-500">
                                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 shadow-sm rounded-lg border-slate-200 dark:border-slate-700"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                </Button>
                                <span className="text-xs font-bold px-2 text-slate-600 dark:text-slate-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 shadow-sm rounded-lg border-slate-200 dark:border-slate-700"
                                >
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData, User } from "@/context/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Shield, Building, Eye, Pencil, Mail, Phone, User as UserIcon, X, Building2, EyeOff, Trash2, CheckCircle2, Filter, RefreshCw, Users, UserCheck, UserX, CalendarDays, Loader2, Clock, Hash, IdCard, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { stiffness: 300, damping: 24 } }
};

const adminSchema = z.object({
    name: z.string().min(1, "Full Name is required"),
    email: z.string().email("Invalid email address"),
    phoneno: z.string()
        .length(10, "Phone number must be exactly 10 digits")
        .regex(/^\d+$/, "Phone number must be numeric"),
    password: z.string()
        .optional()
        .refine((val) => {
            if (!val) return true;
            return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,12}$/.test(val);
        }, "Password must be 6-12 chars, include 1 uppercase, 1 lowercase, 1 number, and 1 special char"),
    hospitalgroupid: z.string().min(1, "Hospital Group is required"),
    joining_date: z.string().optional(),
    isactive: z.boolean().default(true),
});

type AdminFormValues = z.infer<typeof adminSchema>;

export function GroupAdminList() {
    const { hospitalGroups } = useData();
    const [showPassword, setShowPassword] = useState(false);
    const { addToast } = useToast();

    // UI Filter States
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [generalSearch, setGeneralSearch] = useState("");
    const [searchName, setSearchName] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchContact, setSearchContact] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [searchStatus, setSearchStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Active Filter State
    const [activeFilters, setActiveFilters] = useState({
        general: "",
        name: "",
        email: "",
        contact: "",
        group: "",
        status: "all",
        start: "",
        end: ""
    });

    // Modal States
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [isViewOpen, setIsViewOpen] = useState(false);

    interface AdminUser extends User {
        profileImage?: string;
        joiningDate?: string;
        lastLoginAt?: string;
        employeeId?: string;
    }

    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

    // Form State
    const form = useForm<AdminFormValues>({
        resolver: zodResolver(adminSchema) as any,
        defaultValues: {
            name: "",
            email: "",
            phoneno: "",
            password: "",
            hospitalgroupid: "",
            joining_date: new Date().toISOString().split('T')[0],
            isactive: true
        }
    });

    const [profileImage, setProfileImage] = useState<File | string | null>(null);

    // Data States
    const [fetchedGroups, setFetchedGroups] = useState(hospitalGroups);
    const [fetchedAdmins, setFetchedAdmins] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
            setIsLoading(true);
            try {
                const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
                if (!token) return;

                const headers = { "Authorization": `Bearer ${token}` };
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com";

                // Fetch Groups and Admins in parallel
                const [groupsRes, adminsRes] = await Promise.all([
                    fetch(`${apiUrl}/hospital-groups`, { headers }),
                    fetch(`${apiUrl}/hospital-groups/admins`, { headers })
                ]);

                if (groupsRes.ok) {
                    const groupsData = await groupsRes.json();
                    const mappedGroups = groupsData.map((g: any) => ({
                        hospitalgroupid: String(g.hospital_group_id),
                        groupname: g.group_name,
                        contactemail: g.contact_email || "",
                        contactno: g.contact_no || "",
                        address: g.address || ""
                    }));
                    setFetchedGroups(mappedGroups);
                }

                if (adminsRes.ok) {
                    const adminsData = await adminsRes.json();
                    const mappedAdmins: AdminUser[] = adminsData
                        .filter((item: any) => item.users_employees_user_idTousers)
                        .map((item: any) => ({
                            userid: String(item.users_employees_user_idTousers.user_id),
                            name: item.users_employees_user_idTousers.full_name,
                            email: item.users_employees_user_idTousers.email,
                            phoneno: item.users_employees_user_idTousers.phone_number,
                            role: 'GroupAdmin',
                            hospitalgroupid: String(item.hospital_groups?.hospital_group_id || ""),
                            isactive: item.users_employees_user_idTousers.is_active,
                            profileImage: item.users_employees_user_idTousers.profile_image_url,
                            joiningDate: item.joining_date,
                            lastLoginAt: item.users_employees_user_idTousers.last_login_at,
                            employeeId: item.employee_id ? String(item.employee_id) : "N/A"
                        }));
                    setFetchedAdmins(mappedAdmins);
                }

            } catch (error) {
                console.error("Failed to load initial data", error);
                addToast("Failed to load data", "error");
            } finally {
                setIsLoading(false);
            }
        };

    // Comprehensive Filter Logic
    const filteredAdmins = fetchedAdmins.filter(a => {
        const { general, name, email, contact, group, status, start, end } = activeFilters;

        // 1. General Search
        let matchesGeneral = true;
        if (general) {
            const query = general.toLowerCase();
            const groupObj = fetchedGroups.find(g => g.hospitalgroupid === a.hospitalgroupid);
            const groupName = groupObj ? groupObj.groupname.toLowerCase() : "";

            matchesGeneral = (
                a.userid.toLowerCase().includes(query) ||
                (a.employeeId && a.employeeId.toLowerCase().includes(query)) ||
                a.name.toLowerCase().includes(query) ||
                a.email.toLowerCase().includes(query) ||
                a.phoneno.includes(query) ||
                groupName.includes(query)
            );
        }

        // 2. Specific Fields
        const matchesName = !name || a.name.toLowerCase().includes(name.toLowerCase());
        const matchesEmail = !email || a.email.toLowerCase().includes(email.toLowerCase());
        const matchesContact = !contact || a.phoneno.includes(contact);
        const matchesGroup = !group || a.hospitalgroupid === group;
        const matchesStatus = status === "all" || (String(status) === "active" ? a.isactive : !a.isactive);

        // 3. Date Range
        let matchesDate = true;
        if (start || end) {
            const dateToCheck = new Date(a.joiningDate || "");
            // Reset time part for accurate date-only comparison
            dateToCheck.setHours(0, 0, 0, 0);

            if (start) {
                const startDateObj = new Date(start);
                startDateObj.setHours(0, 0, 0, 0);
                if (dateToCheck < startDateObj) matchesDate = false;
            }
            if (end) {
                const endDateObj = new Date(end);
                endDateObj.setHours(0, 0, 0, 0);
                if (dateToCheck > endDateObj) matchesDate = false;
            }
        }

        return matchesGeneral && matchesName && matchesEmail && matchesContact && matchesGroup && matchesStatus && matchesDate;
    });

    // Sub-components Data (Unique Options)
    const uniqueNames = Array.from(new Set(fetchedAdmins.map(a => a.name))).map(name => ({ label: name, value: name }));
    const uniqueEmails = Array.from(new Set(fetchedAdmins.map(a => a.email))).map(email => ({ label: email, value: email }));
    const uniqueContacts = Array.from(new Set(fetchedAdmins.map(a => a.phoneno))).map(phone => ({ label: phone, value: phone }));

    const uniqueGroups = Array.from(new Set(fetchedGroups.map(g => g.hospitalgroupid)))
        .map(id => {
            const g = fetchedGroups.find(group => group.hospitalgroupid === id);
            return g ? { label: g.groupname, value: String(g.hospitalgroupid) } : null;
        })
        .filter((item): item is { label: string, value: string } => item !== null);

    const getGroupName = (id?: string) => hospitalGroups.find(g => g.hospitalgroupid === id)?.groupname || fetchedGroups.find(g => g.hospitalgroupid === id)?.groupname || 'Unknown';

    const handleOpenAdd = () => {
        form.reset({
            name: "",
            email: "",
            phoneno: "",
            password: "",
            hospitalgroupid: "",
            joining_date: new Date().toISOString().split('T')[0],
            isactive: true
        });
        setProfileImage(null);
        setModalMode('add');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        form.reset({
            name: admin.name,
            email: admin.email,
            phoneno: admin.phoneno,
            password: "",
            hospitalgroupid: admin.hospitalgroupid || "",
            joining_date: admin.joiningDate ? new Date(admin.joiningDate).toISOString().split('T')[0] : "",
            isactive: admin.isactive !== undefined ? admin.isactive : true
        });
        setProfileImage(admin.profileImage || null);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleOpenView = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        setIsViewOpen(true);
    };

    const applyFilters = () => {
        setActiveFilters({
            general: generalSearch,
            name: searchName,
            email: searchEmail,
            contact: searchContact,
            group: groupFilter,
            status: searchStatus,
            start: startDate,
            end: endDate
        });
        // Optional: Close filter panel on apply
        // setIsFilterOpen(false);
    };

    const resetFilters = () => {
        // Reset UI States
        setGeneralSearch("");
        setSearchName("");
        setSearchEmail("");
        setSearchContact("");
        setGroupFilter("");
        setSearchStatus("all");
        setStartDate("");
        setEndDate("");

        // Reset Active Filters
        setActiveFilters({
            general: "",
            name: "",
            email: "",
            contact: "",
            group: "",
            status: "all",
            start: "",
            end: ""
        });
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        // Delay state reset to allow modal close animation to finish
        setTimeout(() => {
            setModalMode('add');
            form.reset({
                name: "",
                email: "",
                phoneno: "",
                password: "",
                hospitalgroupid: "",
                joining_date: new Date().toISOString().split('T')[0],
                isactive: true
            });
            setProfileImage(null);
            setSelectedAdmin(null);
        }, 300);
    };

    const handleStatusToggle = async (adminId: string, currentStatus: boolean) => {
        try {
            const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com"}/hospital-groups/admin/${adminId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (res.ok) {
                addToast(`Admin access ${!currentStatus ? 'restored' : 'revoked'}`, "success");
                setFetchedAdmins(prev => prev.map(a => a.userid === adminId ? { ...a, isactive: !currentStatus } : a));
            } else {
                throw new Error("Failed to update status");
            }
        } catch (error) {
            addToast("Failed to update status", "error");
        }
    };

    const onSubmit = async (data: AdminFormValues) => {
        if (!data.hospitalgroupid) {
            form.setError("hospitalgroupid", { message: "Please select a hospital group" });
            return;
        }

        // Manual check for password requirement on Add
        if (modalMode === 'add' && !data.password) {
            form.setError("password", { message: "Password is required for new admins" });
            return;
        }

        const token = JSON.parse(localStorage.getItem("medcore_user") || "{}").access_token;
        const headers: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com";

        try {
            const formDataObj = new FormData();
            formDataObj.append("full_name", data.name);
            formDataObj.append("email", data.email);
            formDataObj.append("phone_number", data.phoneno);

            if (data.password) {
                formDataObj.append("password", data.password);
            }

            formDataObj.append("hospital_group_id", data.hospitalgroupid);
            if (data.joining_date) {
                formDataObj.append("joining_date", data.joining_date);
            }

            if (profileImage && profileImage instanceof File) {
                formDataObj.append("file", profileImage);
            }

            let res;
            if (modalMode === 'edit' && selectedAdmin) {
                res = await fetch(`${apiUrl}/hospital-groups/admin/${selectedAdmin.userid}`, {
                    method: "PUT",
                    headers: headers,
                    body: formDataObj
                });
            } else {
                res = await fetch(`${apiUrl}/auth/register-group-admin`, {
                    method: "POST",
                    headers: headers,
                    body: formDataObj
                });
            }

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to save admin");
            }

            addToast(modalMode === 'edit' ? "Group Admin updated successfully" : "Group Admin added successfully", "success");

            handleCancel();
            window.location.reload();

        } catch (error: any) {
            console.error(error);
            addToast(error.message || "Failed to save Group Admin", "error");
        }
    };



    const totalCount = fetchedAdmins.length;
    const activeCount = fetchedAdmins.filter(a => a.isactive).length;
    const inactiveCount = totalCount - activeCount;

    const hasActiveFilters = activeFilters.general || activeFilters.name || activeFilters.email || activeFilters.contact || activeFilters.group || activeFilters.status !== "all" || activeFilters.start || activeFilters.end;

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                        Group Admins
                    </h2>
                    <p className="text-muted-foreground font-medium mt-1">Manage administrators for your hospital networks.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsFilterOpen(true)}
                        className={cn("gap-2 rounded-xl h-11 px-5 font-semibold relative", hasActiveFilters && "border-violet-400 text-violet-700 dark:text-violet-300")}
                    >
                        <Filter className="h-4 w-4" /> Filters
                        {hasActiveFilters && <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold">!</span>}
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={loadData}
                        disabled={isLoading}
                        className="h-11 w-11 rounded-xl"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <Button
                        onClick={handleOpenAdd}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl px-6 h-11 text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-105 active:scale-95 font-semibold"
                    >
                        <Plus className="mr-2 h-5 w-5" /> Add Admin
                    </Button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Admins",     value: totalCount,          icon: <Users className="h-5 w-5" />,       color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600" },
                    { label: "Active Admins",    value: activeCount,         icon: <UserCheck className="h-5 w-5" />,   color: "from-emerald-500 to-teal-500",  bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
                    { label: "Inactive",         value: inactiveCount,       icon: <UserX className="h-5 w-5" />,       color: "from-slate-400 to-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/60 text-slate-500" },
                    { label: "Matching Filter",  value: filteredAdmins.length, icon: <Filter className="h-5 w-5" />,   color: "from-blue-500 to-cyan-500",     bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
                ].map((stat, i) => (
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

            {/* ── Search Bar & Active Filter Pills ── */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, phone or group..."
                        value={generalSearch}
                        onChange={e => setGeneralSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
                        className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base"
                    />
                    {generalSearch && (
                        <button onClick={() => { setGeneralSearch(""); setActiveFilters(p => ({ ...p, general: "" })); }} className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">Active Filters:</span>
                        {activeFilters.general && (
                            <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                                Search: <span className="font-bold ml-1">{activeFilters.general}</span>
                                <button onClick={() => { setGeneralSearch(""); setActiveFilters(p => ({...p, general:""})); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.name && (
                            <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                                Name: <span className="font-bold ml-1">{activeFilters.name}</span>
                                <button onClick={() => { setSearchName(""); setActiveFilters(p => ({...p, name:""})); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.email && (
                            <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                                Email: <span className="font-bold ml-1">{activeFilters.email}</span>
                                <button onClick={() => { setSearchEmail(""); setActiveFilters(p => ({...p, email:""})); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.contact && (
                            <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                                Phone: <span className="font-bold ml-1">{activeFilters.contact}</span>
                                <button onClick={() => { setSearchContact(""); setActiveFilters(p => ({...p, contact:""})); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.group && (
                            <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                                Group: <span className="font-bold ml-1">{getGroupName(activeFilters.group)}</span>
                                <button onClick={() => { setGroupFilter(""); setActiveFilters(p => ({...p, group:""})); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {activeFilters.status !== "all" && (
                            <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                                Status: <span className="font-bold ml-1 capitalize">{activeFilters.status}</span>
                                <button onClick={() => { setSearchStatus("all"); setActiveFilters(p => ({...p, status:"all"})); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        {(activeFilters.start || activeFilters.end) && (
                            <Badge variant="secondary" className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800 rounded-xl font-medium">
                                Joined: <span className="font-bold ml-1">{activeFilters.start || "…"} → {activeFilters.end || "…"}</span>
                                <button onClick={() => { setStartDate(""); setEndDate(""); setActiveFilters(p => ({...p, start:"", end:""})); }} className="ml-2"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                            Clear All
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Cards Grid ── */}
            {isLoading ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 overflow-hidden">
                            <div className="flex flex-col items-center p-5 gap-3">
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <Skeleton className="h-5 w-32 rounded-lg" />
                                <Skeleton className="h-4 w-24 rounded-lg" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <div className="mx-4 mb-4 space-y-2">
                                <Skeleton className="h-9 w-full rounded-xl" />
                                <Skeleton className="h-9 w-full rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
                    <AnimatePresence mode="popLayout">
                    {filteredAdmins.map((admin, i) => (
                        <motion.div
                            key={admin.userid}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.04 }}
                            layout
                        >
                            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                                {/* Status bar */}
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r-full", admin.isactive ? "bg-emerald-400" : "bg-rose-400")} />

                                {/* Quick actions – always visible */}
                                <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                                    <Tooltip content="View Profile">
                                        <button onClick={() => handleOpenView(admin)} className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-all">
                                            <Eye className="h-3.5 w-3.5" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Edit">
                                        <button onClick={() => handleOpenEdit(admin)} className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={admin.isactive ? "Deactivate" : "Activate"}>
                                        <button onClick={() => handleStatusToggle(admin.userid, admin.isactive || false)} className={cn("h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all", admin.isactive ? "text-slate-400 hover:text-red-500 hover:border-red-200" : "text-slate-400 hover:text-emerald-600 hover:border-emerald-200")}>
                                            {admin.isactive ? <Trash2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                        </button>
                                    </Tooltip>
                                </div>

                                {/* Card body */}
                                <div className="flex flex-col items-center text-center p-5 pb-4">
                                    {/* Avatar */}
                                    <div className="relative mb-3">
                                        <div className="h-16 w-16 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-md overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                                            {admin.profileImage
                                                ? <img src={admin.profileImage} alt={admin.name} className="h-full w-full object-cover" />
                                                : admin.name.charAt(0)
                                            }
                                        </div>
                                        <div className={cn("absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-slate-800", admin.isactive ? "bg-emerald-400" : "bg-rose-400")} />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate w-full">{admin.name}</h3>
                                    <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground font-medium">
                                        <Building2 className="h-3 w-3 shrink-0" />
                                        <span className="truncate max-w-[140px]">{getGroupName(admin.hospitalgroupid)}</span>
                                    </div>
                                    <div className="mt-2">
                                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border", admin.isactive ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400")}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full", admin.isactive ? "bg-emerald-500" : "bg-slate-400")} />
                                            {admin.isactive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                </div>

                                {/* Contact section */}
                                <div className="mx-4 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/40 divide-y divide-slate-200/60 dark:divide-slate-700/40 overflow-hidden">
                                    <a href={`mailto:${admin.email}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50/60 dark:hover:bg-violet-900/20 transition-colors group/row">
                                        <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
                                            <Mail className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-xs text-muted-foreground group-hover/row:text-foreground transition-colors truncate font-medium">{admin.email}</span>
                                    </a>
                                    <a href={`tel:${admin.phoneno}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50/60 dark:hover:bg-violet-900/20 transition-colors group/row">
                                        <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 shrink-0">
                                            <Phone className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-xs text-muted-foreground group-hover/row:text-foreground transition-colors font-medium">{admin.phoneno}</span>
                                    </a>
                                </div>


                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredAdmins.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full flex flex-col items-center justify-center p-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-800/60 text-center">
                        <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Shield className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground/80">No admins found</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">No group admins match your current filters.</p>
                        <Button variant="outline" onClick={resetFilters} className="mt-6 rounded-xl px-6">Clear Filters</Button>
                    </motion.div>
                )}
            </div>
            )}

            {/* ── Advanced Filter Side Sheet ── */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetContent className="w-full max-w-sm overflow-y-auto flex flex-col p-0 gap-0 [&>button]:hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:transparent">
                    <SheetHeader className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                    <Filter className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <SheetTitle className="text-base font-bold">Advanced Filters</SheetTitle>
                                    <SheetDescription className="text-xs">Apply to refine the admin list</SheetDescription>
                                </div>
                            </div>
                            <button onClick={() => setIsFilterOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 px-8 py-6 space-y-5 overflow-y-auto">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
                            <SearchableSelect options={uniqueNames} value={searchName} onChange={setSearchName} placeholder="Select Name..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                            <SearchableSelect options={uniqueEmails} value={searchEmail} onChange={setSearchEmail} placeholder="Select Email..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                            <SearchableSelect options={uniqueContacts} value={searchContact} onChange={setSearchContact} placeholder="Select Phone..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hospital Group</Label>
                            <SearchableSelect options={uniqueGroups} value={groupFilter} onChange={setGroupFilter} placeholder="Select Group..." className="w-full h-10 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                            <Select value={searchStatus} onValueChange={setSearchStatus}>
                                <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Joined From</Label>
                            <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" maxDate={endDate} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Joined To</Label>
                            <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" minDate={startDate} />
                        </div>
                    </div>

                    <div className="sticky bottom-0 px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3 shrink-0 z-10">
                        <Button variant="outline" onClick={() => { resetFilters(); setIsFilterOpen(false); }} className="flex-1 rounded-xl h-11">Clear All</Button>
                        <Button onClick={() => { applyFilters(); setIsFilterOpen(false); }} className="flex-1 rounded-xl h-11 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700">Apply</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Add/Edit Modal ── */}
            <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="max-w-xl w-full border-none shadow-2xl bg-white dark:bg-zinc-950 p-0 overflow-hidden [&>button]:hidden rounded-2xl flex flex-col max-h-[88vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", modalMode === 'edit' ? "bg-amber-100 dark:bg-amber-900/30" : "bg-violet-100 dark:bg-violet-900/30")}>
                                {modalMode === 'edit' ? <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400" /> : <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    {modalMode === 'edit' ? "Update Administrator" : "New Administrator"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {modalMode === 'edit' ? "Modify the admin's details below." : "Fill in the details to create an admin account."}
                                </DialogDescription>
                            </div>
                        </div>
                        <button onClick={handleCancel} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                            {/* Photo section */}
                            <div className="flex flex-col items-center gap-2 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                                <ImageUpload value={profileImage} onChange={setProfileImage} variant="avatar" showActions={true} label="" />
                                <p className="text-xs text-muted-foreground font-medium">Profile Photo</p>
                            </div>

                            {/* Form fields */}
                            <div className="px-6 py-6 space-y-4">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                                            <UserIcon className="h-3.5 w-3.5" />
                                        </div>
                                        <Input {...form.register("name")} placeholder="e.g. Dr. Sarah Smith" className="pl-11 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
                                    </div>
                                    {form.formState.errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><X className="h-3 w-3" />{form.formState.errors.name.message}</p>}
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email Address</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                            <Mail className="h-3.5 w-3.5" />
                                        </div>
                                        <Input type="email" {...form.register("email")} placeholder="name@hospital.com" className="pl-11 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
                                    </div>
                                    {form.formState.errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><X className="h-3 w-3" />{form.formState.errors.email.message}</p>}
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Number</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Phone className="h-3.5 w-3.5" />
                                        </div>
                                        <Input type="tel" {...form.register("phoneno")} placeholder="10-digit number" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} maxLength={10} className="pl-11 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
                                    </div>
                                    {form.formState.errors.phoneno && <p className="text-xs text-red-500 flex items-center gap-1"><X className="h-3 w-3" />{form.formState.errors.phoneno.message}</p>}
                                </div>

                                {/* Divider */}
                                <div className="relative py-1">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
                                    <div className="relative flex justify-center"><span className="bg-white dark:bg-zinc-950 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Access & Assignment</span></div>
                                </div>

                                {/* Hospital Group */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hospital Group</Label>
                                    <SearchableSelect
                                        options={fetchedGroups.map(g => ({ label: g.groupname, value: String(g.hospitalgroupid) }))}
                                        value={form.watch("hospitalgroupid")}
                                        onChange={(v) => form.setValue("hospitalgroupid", v, { shouldValidate: true })}
                                        placeholder="Select Organization"
                                        className="w-full"
                                        disabled={modalMode === 'edit'}
                                    />
                                    {form.formState.errors.hospitalgroupid && <p className="text-xs text-red-500 flex items-center gap-1"><X className="h-3 w-3" />{form.formState.errors.hospitalgroupid.message}</p>}
                                </div>

                                {/* Joining Date */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joining Date</Label>
                                    <DatePicker value={form.watch("joining_date")} onChange={(date) => form.setValue("joining_date", date)} maxDate={new Date().toISOString().split('T')[0]} className="w-full" />
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Password {modalMode === 'edit' && <span className="text-muted-foreground/60 normal-case font-normal">(leave blank to keep current)</span>}
                                    </Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                                            <Shield className="h-3.5 w-3.5" />
                                        </div>
                                        <Input type={showPassword ? "text" : "password"} {...form.register("password")} placeholder="••••••••••••" className="pl-11 pr-11 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
                                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {form.formState.errors.password && <p className="text-xs text-red-500 flex items-center gap-1"><X className="h-3 w-3" />{form.formState.errors.password.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-3 justify-end bg-slate-50/50 dark:bg-slate-900/50">
                            <Button type="button" variant="outline" onClick={handleCancel} disabled={form.formState.isSubmitting} className="px-5 rounded-xl h-10 font-medium">Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="px-7 rounded-xl h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30">
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    modalMode === 'edit' ? "Save Changes" : "Create Account"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── View Profile Modal ── */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-[750px] w-full p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-none shadow-2xl rounded-[2rem] [&>button]:hidden flex flex-col max-h-[90vh]">
                    <DialogTitle className="sr-only">Admin Profile</DialogTitle>

                    {/* Gradient Banner */}
                    <div className="h-32 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 relative overflow-hidden shrink-0">
                        {/* Noise / texture overlay */}
                        <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.3),_transparent_60%)]" />
                        {/* Abstract blobs */}
                        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute top-4 right-12 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl" />
                        {/* Close */}
                        <div className="absolute top-3 right-3 z-10">
                            <button onClick={() => setIsViewOpen(false)} className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {/* Identity strip pinned to bottom-left */}
                        <div className="absolute bottom-4 left-6 flex items-center gap-4 z-10">
                            <div className="h-16 w-16 rounded-2xl ring-4 ring-white/30 shadow-2xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-black">
                                {selectedAdmin?.profileImage
                                    ? <img src={selectedAdmin.profileImage} alt={selectedAdmin.name} className="h-full w-full object-cover" />
                                    : selectedAdmin?.name.charAt(0)
                                }
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-extrabold text-white tracking-tight">{selectedAdmin?.name}</h2>
                                    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-sm",
                                        selectedAdmin?.isactive
                                            ? "bg-emerald-500/20 text-white border-emerald-400/50"
                                            : "bg-white/10 text-white/70 border-white/20"
                                    )}>
                                        <span className={cn("h-1.5 w-1.5 rounded-full", selectedAdmin?.isactive ? "bg-emerald-300" : "bg-white/50")} />
                                        {selectedAdmin?.isactive ? "Active" : "Inactive"}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/25 backdrop-blur-sm">
                                        <Shield className="h-3 w-3" /> Group Admin
                                    </span>
                                </div>
                                <p className="text-sm text-white/70 font-medium mt-0.5">{getGroupName(selectedAdmin?.hospitalgroupid)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                        <div className="p-6 space-y-6">
                            {/* Section: Contact Information */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-blue-500" /> Contact Information
                                </h3>
                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
                                        <a href={`mailto:${selectedAdmin?.email}`} className="flex items-center gap-2 text-sm font-semibold hover:text-violet-600 transition-colors group">
                                            <div className="h-7 w-7 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                                                <Mail className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="truncate">{selectedAdmin?.email}</span>
                                        </a>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</span>
                                        <a href={`tel:${selectedAdmin?.phoneno}`} className="flex items-center gap-2 text-sm font-semibold hover:text-violet-600 transition-colors group">
                                            <div className="h-7 w-7 rounded-full bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center shrink-0">
                                                <Phone className="h-3.5 w-3.5" />
                                            </div>
                                            <span>{selectedAdmin?.phoneno || 'N/A'}</span>
                                        </a>
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hospital Group</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
                                                <Building2 className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="text-sm font-semibold">{getGroupName(selectedAdmin?.hospitalgroupid)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Identity & Access */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5 text-violet-500" /> Identity &amp; Access
                                </h3>
                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User ID</span>
                                        <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{selectedAdmin?.userid}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Employee ID</span>
                                        <p className="font-mono text-xs font-bold bg-background/50 border border-border/50 px-2 py-1.5 rounded-md w-fit">{selectedAdmin?.employeeId || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Activity */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5 text-teal-500" /> Activity
                                </h3>
                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Joined</span>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <p className="text-sm font-medium">
                                                {selectedAdmin?.joiningDate
                                                    ? new Date(selectedAdmin.joiningDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Login</span>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <p className="text-sm font-medium">
                                                {selectedAdmin?.lastLoginAt
                                                    ? new Date(selectedAdmin.lastLoginAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                                                    : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0 flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setIsViewOpen(false)} className="px-6 h-10 rounded-xl font-medium">Close</Button>
                        <Button onClick={() => { setIsViewOpen(false); handleOpenEdit(selectedAdmin!); }} className="px-8 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all">
                            <Pencil className="h-4 w-4 mr-2" /> Edit Profile
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData, User } from "@/context/data-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Shield, Building, Eye, Pencil, Mail, Phone, MapPin, User as UserIcon, X, Activity, Building2, ChevronRight, EyeOff, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { ImageUpload } from "@/components/ui/image-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
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

        loadData();
    }, []);

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

    if (isLoading) {
        return <div className="h-[60vh] flex items-center justify-center"><Loader size="lg" text="Loading Group Admins..." /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Page Header with Decor */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent pb-1">
                        Group Admins
                    </h2>
                    <p className="text-muted-foreground/80 font-medium text-lg mt-1">
                        Manage administrators for your hospital networks.
                    </p>
                </div>

                {/* Filter Toggle & Add Button Row */}
                <div className="flex items-center justify-end gap-3 relative z-20">
                    <Button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        variant={isFilterOpen ? "secondary" : "outline"}
                        className={cn(
                            "gap-2 rounded-xl h-11 px-5 transition-all text-sm font-semibold border-white/20 hover:bg-white/10",
                            isFilterOpen ? "bg-white/20 text-foreground border-white/30" : "bg-white/5 backdrop-blur-sm"
                        )}
                    >
                        <Filter className="h-4 w-4" /> Filters
                        {(generalSearch || searchName || searchEmail || searchContact || groupFilter || searchStatus !== "all" || startDate || endDate) && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 absolute top-2 right-2 animate-pulse" />
                        )}
                    </Button>

                    <Tooltip content="Add New Admin" className="w-auto">
                        <Button onClick={handleOpenAdd} size="lg" className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl px-8 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 text-base font-semibold text-white h-11">
                            <Plus className="mr-2 h-5 w-5" /> Add Admin
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Floating Glassmorphism Filter Panel */}
            <AnimatePresence>
                {isFilterOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="mb-8 z-10 relative"
                    >
                        <div className="bg-white/60 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-border dark:border-border/50 shadow-neo-xl">
                            {/* ... (Header and Close Button) ... */}
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-blue-600" /> Advanced Filters
                                </h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setIsFilterOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {/* General Search */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">General Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="ID, Group, Emp ID..."
                                            value={generalSearch}
                                            onChange={(e) => setGeneralSearch(e.target.value)}
                                            className="h-10 pl-9 bg-background/50 border-white/20 focus:bg-background transition-all rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Name</Label>
                                    <SearchableSelect
                                        options={uniqueNames}
                                        value={searchName}
                                        onChange={setSearchName}
                                        placeholder="Select Name..."
                                        className="w-full h-10 rounded-xl"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Email</Label>
                                    <SearchableSelect
                                        options={uniqueEmails}
                                        value={searchEmail}
                                        onChange={setSearchEmail}
                                        placeholder="Select Email..."
                                        className="w-full h-10 rounded-xl"
                                    />
                                </div>

                                {/* Contact */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Contact No</Label>
                                    <SearchableSelect
                                        options={uniqueContacts}
                                        value={searchContact}
                                        onChange={setSearchContact}
                                        placeholder="Select Contact..."
                                        className="w-full h-10 rounded-xl"
                                    />
                                </div>

                                {/* Hospital Group */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Hospital Group</Label>
                                    <SearchableSelect
                                        options={uniqueGroups}
                                        value={groupFilter}
                                        onChange={setGroupFilter}
                                        placeholder="Select Group..."
                                        className="w-full h-10 rounded-xl"
                                    />
                                </div>

                                {/* Status */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Status</Label>
                                    <Select value={searchStatus} onValueChange={(val: any) => setSearchStatus(val)}>
                                        <SelectTrigger className="h-10 bg-white/50 dark:bg-slate-950/50 border-input hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl w-full shadow-sm">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Date Range Start */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Joined From</Label>
                                    <DatePicker
                                        value={startDate}
                                        onChange={setStartDate}
                                        placeholder="Start Date"
                                        maxDate={endDate}
                                        className="h-10 rounded-xl"
                                    />
                                </div>

                                {/* Date Range End */}
                                <div className="space-y-1.5 lg:col-span-1">
                                    <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Joined To</Label>
                                    <DatePicker
                                        value={endDate}
                                        onChange={setEndDate}
                                        placeholder="End Date"
                                        minDate={startDate}
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Filter Actions */}
                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border/40">
                                <Button
                                    variant="ghost"
                                    onClick={resetFilters}
                                    className="text-muted-foreground hover:text-foreground h-11 px-6 rounded-xl"
                                >
                                    Clear All
                                </Button>
                                <Button
                                    onClick={applyFilters}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 h-11 px-8 font-semibold"
                                >
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                key={JSON.stringify(activeFilters)}
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10"
            >
                <AnimatePresence mode="popLayout">
                    {filteredAdmins.map((admin) => (
                        <motion.div 
                            key={admin.userid} 
                            variants={item} 
                            initial="hidden"
                            animate="show"
                            exit="hidden"
                            layout 
                        >
                            <Card
                                className="group relative overflow-hidden bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border-[1.5px] border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(15,23,42,0.3)] hover:-translate-y-1 transition-all duration-300 rounded-[2rem] w-full"
                            >
                                {/* Decorative Gradient Blob/Mesh */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-bl-[3rem] -z-10 transition-all group-hover:bg-primary/10 dark:group-hover:bg-primary/20" />

                                {/* Action Buttons - Top Right (Standardized) */}
                                <div className="absolute top-3 right-3 flex gap-2 z-10 transition-opacity duration-300">
                                    <Tooltip content="View Profile">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                            onClick={() => handleOpenView(admin)}
                                        >
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content="Edit Details">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEdit(admin);
                                            }}
                                        >
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content={admin.isactive ? "Deactivate" : "Activate"}>
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className={cn(
                                                "h-8 w-8 bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-md transition-colors",
                                                admin.isactive
                                                    ? "text-muted-foreground hover:text-destructive"
                                                    : "text-muted-foreground hover:text-emerald-600"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStatusToggle(admin.userid, admin.isactive || false);
                                            }}
                                        >
                                            {admin.isactive ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                        </Button>
                                    </Tooltip>
                                </div>

                                <div className={`absolute top-5 left-0 w-1 rounded-r-full h-8 transition-all duration-300 ${admin.isactive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]"}`} />

                                <CardHeader className="flex flex-col items-center text-center gap-2 pb-0 pt-5 px-5">
                                    <div className="relative">
                                        <div className="h-16 w-16 rounded-full bg-background shadow-md flex items-center justify-center p-1 group-hover:scale-105 transition-transform duration-500 ease-in-out dark:bg-slate-800">
                                            <div className="h-full w-full rounded-full overflow-hidden bg-muted/20 dark:bg-slate-700/50 flex items-center justify-center text-xl font-bold text-primary/80">
                                                {admin.profileImage ? (
                                                    <img src={admin.profileImage} alt={admin.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    admin.name.charAt(0)
                                                )}
                                            </div>
                                        </div>
                                        <Tooltip content={admin.isactive ? "Active" : "Inactive"}>
                                            <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[2px] border-background dark:border-slate-900 flex items-center justify-center ${admin.isactive ? "bg-emerald-400" : "bg-rose-400"}`}>

                                            </div>
                                        </Tooltip>
                                    </div>

                                    <div className="space-y-0.5 w-full overflow-hidden">
                                        <CardTitle className="text-lg font-bold truncate text-foreground dark:text-slate-100 group-hover:text-primary transition-colors">{admin.name}</CardTitle>
                                        <CardDescription className="flex items-center justify-center gap-1.5 truncate text-xs font-medium text-muted-foreground/80 dark:text-slate-400 bg-muted/30 dark:bg-slate-800/50 py-0.5 px-2.5 rounded-full mx-auto w-fit max-w-full">
                                            <Building2 className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{getGroupName(admin.hospitalgroupid)}</span>
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3 pt-3 px-5 pb-5">
                                    <div className="space-y-1.5 bg-background/40 dark:bg-slate-800/30 p-2.5 rounded-2xl border border-border/50 dark:border-slate-700/50">
                                        <a href={`mailto:${admin.email}`} className="flex items-center gap-2.5 text-xs group/link hover:bg-background/80 dark:hover:bg-slate-700/50 p-1.5 rounded-xl transition-all">
                                            <div className="h-7 w-7 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                                <Mail className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="truncate text-muted-foreground dark:text-slate-400 group-hover/link:text-foreground dark:group-hover/link:text-slate-200 font-medium transition-colors">
                                                {admin.email}
                                            </span>
                                        </a>
                                        <a href={`tel:${admin.phoneno}`} className="flex items-center gap-2.5 text-xs group/link hover:bg-background/80 dark:hover:bg-slate-700/50 p-1.5 rounded-xl transition-all">
                                            <div className="h-7 w-7 rounded-full bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                                                <Phone className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="truncate text-muted-foreground dark:text-slate-400 group-hover/link:text-foreground dark:group-hover/link:text-slate-200 font-medium transition-colors">
                                                {admin.phoneno}
                                            </span>
                                        </a>
                                    </div>


                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {filteredAdmins.length === 0 && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-full flex flex-col items-center justify-center p-16 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-border/50 text-center"
                    >
                        <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-muted/50 to-background shadow-inner flex items-center justify-center mb-6">
                            <Shield className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground/80">No admins found</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-3 text-lg">
                            We couldn't find any admins matching your filters.
                        </p>
                        <Button variant="outline" size="lg" onClick={resetFilters} className="mt-8 rounded-full px-8">
                            Clear Filters
                        </Button>
                    </motion.div>
                )}
            </motion.div>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="max-w-2xl w-full border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden [&>button]:hidden rounded-[2.5rem] flex flex-col max-h-[90vh]">
                    {/* Clean Header - No Overlap */}
                    <div className="relative h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 w-full shrink-0 flex items-center px-8">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
                        <div className="flex items-center gap-4 relative z-10 text-white w-full">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/30 flex items-center justify-center shrink-0">
                                {modalMode === 'edit' ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                                    {modalMode === 'edit' ? "Update Administrator" : "New Administrator"}
                                </DialogTitle>
                                <DialogDescription className="text-white/80 font-medium text-xs">
                                    {modalMode === 'edit' ? "Modify access privileges." : "System onboarding."}
                                </DialogDescription>
                            </div>
                            <Button size="icon" variant="ghost" className="ml-auto h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full" onClick={handleCancel}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 bg-muted/5">
                        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin">

                            {/* Profile Upload - Centered in Body */}
                            <div className="flex flex-col items-center gap-3">
                                <ImageUpload value={profileImage} onChange={setProfileImage} variant="avatar" showActions={true} label="" />
                                <div className="text-center">
                                    <Label className="text-sm font-semibold text-foreground">Profile Photo</Label>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Professional Headshot</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                {/* Left Column: Personal Info */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                            <UserIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Details</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Full Name</Label>
                                            <div className="relative group">
                                                <Input
                                                    {...form.register("name")}
                                                    placeholder="e.g. Dr. Sarah Smith"
                                                    className="pl-11 bg-background border-border/50 hover:border-indigo-500/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl transition-all shadow-sm"
                                                />
                                                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                    <UserIcon className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                            {form.formState.errors.name && <p className="text-xs text-red-500 font-medium">{form.formState.errors.name.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Email Address</Label>
                                            <div className="relative group">
                                                <Input
                                                    type="email"
                                                    {...form.register("email")}
                                                    placeholder="name@hospital.com"
                                                    className="pl-11 bg-background border-border/50 hover:border-indigo-500/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl transition-all shadow-sm"
                                                />
                                                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                            {form.formState.errors.email && <p className="text-xs text-red-500 font-medium">{form.formState.errors.email.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Phone Number</Label>
                                            <div className="relative group">
                                                <Input
                                                    type="tel"
                                                    {...form.register("phoneno")}
                                                    placeholder="+91 98765 00000"
                                                    onInput={(e) => {
                                                        e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                                                    }}
                                                    maxLength={10}
                                                    className="pl-11 bg-background border-border/50 hover:border-indigo-500/30 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl transition-all shadow-sm"
                                                />
                                                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                            {form.formState.errors.phoneno && <p className="text-xs text-red-500 font-medium">{form.formState.errors.phoneno.message}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Assignment & Security */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                        <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                                            <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Access Control</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Hospital Group</Label>
                                                <SearchableSelect
                                                    options={fetchedGroups.map(g => ({ label: g.groupname, value: String(g.hospitalgroupid) }))}
                                                    value={form.watch("hospitalgroupid")}
                                                    onChange={(v) => form.setValue("hospitalgroupid", v, { shouldValidate: true })}
                                                    placeholder="Select Organization"
                                                    className="w-full"
                                                    disabled={modalMode === 'edit'}
                                                />
                                                {form.formState.errors.hospitalgroupid && <p className="text-xs text-red-500 font-medium">{form.formState.errors.hospitalgroupid.message}</p>}
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Joining Date</Label>
                                                <DatePicker
                                                    value={form.watch("joining_date")}
                                                    onChange={(date) => form.setValue("joining_date", date)}
                                                    maxDate={new Date().toISOString().split('T')[0]}
                                                    className="w-full"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide ml-0.5">Password</Label>
                                                <div className="relative group">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        {...form.register("password")}
                                                        placeholder="••••••••••••"
                                                        className="pl-11 pr-11 bg-background border-border/50 hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl transition-all shadow-sm"
                                                    />
                                                    <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                                                        <Shield className="h-5 w-5 text-muted-foreground/40 group-focus-within:text-purple-500 transition-colors" />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-1 top-1 bottom-1 h-8 w-8 text-muted-foreground/50 hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                {form.formState.errors.password && <p className="text-xs text-red-500 font-medium">{form.formState.errors.password.message}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Footer */}
                        <div className="p-6 border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0 flex gap-3 justify-end items-center z-20">
                            <Button type="button" variant="outline" size="lg" onClick={handleCancel} className="px-6 rounded-xl border-border/50 hover:bg-muted/50 transition-colors h-11 font-medium text-muted-foreground hover:text-foreground">
                                Cancel
                            </Button>
                            <Button type="submit" size="lg" className="px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 transition-all text-white font-semibold h-11 hover:scale-105 active:scale-95">
                                {modalMode === 'edit' ? "Save Changes" : "Create Account"}
                            </Button>
                        </div>
                    </form >
                </DialogContent>
            </Dialog >

            {/* View Modal - Profile Card Design */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-[700px] w-full border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl p-0 overflow-y-auto max-h-[90vh] [&>button]:hidden rounded-[2.5rem] scrollbar-hide">

                    {/* Header */}
                    <div className="h-40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                        <DialogTitle className="sr-only">Admin Profile</DialogTitle>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute top-4 right-4 z-10">
                            <Tooltip content="Close">
                                <Button size="icon" variant="ghost" className="h-9 w-9 text-white/70 hover:text-white hover:bg-red-500 rounded-full transition-colors" onClick={() => setIsViewOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </Tooltip>
                        </div>
                        {/* Abstract shapes */}
                        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                        <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl"></div>
                    </div>

                    <div className="px-8 pb-8 -mt-20 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
                            {/* Profile Image */}
                            <div className="h-36 w-36 rounded-[2rem] bg-background p-1.5 shadow-2xl relative shrink-0">
                                <div className="h-full w-full rounded-[1.7rem] overflow-hidden bg-muted/20 flex items-center justify-center text-5xl font-bold text-primary/80 relative bg-white dark:bg-slate-800">
                                    {selectedAdmin?.profileImage ? (
                                        <img src={selectedAdmin.profileImage} alt={selectedAdmin.name} className="h-full w-full object-cover" />
                                    ) : (
                                        selectedAdmin?.name.charAt(0)
                                    )}
                                </div>
                                <div className={`absolute bottom-3 right-3 h-6 w-6 rounded-full border-[4px] border-background ${selectedAdmin?.isactive ? "bg-emerald-500" : "bg-rose-500"}`} />
                            </div>

                            {/* Name & Quick Info */}
                            <div className="flex-1 text-center md:text-left md:mb-4 space-y-1">
                                <h2 className="text-3xl font-bold tracking-tight text-foreground">{selectedAdmin?.name}</h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/10 rounded-full px-3 py-1 text-sm">
                                        Group Admin
                                    </Badge>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground font-medium">{getGroupName(selectedAdmin?.hospitalgroupid)}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="md:mb-4 shrink-0">
                                <Button className="rounded-xl px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 border-none font-semibold h-11" onClick={() => { setIsViewOpen(false); handleOpenEdit(selectedAdmin!); }}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                                </Button>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Identity Card */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5" /> Identity & System
                                </h3>
                                <div className="bg-muted/30 border border-border/50 rounded-2xl overflow-hidden">
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium mb-1">User ID</p>
                                            <p className="text-sm font-mono font-semibold bg-background/50 px-2 py-1 rounded-md border border-border/50 w-fit">{selectedAdmin?.userid}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium mb-1">Employee ID</p>
                                            <p className="text-sm font-mono font-semibold bg-background/50 px-2 py-1 rounded-md border border-border/50 w-fit">{selectedAdmin?.employeeId || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 bg-muted/50 border-t border-border/50 flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className={`font-semibold ${selectedAdmin?.isactive ? "text-emerald-600" : "text-rose-600"}`}>{selectedAdmin?.isactive ? "Active Account" : "Inactive Account"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" /> Contact Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors group">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
                                            <a href={`mailto:${selectedAdmin?.email}`} className="text-sm font-semibold truncate block text-foreground hover:text-primary transition-colors">{selectedAdmin?.email}</a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors group">
                                        <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 shrink-0 group-hover:scale-110 transition-transform">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Phone</p>
                                            <a href={`tel:${selectedAdmin?.phoneno}`} className="text-sm font-semibold truncate block text-foreground hover:text-primary transition-colors">{selectedAdmin?.phoneno}</a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Employment Card */}
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-2">
                                    <Building className="h-3.5 w-3.5" /> Employment Information
                                </h3>
                                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-bold uppercase">Hospital Group</p>
                                            <p className="font-bold text-lg">{getGroupName(selectedAdmin?.hospitalgroupid)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-8">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium mb-1">Joined Date</p>
                                            <p className="font-semibold">{selectedAdmin?.joiningDate ? new Date(selectedAdmin.joiningDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium mb-1">Last Login</p>
                                            <p className="font-semibold">{selectedAdmin?.lastLoginAt ? new Date(selectedAdmin.lastLoginAt).toLocaleString() : 'Never'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </DialogContent>
            </Dialog >
        </div >
    );
}

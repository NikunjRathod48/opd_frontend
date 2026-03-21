"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Layers, MoreVertical, CheckCircle2, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Department } from "@/types/clinical";
import { clinicalService } from "@/services/clinical-service";

export function DepartmentList() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const isHospitalAdmin = user?.role === 'HospitalAdmin';
    const hospitalId = user?.hospitalid ? parseInt(user.hospitalid) : undefined;

    // -- State --
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingId, setEditingId] = useState<number | null>(null);

    // Delete Confirmation
    const [deleteState, setDeleteState] = useState<{ open: boolean; id: number; name: string }>({
        open: false,
        id: 0,
        name: ''
    });

    // Form Data
    const [formData, setFormData] = useState<{
        name: string;
        code: string;
        description: string;
        is_active_in_hospital?: boolean;
    }>({
        name: "",
        code: "",
        description: "",
        is_active_in_hospital: true
    });

    // -- Fetch Data --
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await clinicalService.getDepartments(hospitalId);
            setDepartments(data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
            addToast("Failed to load departments", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user, isHospitalAdmin, hospitalId]);

    // -- Search Filter --
    const filteredDepartments = useMemo(() => {
        return departments.filter(dept => {
            const lowerQ = searchQuery.toLowerCase();
            return dept.department_name.toLowerCase().includes(lowerQ) ||
                dept.department_code.toLowerCase().includes(lowerQ);
        });
    }, [departments, searchQuery]);

    // -- Handlers --

    // Super Admin: Create/Edit Master
    const handleMasterSubmit = async () => {
        if (!formData.name) return addToast("Name is required", "error");
        if (!formData.code) return addToast("Code is required", "error");

        try {
            const payload: any = {
                department_name: formData.name,
                department_code: formData.code,
                description: formData.description
            };

            if (modalMode === 'add') {
                await clinicalService.createDepartment(payload);
                addToast("Department created successfully", "success");
            } else if (editingId) {
                await clinicalService.updateDepartment(editingId, payload);
                addToast("Department updated successfully", "success");
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            addToast("Operation failed", "error");
        }
    };

    // Hospital Admin: Toggle Active Status (Link/Unlink)
    // Note: For Departments, Hospital Admin primarily toggles visibility (is_active_in_hospital)
    // There isn't a complex price/stock logic for Departments usually, unless purely mapping.
    const handleToggleStatus = async (id: number, currentStatus: boolean, isMasterToggle: boolean) => {
        try {
            if (isHospitalAdmin && !isMasterToggle) {
                // Hospital Admin Toggling their link
                // We use updateDepartment with hospitalId, similar to other master data wrappers
                // But service wrapper 'updateDepartment' uses PUT /master-data/departments/:id?hospital_id=...
                // which maps to backend upsertHospitalRecord

                await clinicalService.updateDepartment(id, {
                    is_active_in_hospital: !currentStatus,
                    // Pass ID back for strictly validating payload if needed, but param ID is sufficient
                    department_id: id
                } as any, hospitalId);

                addToast(currentStatus ? "Department deactivated" : "Department activated", "success");
            } else {
                // Super Admin Toggling Master Status (if Department had is_active, but schema check showed it might not? 
                // Schema: departments_master does NOT have is_active!
                // So Super Admin cannot toggle status. Only Hospital Admin can toggle their link.
                // We should hide toggle for Super Admin or implement hard delete (not recommended)
                addToast("Master departments cannot be deactivated", "error");
                return;
            }
            fetchData();
        } catch (error) {
            console.error("Status update failed", error);
            addToast("Failed to update status", "error");
        }
    };


    // -- Open Modals --

    const openAdd = () => {
        setModalMode('add');
        setFormData({ name: "", code: "", description: "" });
        setIsModalOpen(true);
    };

    const openEdit = (dept: Department) => {
        setModalMode('edit');
        setEditingId(dept.department_id);
        setFormData({
            name: dept.department_name,
            code: dept.department_code,
            description: dept.description || ""
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-1">
                        Departments
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {isHospitalAdmin
                            ? "Manage active departments in your hospital."
                            : "Manage global department master list."}
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-border/50 shadow-sm">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search departments..."
                        className="pl-9 h-11 bg-slate-50 dark:bg-slate-950 border-input focus:ring-primary/20 rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto ml-auto">
                    {!isHospitalAdmin && (
                        <Button className="h-11 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl px-6 transition-all hover:scale-105 active:scale-95" onClick={openAdd}>
                            <Plus className="h-4 w-4" /> New Department
                        </Button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-xl border border-border/40 bg-muted/10 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
                    {filteredDepartments.map(dept => {
                        // Hospital Admin: Can click card to toggle? Or explicit toggle button?
                        // Let's use similar card style to TreatmentTypeList
                        const isActive = isHospitalAdmin ? (dept.is_active_in_hospital ?? false) : true;

                        return (
                            <Card key={dept.department_id} className={cn(
                                "group flex flex-col overflow-hidden border-border/60 bg-white dark:bg-slate-900 shadow-sm hover:shadow-neo-lg transition-all duration-300 rounded-2xl",
                                !isActive && "opacity-75 grayscale-[0.8] hover:grayscale-0 hover:opacity-100"
                            )}>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary/20 group-hover:scale-105 duration-300">
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold truncate leading-tight text-foreground">
                                                {dept.department_name}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {dept.department_code}
                                            </p>
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {!isHospitalAdmin && (
                                                <DropdownMenuItem onClick={() => openEdit(dept)}>
                                                    <Pencil className="h-4 w-4 mr-2" /> Edit Details
                                                </DropdownMenuItem>
                                            )}

                                            {isHospitalAdmin && (
                                                <DropdownMenuItem
                                                    className={isActive ? "text-destructive focus:text-destructive" : "text-primary focus:text-primary"}
                                                    onClick={() => handleToggleStatus(dept.department_id, !!dept.is_active_in_hospital, false)}
                                                >
                                                    {isActive ? <Trash2 className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                                    {isActive ? "Deactivate in Hospital" : "Activate in Hospital"}
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>

                                <CardContent className="pt-2">
                                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                        {dept.description || "No description available."}
                                    </p>

                                    {isHospitalAdmin && (
                                        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</span>
                                            {isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredDepartments.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                        <Building2 className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold">No departments found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
                        {isHospitalAdmin
                            ? "No departments available."
                            : "Create your first department to get started."}
                    </p>
                    {!isHospitalAdmin && (
                        <Button className="text-white bg-blue-600 hover:bg-blue-700" onClick={openAdd}>
                            Create Department
                        </Button>
                    )}
                </div>
            )}

            {/* Edit/Create Modal (Super Admin) */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="w-[95%] sm:w-full sm:max-w-[425px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle>{modalMode === 'add' ? 'Add New' : 'Edit'} Department</DialogTitle>
                        <DialogDescription>Manage department master details.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Code</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="Unique Code (e.g. CARDIO)"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Department Name"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc">Description</Label>
                            <Input
                                id="desc"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description..."
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button className="rounded-xl text-white bg-primary hover:bg-primary/90" onClick={handleMasterSubmit}>
                            {modalMode === 'add' ? 'Create' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

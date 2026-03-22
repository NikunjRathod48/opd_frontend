"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Tag, Pencil, Trash2, Stethoscope, IndianRupee, Layers, MoreVertical, Link as LinkIcon, AlertCircle, CheckCircle2, X, Loader2, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// --- Types ---
interface TreatmentType {
    treatment_type_id: number;
    treatment_name: string;
    treatment_code: string;
    description?: string;
    is_active: boolean;
    // Helper for grouping
    procedures?: Procedure[];
    is_active_in_hospital?: boolean;
}

interface Procedure {
    procedure_id: number;
    procedure_name: string;
    procedure_code: string;
    treatment_type_id: number;
    is_surgical: boolean;
    // Hospital Specific
    price?: number;
    is_active_in_hospital?: boolean;
    is_linked?: boolean;
    hospital_record_id?: number | null;
    is_active?: boolean;
}

export function TreatmentTypeList() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const isHospitalAdmin = user?.role === 'HospitalAdmin';
    const hospitalId = user?.hospitalid;

    // -- State --
    const [treatments, setTreatments] = useState<TreatmentType[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [formType, setFormType] = useState<'Category' | 'Service'>('Category');

    // Catalog Browser (for Hospital Admin Add Service)
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [catalogProcedures, setCatalogProcedures] = useState<Procedure[]>([]);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<Procedure | null>(null);

    // Editing State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete Confirmation
    const [deleteState, setDeleteState] = useState<{ open: boolean; type: 'Category' | 'Service'; id: number; name: string }>({
        open: false,
        type: 'Category',
        id: 0,
        name: ''
    });

    // Form Data
    const [formData, setFormData] = useState<{
        parentId: string;
        departmentId: string;
        name: string;
        code: string;
        price: number | string; // Allow string for empty input
        isSurgical: boolean;
    }>({
        parentId: "", // treatment_type_id
        departmentId: "", // department_id for categories
        name: "", // treatment_name or procedure_name
        code: "",
        price: "", // Initialize as empty for placeholder
        isSurgical: false
    });

    // -- Fetch Data --
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const query = isHospitalAdmin && hospitalId ? `?hospital_id=${hospitalId}` : '';

            // 1. Fetch Treatments (Categories)
            const treatmentsRes = await api.get<any[]>(`/master-data/treatments${query}`);

            // 2. Fetch Procedures (Services)
            const proceduresRes = await api.get<any[]>(`/master-data/procedures${query}`);

            // 3. Fetch Departments
            const deptsRes = await api.get<any[]>(`/master-data/departments${query}`);

            setTreatments(treatmentsRes);
            setProcedures(proceduresRes);
            setDepartments(deptsRes);

        } catch (error) {
            console.error("Failed to fetch OPD data", error);
            addToast("Failed to load catalog", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user, isHospitalAdmin, hospitalId]);

    // -- Derived Data --
    const organizedData = useMemo(() => {
        // Group Procedures by Treatment Type
        const grouped = new Map<number, Procedure[]>();
        procedures.forEach(p => {
            // For Hospital Admin, we generally only want to show LINKED procedures in the main grid
            // unless we want a "grayed out" view. Let's show only linked/active for cleanliness,
            // or if SuperAdmin show all.
            if (isHospitalAdmin && !p.is_linked) return;

            const list = grouped.get(p.treatment_type_id) || [];
            list.push(p);
            grouped.set(p.treatment_type_id, list);
        });

        // Map categories to include their services
        return treatments.map(t => ({
            ...t,
            procedures: grouped.get(t.treatment_type_id) || []
        })).filter(t => {
            // Filter logic for main grid Search
            const lowerQ = searchQuery.toLowerCase();
            const matchesCat = t.treatment_name.toLowerCase().includes(lowerQ);
            const hasMatchingService = t.procedures?.some(p => p.procedure_name.toLowerCase().includes(lowerQ));

            // If HospitalAdmin, hide empty categories unless they match search explicitly? 
            // Better to show categories if they have linked services or if we are searching.
            if (!matchesCat && !hasMatchingService) return false;

            // If Hospital Admin and no linked services in this category, and category itself doesn't match search -> hide
            // (Unless we want to show empty categories to allow adding? "Add Service" needs a category context?)
            // Let's keep it simple: Show if matches search OR has services.
            return true;
        });
    }, [treatments, procedures, searchQuery, isHospitalAdmin]);

    // -- Handlers --

    // Super Admin: Create/Edit Master
    const handleMasterSubmit = async () => {
        if (!formData.name) return addToast("Name is required", "error");
        if (!formData.code) return addToast("Code is required", "error");

        setIsSubmitting(true);
        try {
            const payload: any = {
                is_active: true
            };

            let endpoint = "";
            let method = modalMode === 'add' ? 'POST' : 'PUT';

            if (formType === 'Category') {
                if (!formData.departmentId) return addToast("Department is required", "error");
                endpoint = `/master-data/treatments${modalMode === 'edit' ? `/${editingId}` : ''}`;
                payload.treatment_name = formData.name;
                payload.treatment_code = formData.code;
                payload.department_id = Number(formData.departmentId);
            } else {
                endpoint = `/master-data/procedures${modalMode === 'edit' ? `/${editingId}` : ''}`;
                payload.procedure_name = formData.name;
                payload.procedure_code = formData.code;
                payload.treatment_type_id = Number(formData.parentId);
                payload.is_surgical = formData.isSurgical;
                payload.price = formData.price ? Number(formData.price) : 0;
            }

            if (modalMode === 'edit') {
                await api.put(endpoint, payload);
            } else {
                await api.post(endpoint, payload);
            }

            addToast(`${formType} ${modalMode === 'add' ? 'created' : 'updated'} successfully`, "success");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            addToast("Operation failed", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Hospital Admin: Link/Update Price
    const handleHospitalServiceUpdate = async () => {
        // This is used for EDITING an already linked service (updating price)
        if (!editingId) return;

        if (Number(formData.price) < 0) {
            addToast("Price cannot be negative", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            // We are updating the LINK record. The ID passed is the MASTER ID.
            // master-data controller handles upserts when hospital_id is present.
            await api.put(`/master-data/procedures/${editingId}?hospital_id=${hospitalId}`, {
                price: Number(formData.price || 0),
                is_active_in_hospital: true
            });

            addToast("Price updated successfully", "success");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to update price", error);
            addToast("Failed to update details", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Hospital Admin: Add New Link (from Catalog)
    const handleLinkService = async (proc: Procedure) => {
        if (formData.price === "" || formData.price === undefined) {
            addToast("Please set a price", "error");
            return;
        }

        if (Number(formData.price) < 0) {
            addToast("Price cannot be negative", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/master-data/procedures?hospital_id=${hospitalId}`, {
                procedure_id: proc.procedure_id,
                price: Number(formData.price || 0),
                is_active_in_hospital: true
            });

            addToast("Service added to your catalog", "success");
            setIsCatalogOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to link service", error);
            addToast("Failed to add service", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Unified Submit
    const onFormSubmit = () => {
        if (isHospitalAdmin) {
            // Hospital Admin only edits PRICES for existing services via this modal
            handleHospitalServiceUpdate();
        } else {
            // Super Admin edits MASTER data
            handleMasterSubmit();
        }
    };


    // -- Open Modals --

    const openAddCategory = () => {
        setModalMode('add');
        setFormType('Category');
        setFormData({ parentId: "", departmentId: "", name: "", code: "", price: "", isSurgical: false });
        setIsModalOpen(true);
    };

    const openAddService = (parentId?: number) => {
        if (isHospitalAdmin) {
            // Open Catalog Browser instead
            setCatalogSearch("");
            setFormData({ ...formData, price: "" }); // Reset price for new entry
            setSelectedCatalogItem(null);
            fetchCatalog();
            setIsCatalogOpen(true);
            return;
        }

        // Super Admin
        setModalMode('add');
        setFormType('Service');
        // Default to first category if not provided
        const defaultParent = parentId ? parentId.toString() : (treatments[0]?.treatment_type_id?.toString() || "");
        setFormData({ parentId: defaultParent, departmentId: "", name: "", code: "", price: "", isSurgical: false });
        setIsModalOpen(true);
    };

    const openEdit = (type: 'Category' | 'Service', item: any) => {
        setModalMode('edit');
        setFormType(type);
        setEditingId(type === 'Category' ? item.treatment_type_id : item.procedure_id);

        if (type === 'Category') {
            setFormData({
                parentId: "",
                departmentId: item.department_id?.toString() || "",
                name: item.treatment_name,
                code: item.treatment_code,
                price: "",
                isSurgical: false
            });
        } else {
            setFormData({
                parentId: item.treatment_type_id.toString(),
                departmentId: "",
                name: item.procedure_name,
                code: item.procedure_code,
                price: item.price || "",
                isSurgical: item.is_surgical
            });
        }
        setIsModalOpen(true);
    };

    // Fetch Full Catalog for Hospital Admin
    const fetchCatalog = async () => {
        setCatalogLoading(true);
        try {
            // Fetch ALL master procedures without hospital filter
            const masterProcedures = await api.get<any[]>(`/master-data/procedures`);
            setCatalogProcedures(masterProcedures);
        } catch (error) {
            console.error("Failed to load master catalog", error);
            addToast("Failed to load catalog", "error");
        } finally {
            setCatalogLoading(false);
        }
    };

    // Filtered Catalog Items
    const filteredCatalog = catalogProcedures.filter(p => {
        if (isHospitalAdmin && p.is_linked) return false; // Already in catalog
        if (!catalogSearch) return true;
        return p.procedure_name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            p.procedure_code.toLowerCase().includes(catalogSearch.toLowerCase());
    });


    // -- Delete --
    const handleDelete = async () => {
        if (!deleteState.id) return;

        try {
            if (isHospitalAdmin) {
                // Hospital Admin: Toggle Hospital Link Status (Do NOT touch Master Status)
                const isCategory = deleteState.type === 'Category';
                const endpoint = isCategory ? 'treatments' : 'procedures';

                // Find current status to toggle
                let currentItem: any;
                if (isCategory) {
                    currentItem = treatments.find(t => t.treatment_type_id === deleteState.id);
                } else {
                    currentItem = procedures.find(p => p.procedure_id === deleteState.id);
                }

                // If not found, assume we want to deactivate (safe default)
                // Fix: Check is_active_in_hospital for Hospital Admin, not master is_active
                const currentStatus = currentItem?.is_active_in_hospital ?? true;

                const payload: any = {
                    is_active_in_hospital: !currentStatus,
                    // Pass other required fields if strictly needed by upsert, but usually upsertHospitalRecord handles partials if record exists 
                    // Actually upsertHospitalRecord requires Master ID in body.
                    [isCategory ? 'treatment_type_id' : 'procedure_id']: deleteState.id
                };

                // Fix: Pass price for procedures to satisfy Prisma upsert 'create' validation
                if (!isCategory && isHospitalAdmin) {
                    payload.price = currentItem?.price || 0;
                }

                // Use PUT to upsert/update hospital record
                await api.put(`/master-data/${endpoint}/${deleteState.id}?hospital_id=${hospitalId}`, payload);

                addToast(currentStatus ? "Item deactivated" : "Item activated", "success");
            } else {
                // Super Admin: Toggle Master Status
                await api.patch(`/master-data/${deleteState.type === 'Category' ? 'treatments' : 'procedures'}/${deleteState.id}/status`, {});

                // Check if we are activating or deactivating based on current state for clearer toast
                // But simplified toast is fine
                addToast("Status updated", "success");
            }
            setDeleteState(prev => ({ ...prev, open: false }));
            fetchData();
        } catch (error) {
            console.error("Delete failed", error);
            addToast("Failed to update status", "error");
        }
    };


    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-1">Treatment Pricing</h2>
                    <p className="text-muted-foreground mt-1">
                        {isHospitalAdmin
                            ? "Manage your hospital's service catalog and standard rates."
                            : "Manage global treatment categories and procedures."}
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-border/50 shadow-sm">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search categories or services..."
                        className="pl-9 h-11 bg-slate-50 dark:bg-slate-950 border-input focus:ring-primary/20 rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto ml-auto">
                    {!isHospitalAdmin && (
                        <Tooltip content="Add New Category" side="top">
                            <Button variant="outline" className="h-11 gap-2 rounded-xl px-4" onClick={openAddCategory}>
                                <Layers className="h-4 w-4" /> New Category
                            </Button>
                        </Tooltip>
                    )}

                    <Tooltip content="Add New Service" side="top">
                        <Button className="h-11 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl px-6 transition-all hover:scale-105 active:scale-95" onClick={() => openAddService()}>
                            <Plus className="h-4 w-4" />
                            {isHospitalAdmin ? "Add Service from Catalog" : "New Service"}
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="flex flex-col overflow-hidden border-border/60 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-950/50 pb-3 pt-4 px-5 flex flex-row items-center space-y-0 relative border-b border-border/40">
                                <div className="flex items-center gap-3 overflow-hidden w-full">
                                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 flex flex-col min-h-[50px]">
                                <div className="divide-y divide-border/40">
                                    {[1, 2, 3].map(j => (
                                        <div key={j} className="flex items-center justify-between p-3.5">
                                            <div className="min-w-0 pr-3 flex flex-col flex-1 space-y-2">
                                                <Skeleton className="h-4 w-2/3" />
                                                <Skeleton className="h-3 w-1/4" />
                                            </div>
                                            <div className="shrink-0 flex items-center justify-end w-20">
                                                <Skeleton className="h-4 w-12" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
                    {organizedData.map(cat => {
                        // Specific filter for Hospital Admin to hide empty categories if desired
                        // But we kept them earlier.
                        if (cat.procedures.length === 0 && isHospitalAdmin) return null;

                        return (
                            <Card key={cat.treatment_type_id} className={cn(
                                "group flex flex-col overflow-hidden border-border/60 bg-white dark:bg-slate-900 shadow-sm hover:shadow-neo-lg transition-all duration-300 rounded-2xl",
                                ((isHospitalAdmin && !cat.is_active_in_hospital) || (!isHospitalAdmin && !cat.is_active)) && "opacity-80 grayscale-[0.8] hover:grayscale-0 hover:opacity-100"
                            )}>
                                {/* Card Header */}
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-950/50 pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0 relative border-b border-border/40">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary/20 group-hover:scale-105 duration-300">
                                            <Stethoscope className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="text-base font-bold truncate leading-tight text-foreground">
                                                {cat.treatment_name}
                                                {((isHospitalAdmin && !cat.is_active_in_hospital) || (!isHospitalAdmin && !cat.is_active)) && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-widest align-middle">Inactive</span>}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {cat.treatment_code}
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
                                            <DropdownMenuItem onClick={() => openEdit('Category', cat)}>
                                                <Pencil className="h-4 w-4 mr-2" /> Edit Category
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className={(isHospitalAdmin ? cat.is_active_in_hospital : cat.is_active) ? "text-destructive focus:text-destructive" : "text-primary focus:text-primary"}
                                                onClick={() => setDeleteState({ open: true, type: 'Category', id: cat.treatment_type_id, name: cat.treatment_name })}
                                            >
                                                {(isHospitalAdmin ? cat.is_active_in_hospital : cat.is_active) ? <Trash2 className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                                {(isHospitalAdmin ? cat.is_active_in_hospital : cat.is_active) ? "Deactivate" : "Activate"}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>

                                {/* Services List */}
                                <CardContent className="p-0 flex-1 flex flex-col min-h-[50px]">
                                    <ScrollArea className="h-full max-h-[400px]">
                                        {cat.procedures && cat.procedures.length > 0 ? (
                                            <div className="divide-y divide-border/40">
                                                {cat.procedures.map(svc => {
                                                    const isServiceActive = isHospitalAdmin ? svc.is_active_in_hospital : svc.is_active;
                                                    return (
                                                        <div key={svc.procedure_id} className={cn(
                                                            "flex items-center justify-between p-3.5 transition-colors group/item relative",
                                                            isServiceActive
                                                                ? "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                                : "bg-slate-100/50 dark:bg-slate-900/40 text-muted-foreground"
                                                        )}>
                                                            <div className="min-w-0 pr-3 flex flex-col">
                                                                <div className="font-medium text-sm truncate text-foreground/90">{svc.procedure_name}</div>
                                                                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                                                    <span>{svc.procedure_code}</span>
                                                                    {svc.is_surgical && (
                                                                        <Badge variant="outline" className="h-4 px-1 text-[9px] border-orange-500/30 text-orange-600 bg-orange-500/5">Surgical</Badge>
                                                                    )}
                                                                    {!isServiceActive && <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-200 text-red-600 bg-red-50">Inactive</Badge>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="font-mono text-sm font-semibold text-primary">₹{svc.price || 0}</span>
                                                                </div>

                                                                {(!isHospitalAdmin || (isHospitalAdmin && svc.is_linked)) && (
                                                                    <div className={cn(
                                                                        "flex gap-1 transition-opacity focus-within:opacity-100",
                                                                        isServiceActive ? "opacity-100 md:opacity-0 md:group-hover/item:opacity-100" : "opacity-100"
                                                                    )}>
                                                                        <Tooltip content="Edit Service">
                                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit('Service', svc)}>
                                                                                <Pencil className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </Tooltip>
                                                                        <Tooltip content={isServiceActive ? "Deactivate Service" : "Activate Service"}>
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className={cn(
                                                                                    "h-7 w-7 text-muted-foreground",
                                                                                    isServiceActive
                                                                                        ? "hover:text-destructive hover:bg-destructive/10"
                                                                                        : "hover:text-green-600 hover:bg-green-50"
                                                                                )}
                                                                                onClick={() => setDeleteState({ open: true, type: 'Service', id: svc.procedure_id, name: svc.procedure_name })}
                                                                            >
                                                                                {isServiceActive ? <Trash2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                                            </Button>
                                                                        </Tooltip>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                                                <p className="text-sm text-muted-foreground mb-3">No services found</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                                {/* Footer Summary */}
                                {cat.procedures && cat.procedures.length > 0 && (
                                    <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 border-t border-border/40 text-[10px] text-center text-muted-foreground font-medium uppercase tracking-wider flex justify-between px-4">
                                        <span>{cat.procedures.length} Services</span>
                                        {isHospitalAdmin && <span>linked</span>}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && organizedData.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                        <Tag className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold">No services found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
                        {isHospitalAdmin
                            ? "Your catalog is empty. Add services from the master list to get started."
                            : "Create your first treatment category to get started."}
                    </p>
                    <Button onClick={() => isHospitalAdmin ? openAddService() : openAddCategory()}>
                        {isHospitalAdmin ? "Browse Catalog" : "Create Category"}
                    </Button>
                </div>
            )}

            {/* Add/Edit Modal (Standard) */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="w-[95%] sm:w-full sm:max-w-[425px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {modalMode === 'add' ? 'Add New' : 'Edit'} {formType === 'Category' ? 'Category' : (isHospitalAdmin ? 'Price' : 'Service')}
                        </DialogTitle>
                        <DialogDescription>
                            {isHospitalAdmin
                                ? "Update the standard rate for this service."
                                : "Manage master data details."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Super Admin Fields */}
                        {!isHospitalAdmin && (
                            <>
                                {formType === 'Service' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="parent">Parent Category</Label>
                                        <Select
                                            value={formData.parentId}
                                            onValueChange={(val) => setFormData({ ...formData, parentId: val })}
                                            disabled={modalMode === 'edit'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {treatments.map(t => (
                                                    <SelectItem key={t.treatment_type_id} value={t.treatment_type_id.toString()}>
                                                        {t.treatment_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {formType === 'Category' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="department">Department</Label>
                                        <Select
                                            value={formData.departmentId}
                                            onValueChange={(val) => setFormData({ ...formData, departmentId: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map(d => (
                                                    <SelectItem key={d.department_id} value={d.department_id.toString()}>
                                                        {d.department_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Code</Label>
                                    <Input
                                        id="code"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="Unique Code (e.g. CARDio-01)"
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Official Name"
                                        className="rounded-xl"
                                    />
                                </div>
                                {formType === 'Service' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Switch
                                            id="surgical"
                                            checked={formData.isSurgical}
                                            onCheckedChange={(c) => setFormData({ ...formData, isSurgical: c })}
                                        />
                                        <Label htmlFor="surgical" className="cursor-pointer">Is Surgical Procedure?</Label>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Hospital Admin / Service fields */}
                        {isHospitalAdmin && (
                            <div className="grid gap-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Service</Label>
                                <div className="font-medium text-lg">{formData.name}</div>
                                <div className="text-sm text-muted-foreground">{formData.code}</div>
                            </div>
                        )}

                        {(isHospitalAdmin || formType === 'Service') && (
                            <div className="grid gap-2">
                                <Label htmlFor="price">Standard Rate (₹)</Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="price"
                                        type="number"
                                        className="pl-9 h-11 bg-white dark:bg-slate-950 rounded-xl border-input focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button className="rounded-xl text-white bg-primary hover:bg-primary/90" onClick={onFormSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                modalMode === 'add' ? 'Create' : 'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Catalog Browser Modal (Hospital Admin) */}
            <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                <DialogContent className="w-[95%] sm:w-full sm:max-w-[960px] h-[90vh] sm:h-[86vh] flex flex-col p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-card [&>button]:hidden">

                    {/* ── Gradient Header ── */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-6 pt-6 pb-5 shrink-0">
                        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-24 h-14 w-14 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                                    <Layers className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white leading-tight">Service Catalog</DialogTitle>
                                    <DialogDescription className="text-blue-200 text-xs mt-0.5">Browse and link standard services to your hospital</DialogDescription>
                                </div>
                            </div>
                            <button
                                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all shrink-0 mt-0.5"
                                onClick={() => setIsCatalogOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search + mobile category */}
                        <div className="relative z-10 mt-4 flex flex-col sm:flex-row gap-2.5">
                            {/* Mobile category picker */}
                            <div className="sm:hidden">
                                <Select
                                    value={formData.parentId || "all"}
                                    onValueChange={val => setFormData({ ...formData, parentId: val === "all" ? "" : val })}
                                >
                                    <SelectTrigger className="h-10 rounded-xl bg-white/15 border-white/20 text-white text-sm focus:ring-0">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {treatments.map(t => (
                                            <SelectItem key={t.treatment_type_id} value={t.treatment_type_id.toString()}>
                                                {t.treatment_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                                <input
                                    placeholder="Search services..."
                                    value={catalogSearch}
                                    onChange={e => setCatalogSearch(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/15 border border-white/20
                                   text-white placeholder:text-white/50 text-sm
                                   focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── 3-Panel Body ── */}
                    <div className="flex-1 flex overflow-hidden min-h-0">

                        {/* ── Panel 1: Category Sidebar (desktop only) ── */}
                        <div className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border/50 bg-muted/20">
                            <p className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categories</p>
                            <ScrollArea className="flex-1 px-2 pb-4">
                                <div className="space-y-0.5">
                                    {/* All */}
                                    <button
                                        onClick={() => setFormData({ ...formData, parentId: "" })}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                                            !formData.parentId
                                                ? "bg-background text-foreground shadow-sm border border-border/60"
                                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                                        )}
                                    >
                                        <Layers className="h-4 w-4 shrink-0 opacity-70" />
                                        <span className="truncate">All Categories</span>
                                    </button>

                                    {/* Category skeletons */}
                                    {catalogLoading && [...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                                            <div className="h-4 w-4 rounded bg-muted/60 shrink-0" />
                                            <div className="h-3.5 rounded-full bg-muted/60 flex-1" style={{ width: `${55 + (i % 3) * 20}%` }} />
                                        </div>
                                    ))}

                                    {/* Real categories */}
                                    {!catalogLoading && treatments.map(t => (
                                        <button
                                            key={t.treatment_type_id}
                                            onClick={() => setFormData({ ...formData, parentId: t.treatment_type_id.toString() })}
                                            className={cn(
                                                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                                                formData.parentId === t.treatment_type_id.toString()
                                                    ? "bg-background text-foreground font-semibold shadow-sm border border-border/60"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium"
                                            )}
                                        >
                                            <span className={cn(
                                                "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                                                formData.parentId === t.treatment_type_id.toString() ? "bg-blue-500" : "bg-muted-foreground/30"
                                            )} />
                                            <span className="truncate">{t.treatment_name}</span>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* ── Panel 2: Services List ── */}
                        <div className={cn(
                            "flex-1 flex flex-col min-w-0 bg-card transition-all absolute inset-0 md:relative z-0",
                            selectedCatalogItem ? "hidden md:flex" : "flex"
                        )}>
                            {/* List subheader */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20 shrink-0">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Available Services</p>
                                {!catalogLoading && (
                                    <span className="inline-flex items-center rounded-full bg-muted/60 border border-border/60 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                        {filteredCatalog.filter(p => !formData.parentId || p.treatment_type_id.toString() === formData.parentId).length}
                                    </span>
                                )}
                            </div>

                            <ScrollArea className="flex-1 min-h-0">
                                {/* Loading skeletons */}
                                {catalogLoading && (
                                    <div className="divide-y divide-border/30">
                                        {[...Array(7)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-4 px-4 py-4 animate-pulse"
                                                style={{ animationDelay: `${i * 45}ms` }}
                                            >
                                                <div className="flex-1 space-y-2 min-w-0">
                                                    <div className="h-4 w-44 rounded-full bg-muted/60" />
                                                    <div className="flex gap-2">
                                                        <div className="h-3 w-14 rounded bg-muted/50" />
                                                        <div className="h-3 w-16 rounded-full bg-muted/40" />
                                                    </div>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-muted/50 shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Empty state */}
                                {!catalogLoading && filteredCatalog.filter(p => !formData.parentId || p.treatment_type_id.toString() === formData.parentId).length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                        <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center mb-3">
                                            <Search className="h-6 w-6 text-blue-400" />
                                        </div>
                                        <p className="text-sm font-semibold text-foreground/70">No services found</p>
                                        <p className="text-xs text-muted-foreground mt-1">Try a different category or search term</p>
                                    </div>
                                )}

                                {/* Service rows */}
                                {!catalogLoading && (
                                    <div className="divide-y divide-border/30">
                                        {filteredCatalog
                                            .filter(p => !formData.parentId || p.treatment_type_id.toString() === formData.parentId)
                                            .map((item, i) => {
                                                const isSelected = selectedCatalogItem?.procedure_id === item.procedure_id;
                                                return (
                                                    <motion.div
                                                        key={item.procedure_id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.02 }}
                                                        onClick={() => { setSelectedCatalogItem(item); setFormData(prev => ({ ...prev, price: 0 })); }}
                                                        className={cn(
                                                            "group flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all duration-150",
                                                            isSelected
                                                                ? "bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-blue-500 pl-[14px]"
                                                                : "hover:bg-muted/30 border-l-2 border-transparent"
                                                        )}
                                                    >
                                                        <div className="flex-1 min-w-0 mr-3">
                                                            <p className={cn("text-sm font-semibold truncate transition-colors", isSelected ? "text-blue-700 dark:text-blue-400" : "text-foreground/90 group-hover:text-foreground")}>
                                                                {item.procedure_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <span className="inline-block bg-muted/60 border border-border/60 px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground catalog-mono">
                                                                    {item.procedure_code}
                                                                </span>
                                                                {item.is_surgical && (
                                                                    <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">
                                                                        Surgical
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "h-7 w-7 rounded-full border flex items-center justify-center transition-all shrink-0",
                                                            isSelected
                                                                ? "border-blue-300 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                                                                : "border-border/50 text-muted-foreground/30 group-hover:border-blue-300 group-hover:text-blue-500"
                                                        )}>
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* ── Panel 3: Config / Price Panel ── */}
                        <div className={cn(
                            "w-full md:w-[300px] shrink-0 border-l border-border/50 flex flex-col bg-muted/10 absolute inset-0 md:relative z-20 md:z-0",
                            selectedCatalogItem ? "flex animate-in slide-in-from-right-8 fade-in duration-250" : "hidden md:flex"
                        )}>
                            {selectedCatalogItem ? (
                                <div className="flex flex-col h-full">
                                    {/* Mobile back */}
                                    <button
                                        className="md:hidden flex items-center gap-2 px-4 py-3.5 border-b border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground bg-background/80 transition-colors"
                                        onClick={() => setSelectedCatalogItem(null)}
                                    >
                                        <div className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center">
                                            <X className="h-3.5 w-3.5" />
                                        </div>
                                        Back to list
                                    </button>

                                    <div className="flex-1 overflow-y-auto p-5 pb-4 space-y-5">
                                        {/* Service info */}
                                        <div>
                                            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                                                <Stethoscope className="h-5 w-5" />
                                            </div>
                                            <h4 className="font-bold text-base leading-snug text-foreground">{selectedCatalogItem.procedure_name}</h4>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="inline-block bg-muted/60 border border-border/60 px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground catalog-mono">
                                                    {selectedCatalogItem.procedure_code}
                                                </span>
                                                {selectedCatalogItem.is_surgical && (
                                                    <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">
                                                        Surgical
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price field */}
                                        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Standard Rate (₹)
                                            </label>
                                            <div className="relative group">
                                                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    min="0"
                                                    value={formData.price}
                                                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                                    autoFocus
                                                    className="w-full h-11 pl-9 pr-4 rounded-xl border border-input bg-background text-lg font-bold catalog-mono
                                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                                   hover:border-blue-300 transition-all"
                                                />
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                Base price for this service. Adjustable later from the main list.
                                            </p>
                                        </div>

                                        {/* Category info pill */}
                                        <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 flex items-start gap-2.5">
                                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                                Linked to <span className="font-bold">{treatments.find(t => t.treatment_type_id === selectedCatalogItem.treatment_type_id)?.treatment_name}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Add button */}
                                    <div className="px-5 py-4 border-t border-border/50 bg-background/60 backdrop-blur-sm shrink-0">
                                        <button
                                            onClick={() => handleLinkService(selectedCatalogItem)}
                                            disabled={isSubmitting}
                                            className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold
                                           shadow-[0_2px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.4)]
                                           flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isSubmitting
                                                ? <><Loader2 className="h-4 w-4 animate-spin" />Adding...</>
                                                : <><Plus className="h-4 w-4" />Add to Hospital</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Empty config panel placeholder */
                                <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-50">
                                    <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 flex items-center justify-center mb-3">
                                        <ChevronRight className="h-7 w-7 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-sm font-semibold text-foreground/70">Select a Service</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">Choose a service from the list to configure its pricing.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {(() => {
                const targetItem = deleteState.type === 'Category'
                    ? treatments.find(t => t.treatment_type_id === deleteState.id)
                    : procedures.find(p => p.procedure_id === deleteState.id);

                const isActive = isHospitalAdmin
                    ? targetItem?.is_active_in_hospital
                    : (deleteState.type === 'Category' ? targetItem?.is_active : targetItem?.is_active);

                const isActivation = !isActive;

                return (
                    <DeleteConfirmationDialog
                        open={deleteState.open}
                        onOpenChange={(val) => setDeleteState(prev => ({ ...prev, open: val }))}
                        onConfirm={handleDelete}
                        itemName={deleteState.name}
                        title={isActivation ? `Activate ${deleteState.type}?` : "Confirm Deactivation"}
                        confirmText={isActivation ? "Activate" : "Deactivate"}
                        confirmVariant={isActivation ? "default" : "destructive"}
                        description={isActivation
                            ? `This ${deleteState.type === 'Category' ? 'category' : 'service'} will be activated and visible.`
                            : `This ${deleteState.type === 'Category' ? 'category' : 'service'} will be deactivated.`
                        }
                    />
                );
            })()
            }
        </div >
    );
}

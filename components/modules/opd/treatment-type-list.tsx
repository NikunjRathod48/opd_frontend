"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Tag, Pencil, Trash2, Stethoscope, IndianRupee, Layers, MoreVertical, Link as LinkIcon, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react";
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
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-xl border border-border/40 bg-muted/10 animate-pulse" />
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
                <DialogContent className="w-[95%] sm:w-full sm:max-w-[950px] h-[90vh] sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl">
                    <div className="p-4 md:p-6 border-b border-border/40 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                        <DialogTitle className="text-xl font-bold tracking-tight">Service Catalog</DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-1">
                            Browse and add standard services to your hospital.
                        </DialogDescription>

                        <div className="mt-4 flex flex-col md:flex-row gap-3">
                            {/* Mobile Category Select */}
                            <div className="md:hidden w-full">
                                <Select
                                    value={formData.parentId || "all"}
                                    onValueChange={(val) => setFormData({ ...formData, parentId: val === "all" ? "" : val })}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-slate-900">
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search services..."
                                    className="pl-9 bg-white dark:bg-slate-900 border-border/60 focus:ring-primary/20 rounded-xl"
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden relative">
                        {/* 1. Category Sidebar (Desktop) */}
                        <div className="hidden md:flex w-[240px] border-r border-border/40 flex-col bg-slate-50/30 dark:bg-slate-900/10">
                            <div className="p-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider opacity-80 pl-4">
                                Categories
                            </div>
                            <ScrollArea className="flex-1 px-2 scrollbar-thin">
                                <div className="space-y-1 pb-4">
                                    <Button
                                        variant={!formData.parentId ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "w-full justify-start text-sm font-medium",
                                            !formData.parentId && "bg-white dark:bg-slate-800 shadow-sm text-primary"
                                        )}
                                        onClick={() => setFormData({ ...formData, parentId: "" })}
                                    >
                                        <Layers className="h-4 w-4 mr-2 opacity-70" /> All Categories
                                    </Button>
                                    {treatments.map(t => (
                                        <Button
                                            key={t.treatment_type_id}
                                            variant={formData.parentId === t.treatment_type_id.toString() ? "secondary" : "ghost"}
                                            size="sm"
                                            className={cn(
                                                "w-full justify-start text-sm",
                                                formData.parentId === t.treatment_type_id.toString() && "bg-white dark:bg-slate-800 shadow-sm text-primary font-medium"
                                            )}
                                            onClick={() => setFormData({ ...formData, parentId: t.treatment_type_id.toString() })}
                                        >
                                            <div className="truncate text-left">{t.treatment_name}</div>
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* 2. Services List */}
                        <div className={cn(
                            "flex-1 flex flex-col bg-white dark:bg-background transition-all duration-300 absolute inset-0 md:relative z-0",
                            selectedCatalogItem ? "hidden md:flex" : "flex"
                        )}>
                            <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-border/40 flex justify-between items-center sticky top-0 z-10">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Available Services
                                </div>
                                <Badge variant="outline" className="text-[10px] h-5 bg-background border-border/60">
                                    {filteredCatalog.filter(p => !formData.parentId || p.treatment_type_id.toString() === formData.parentId).length} found
                                </Badge>
                            </div>

                            <ScrollArea className="flex-1 scrollbar-thin">
                                {catalogLoading ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground opacity-70">
                                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                                        <p className="text-sm">Fetching master services...</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/30">
                                        {filteredCatalog
                                            .filter(p => !formData.parentId || p.treatment_type_id.toString() === formData.parentId)
                                            .map(item => (
                                                <div
                                                    key={item.procedure_id}
                                                    className={cn(
                                                        "p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-200 flex items-start justify-between group border-l-2 border-transparent",
                                                        selectedCatalogItem?.procedure_id === item.procedure_id
                                                            ? "bg-primary/5 hover:bg-primary/5 border-primary pl-[14px]"
                                                            : "pl-4"
                                                    )}
                                                    onClick={() => {
                                                        setSelectedCatalogItem(item);
                                                        setFormData(prev => ({ ...prev, price: 0 }));
                                                    }}
                                                >
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <div className="font-medium text-sm text-foreground/90 group-hover:text-primary transition-colors">{item.procedure_name}</div>
                                                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                                                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{item.procedure_code}</span>
                                                            {item.is_surgical && (
                                                                <span className="inline-flex items-center text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/30">
                                                                    Surgical
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground/30 group-hover:border-primary/30 group-hover:text-primary transition-all">
                                                        <Plus className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            ))}
                                        {filteredCatalog.filter(p => !formData.parentId || p.treatment_type_id.toString() === formData.parentId).length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3">
                                                    <Search className="h-6 w-6 text-muted-foreground/30" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">No matching services found</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* 3. Config Panel (Right Desktop / Overlay Mobile) */}
                        <div className={cn(
                            "w-full md:w-[320px] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 transition-all border-l border-border/40 absolute inset-0 md:relative z-20 md:z-0 bg-background md:bg-transparent",
                            selectedCatalogItem ? "flex animate-in slide-in-from-right-10 md:slide-in-from-right-0 fade-in duration-300" : "hidden md:flex"
                        )}>
                            {selectedCatalogItem ? (
                                <div className="flex flex-col h-full w-full">
                                    {/* Mobile Back Button */}
                                    <div className="md:hidden p-4 border-b border-border/40 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setSelectedCatalogItem(null)}>
                                        <div className="h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                                            <X className="h-4 w-4" />
                                        </div>
                                        Back to list
                                    </div>

                                    <div className="flex-1 overflow-y-auto">
                                        <div className="p-6 md:p-8 pb-20 md:pb-6">
                                            <div className="mb-6">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-sm">
                                                    <Stethoscope className="h-6 w-6" />
                                                </div>
                                                <h4 className="font-bold text-lg leading-snug">{selectedCatalogItem.procedure_name}</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="font-mono text-xs">{selectedCatalogItem.procedure_code}</Badge>
                                                    {selectedCatalogItem.is_surgical && <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Surgical</Badge>}
                                                </div>
                                            </div>

                                            <div className="space-y-6 bg-white dark:bg-slate-900 rounded-xl border border-border/50 p-5 shadow-sm">
                                                <div className="space-y-3">
                                                    <Label className="text-sm font-medium">Standard Rate (₹)</Label>
                                                    <div className="relative group/input">
                                                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            min="0"
                                                            value={formData.price}
                                                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                                            className="text-lg font-mono pl-9 h-11 bg-slate-50 dark:bg-slate-950 border-border/60 focus:ring-primary/20 transition-all"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        Enter the base price for this service in your hospital. You can adjust this later in the main list.
                                                    </p>
                                                </div>

                                                <div className="rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                                    <div className="flex gap-2.5">
                                                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                                        <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                                            Linked to <strong>{treatments.find(t => t.treatment_type_id === selectedCatalogItem.treatment_type_id)?.treatment_name}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 border-t border-border/40 bg-white dark:bg-slate-900 md:bg-transparent mt-auto">
                                        <Button
                                            className="w-full h-12 text-base text-white font-medium shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            onClick={() => handleLinkService(selectedCatalogItem)}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="h-5 w-5 mr-2" /> Add Service to Catalog
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6 opacity-60">
                                    <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
                                        <LinkIcon className="h-8 w-8 opacity-20" />
                                    </div>
                                    <h5 className="font-medium text-foreground mb-1">Select a Service</h5>
                                    <p className="text-sm max-w-[200px]">Choose a service from the list to configure pricing.</p>
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

"use client";

import { ClinicalMasterLayout, BaseCategory } from "@/components/modules/master-data/clinical-master-layout";
import { RoleGuard } from "@/components/auth/role-guard";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { Medicine } from "@/types/clinical";
import { clinicalService } from "@/services/clinical-service";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import { Search, PackagePlus, Loader2, X, Pill } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface MedicineCategory extends BaseCategory {
    id: number;
    name: string;
}

export default function MedicinesPage() {
    const { addToast } = useToast();
    const { user } = useAuth();
    const isHospitalAdmin = user?.role === 'HospitalAdmin';
    const hospitalId = user?.hospitalid;

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Catalog State for Hospital Admin
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [catalogMedicines, setCatalogMedicines] = useState<Medicine[]>([]);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogLoading, setCatalogLoading] = useState(false);

    // Synthesized Categories from Medicine Types
    const [categories, setCategories] = useState<MedicineCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | null>(null);

    // Initial Fetch
    const fetchData = async () => {
        setIsLoading(true);
        try {
            let data = await clinicalService.getMedicines(isHospitalAdmin && hospitalId ? Number(hospitalId) : undefined);

            // For Hospital Admins, only show items they have explicitly linked
            if (isHospitalAdmin) {
                // The backend attachs is_linked to items returned in the hospital context
                data = data.filter((m: any) => m.is_linked);
            }

            setMedicines(data);

            // Extract unique types to form categories
            const types = Array.from(new Set(data.map(m => m.medicine_type)));
            const cats = types.map((type, index) => ({
                id: index + 1,
                name: type
            }));

            if (cats.length === 0) {
                cats.push({ id: 1, name: "General" });
            }

            setCategories(cats);
            if (cats.length > 0 && !selectedCategory) {
                setSelectedCategory(cats[0]);
            }
        } catch (error) {
            console.error("Failed to load medicines", error);
            addToast("Failed to load medicines", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user, isHospitalAdmin, hospitalId]);

    // --- Hospital Admin Catalog Actions ---
    const fetchCatalogMedicines = async () => {
        setCatalogLoading(true);
        try {
            // Fetch ALL master medicines
            const data = await clinicalService.getMedicines();
            // Filter out ones already added to this hospital
            const existingIds = new Set(medicines.map(m => m.medicine_id));
            setCatalogMedicines(data.filter(m => !existingIds.has(m.medicine_id)));
        } catch (error) {
            addToast("Failed to load catalog", "error");
        } finally {
            setCatalogLoading(false);
        }
    };

    const handleLinkMedicine = async (medicine: Medicine) => {
        if (!hospitalId) return;
        try {
            await clinicalService.createMedicine({
                ...medicine,
                price: medicine.price || 0,
                stock_quantity: 0
            }, Number(hospitalId));

            const fullMedicine = { ...medicine, is_linked: true, is_active_in_hospital: true, price: medicine.price || 0, stock_quantity: 0 };
            setMedicines(prev => [...prev, fullMedicine]);
            setCatalogMedicines(prev => prev.filter(m => m.medicine_id !== medicine.medicine_id));
            addToast(`${medicine.medicine_name} added to your inventory`, "success");
            setIsCatalogOpen(false); // Auto-close model after success

            // Update categories to include the new medicine type
            setCategories(prev => {
                const existing = prev.find(c => c.name === medicine.medicine_type);
                if (!existing) {
                    const newCat = { id: prev.length + 1, name: medicine.medicine_type };
                    // If no category was selected or only 'General' dummy was there
                    if (!selectedCategory || prev.length === 0 || (prev.length === 1 && prev[0].name === "General")) {
                        setSelectedCategory(newCat);
                    }
                    // Filter out the "General" dummy if we are adding real ones
                    const nonDummy = prev.filter(c => c.name !== "General");
                    return [...nonDummy, newCat];
                } else if (!selectedCategory || (categories.length === 1 && categories[0].name === "General")) {
                    setSelectedCategory(existing);
                }
                return prev;
            });

            // Re-fetch data silently in background to ensure strict backend consistency
            clinicalService.getMedicines(Number(hospitalId)).then(data => {
                if (isHospitalAdmin) {
                    setMedicines(data.filter((m: any) => m.is_linked));
                }
            }).catch(console.error);

        } catch (error) {
            addToast("Failed to link medicine", "error");
        }
    };

    // --- Actions ---
    const handleAddItem = async (data: Partial<Medicine>) => {
        try {
            const newMed = await clinicalService.createMedicine(data);
            setMedicines(prev => [...prev, newMed]);

            // Update categories if new type
            if (!categories.find(c => c.name === newMed.medicine_type)) {
                const newCat = { id: categories.length + 1, name: newMed.medicine_type };
                setCategories(prev => [...prev, newCat]);
                if (categories.length === 0) setSelectedCategory(newCat);
            }

            addToast(`Medicine ${newMed.medicine_name} added`, "success");
        } catch (e: any) {
            addToast(e.message || "Failed to add medicine", "error");
        }
    };

    const handleEditItem = async (item: Medicine, data: Partial<Medicine>) => {
        try {
            const updated = await clinicalService.updateMedicine(item.medicine_id, data, isHospitalAdmin ? Number(hospitalId) : undefined);

            setMedicines(prev => prev.map(m => {
                if (m.medicine_id === item.medicine_id) {
                    if (isHospitalAdmin) {
                        return {
                            ...m,
                            price: data.price !== undefined ? data.price : m.price,
                            stock_quantity: (data as any).stock_quantity !== undefined ? (data as any).stock_quantity : (m as any).stock_quantity,
                            is_active_in_hospital: data.is_active !== undefined ? data.is_active : (m as any).is_active_in_hospital
                        };
                    }
                    return { ...m, ...data, ...updated };
                }
                return m;
            }));

            // Update categories without touching the response object safely
            const newType = data.medicine_type || item.medicine_type;
            if (newType && !categories.find(c => c.name === newType)) {
                setCategories(prev => [...prev, { id: prev.length + 1, name: newType }]);
            }

            addToast(`Medicine updated`, "success");
        } catch (e: any) {
            addToast(e.message || "Failed to update medicine", "error");
        }
    };

    // --- Renderers ---

    // 1. Item Card
    const renderMedicineCard = (item: Medicine) => (
        <div className="bg-white dark:bg-slate-800 border border-border/60 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                    {item.medicine_code}
                </div>
                {!item.is_active && <Badge variant="destructive" className="h-4 px-1 text-[10px]">Inactive</Badge>}
            </div>

            <h3 className="font-semibold text-base truncate pr-6 cursor-default">{item.medicine_name}</h3>

            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                <Badge variant="outline" className="text-[10px]">{item.strength}</Badge>
                <span className="text-xs text-muted-foreground">{item.manufacturer}</span>
            </div>

            {/* Base Price Display */}
            <div className="mt-3 pt-3 border-t border-dashed flex justify-between items-center">
                <div className="flex flex-col">
                    {isHospitalAdmin && <span className="text-xs text-muted-foreground block mb-1">Stock: {item.stock_quantity || 0}</span>}
                    {isHospitalAdmin && (item as any).base_price !== undefined ? (
                        <span className="text-[10px] text-muted-foreground line-through">Base: ₹{(item as any).base_price}</span>
                    ) : (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</span>
                    )}
                </div>
                <span className="font-bold text-sm text-blue-700 dark:text-blue-400">₹{item.price || 0}</span>
            </div>
        </div>
    );

    return (
        <RoleGuard allowedRoles={["SuperAdmin", "HospitalAdmin", "GroupAdmin"]}>
            <>
                {isHospitalAdmin && !isLoading && medicines.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-6rem)] bg-slate-50/50 dark:bg-slate-950/50">
                        <div className="text-center max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
                            <div className="w-24 h-24 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <PackagePlus className="w-12 h-12 text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mb-3">
                                Empty Inventory
                            </h2>
                            <p className="text-muted-foreground mb-8">
                                Your hospital currently has no registered medicines. Browse the master catalog to verify and add medicines to your inventory.
                            </p>
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 transition-all group"
                                onClick={() => {
                                    setIsCatalogOpen(true);
                                    fetchCatalogMedicines();
                                }}
                            >
                                <PackagePlus className="md:mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                Browse Master Catalog
                            </Button>
                        </div>
                    </div>
                ) : (
                    <ClinicalMasterLayout<MedicineCategory, Medicine>
                        title="Medicines Master"
                        description="Manage medicine inventory and classes."
                        categoryLabel="Drug Class"
                        itemLabel="Medicine"
                        categories={categories}
                        items={medicines}
                        isLoading={isLoading}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}

                        // Helpers
                        getCategoryId={(c) => c.id}
                        getCategoryName={(c) => c.name}
                        getItemId={(i) => i.medicine_id}
                        getItemName={(i) => i.medicine_name}
                        getItemCount={(cat) => medicines.filter(m => m.medicine_type === cat.name).length}

                        // Filter: Match Type and Search
                        filterItem={(item, query) => {
                            const matchesCategory = selectedCategory ? item.medicine_type === selectedCategory.name : false;
                            const medicineName = item.medicine_name || "";
                            const medicineCode = item.medicine_code || "";
                            const matchesSearch = medicineName.toLowerCase().includes(query.toLowerCase()) ||
                                medicineCode.toLowerCase().includes(query.toLowerCase());
                            return matchesCategory && matchesSearch;
                        }}

                        // Renderers
                        renderItemCard={renderMedicineCard}
                        renderItemForm={(initialData, category, onClose) => (
                            <MedicineForm
                                initialData={initialData}
                                category={category}
                                onClose={onClose}
                                onSubmit={async (data) => {
                                    if (initialData.medicine_id) {
                                        await handleEditItem(initialData as Medicine, data);
                                    } else {
                                        await handleAddItem(data);
                                    }
                                    onClose();
                                }}
                                isHospitalAdmin={isHospitalAdmin}
                            />
                        )}

                        // Actions
                        onAddItem={!isHospitalAdmin ? handleAddItem : undefined}
                        onEditItem={handleEditItem}
                        // Custom Slots
                        headerActions={
                            isHospitalAdmin && (
                                <Tooltip content="Browse Master Catalog">
                                    <Button
                                        variant="outline"
                                        className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800/50"
                                        onClick={() => {
                                            setIsCatalogOpen(true);
                                            fetchCatalogMedicines();
                                        }}
                                    >
                                        <PackagePlus className="md:mr-2 h-4 w-4" />
                                        <span className="hidden md:inline">Browse Catalog</span>
                                    </Button>
                                </Tooltip>
                            )
                        }
                    />
                )}

                {/* Master Catalog Dialog (Hospital Admins Only) */}
                {isHospitalAdmin && (
                    <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                        <DialogContent className="sm:max-w-[660px] h-[82vh] flex flex-col p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-card [&>button]:hidden">

                            {/* ── Gradient Header ── */}
                            <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 px-6 pt-6 pb-5 shrink-0">
                                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                                <div className="absolute bottom-0 left-20 h-14 w-14 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

                                <div className="relative z-10 flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                                            <PackagePlus className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                                Master Medicines Catalog
                                            </DialogTitle>
                                            <DialogDescription className="text-violet-200 text-xs mt-0.5">
                                                Browse and link standard medicines to your hospital
                                            </DialogDescription>
                                        </div>
                                    </div>
                                    <button
                                        className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all shrink-0 mt-0.5"
                                        onClick={() => setIsCatalogOpen(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Search bar inside header */}
                                <div className="relative z-10 mt-4">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                                    <input
                                        placeholder="Search by name or code..."
                                        value={catalogSearch}
                                        onChange={e => setCatalogSearch(e.target.value)}
                                        className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/15 border border-white/20
                                   text-white placeholder:text-white/50 text-sm
                                   focus:outline-none focus:bg-white/20 focus:border-white/40
                                   transition-all"
                                    />
                                </div>
                            </div>

                            {/* ── Content ── */}
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-4 space-y-2">

                                    {/* Loading skeletons */}
                                    {catalogLoading && (
                                        <>
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card"
                                                    style={{ animationDelay: `${i * 60}ms` }}
                                                >
                                                    {/* Left icon placeholder */}
                                                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                                                    {/* Text block */}
                                                    <div className="flex-1 space-y-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-4 w-14 rounded-full" />
                                                            <Skeleton className="h-4 w-36 rounded-full" />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Skeleton className="h-3 w-16 rounded-full" />
                                                            <Skeleton className="h-3 w-20 rounded-full" />
                                                        </div>
                                                    </div>
                                                    {/* Price + button */}
                                                    <div className="shrink-0 flex items-center gap-3">
                                                        <div className="hidden sm:flex flex-col gap-1.5 items-end">
                                                            <Skeleton className="h-3 w-16 rounded-full" />
                                                            <Skeleton className="h-4 w-12 rounded-full" />
                                                        </div>
                                                        <Skeleton className="h-8 w-20 rounded-xl" />
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Medicine rows */}
                                    {!catalogLoading && (() => {
                                        const filtered = catalogMedicines.filter(m => {
                                            const name = m.medicine_name || "";
                                            const code = m.medicine_code || "";
                                            return name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                                code.toLowerCase().includes(catalogSearch.toLowerCase());
                                        });

                                        if (filtered.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                                    <div className="h-14 w-14 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 flex items-center justify-center mb-3">
                                                        <PackagePlus className="h-6 w-6 text-violet-400" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground/70">
                                                        {catalogSearch
                                                            ? "No medicines match your search"
                                                            : "All available medicines have been added"
                                                        }
                                                    </p>
                                                    {catalogSearch && (
                                                        <button
                                                            onClick={() => setCatalogSearch("")}
                                                            className="mt-3 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                                                        >
                                                            Clear search
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return filtered.map((med, i) => (
                                            <motion.div
                                                key={med.medicine_id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03, duration: 0.25 }}
                                                className="group flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card
                                           hover:border-violet-200 dark:hover:border-violet-800
                                           hover:shadow-[0_2px_12px_rgba(124,58,237,0.08)]
                                           transition-all duration-200"
                                            >
                                                {/* Icon */}
                                                <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900
                                                text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0
                                                group-hover:bg-violet-100 dark:group-hover:bg-violet-900/60 transition-colors">
                                                    <Pill className="h-4.5 w-4.5" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="inline-flex items-center rounded-md bg-muted/60 border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground catalog-mono">
                                                            {med.medicine_code}
                                                        </span>
                                                        <span className="text-sm font-semibold text-foreground/90 truncate">{med.medicine_name}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                                        <span>{med.medicine_type}</span>
                                                        {med.strength && <><span className="opacity-40">·</span><span>{med.strength}</span></>}
                                                        {med.manufacturer && <><span className="opacity-40">·</span><span className="truncate">{med.manufacturer}</span></>}
                                                    </div>
                                                </div>

                                                {/* Price + action */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="hidden sm:flex flex-col items-end">
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Base Price</p>
                                                        <p className="text-sm font-bold text-foreground catalog-mono">₹{med.price || 0}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleLinkMedicine(med)}
                                                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl
                                                   bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold
                                                   shadow-[0_2px_8px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_12px_rgba(124,58,237,0.4)]
                                                   transition-all"
                                                    >
                                                        <PackagePlus className="h-3.5 w-3.5" />
                                                        Add
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ));
                                    })()}
                                </div>
                            </ScrollArea>

                            {/* ── Footer count ── */}
                            {!catalogLoading && (
                                <div className="shrink-0 px-6 py-3.5 border-t border-border/50 bg-muted/10 flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {(() => {
                                            const count = catalogMedicines.filter(m =>
                                                (m.medicine_name || "").toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                                (m.medicine_code || "").toLowerCase().includes(catalogSearch.toLowerCase())
                                            ).length;
                                            return <><span className="font-bold text-foreground">{count}</span> medicine{count !== 1 ? "s" : ""}{catalogSearch ? " matched" : " available"}</>;
                                        })()}
                                    </p>
                                    <button
                                        onClick={() => setIsCatalogOpen(false)}
                                        className="h-8 px-4 rounded-xl border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                )}
            </>
        </RoleGuard>
    );
}

// Extracted Component
function MedicineForm({
    initialData,
    category,
    onClose,
    onSubmit,
    isHospitalAdmin
}: {
    initialData: Partial<Medicine>,
    category: MedicineCategory,
    onClose: () => void,
    onSubmit: (data: any) => Promise<void>,
    isHospitalAdmin: boolean
}) {
    // Form state
    const [formData, setFormData] = useState({
        medicine_name: initialData.medicine_name || "",
        medicine_code: initialData.medicine_code || "",
        medicine_type: initialData.medicine_type || category?.name || "Tablet",
        strength: initialData.strength || "",
        manufacturer: initialData.manufacturer || "",
        is_active: initialData.is_active ?? true,
        price: initialData.price || 0,
        stock_quantity: initialData.stock_quantity || 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Medicine Name</Label>
                    <Input disabled={isHospitalAdmin} value={formData.medicine_name} onChange={e => setFormData({ ...formData, medicine_name: e.target.value })} placeholder="e.g. Paracetamol" />
                </div>
                <div className="space-y-2">
                    <Label>Medicine Code</Label>
                    <Input disabled={isHospitalAdmin} value={formData.medicine_code} onChange={e => setFormData({ ...formData, medicine_code: e.target.value })} placeholder="UNIQUE CODE" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Type</Label>
                    <Input disabled={isHospitalAdmin} value={formData.medicine_type} onChange={e => setFormData({ ...formData, medicine_type: e.target.value })} placeholder="e.g. Tablet, Syrup" />
                </div>
                <div className="space-y-2">
                    <Label>Strength</Label>
                    <Input disabled={isHospitalAdmin} value={formData.strength} onChange={e => setFormData({ ...formData, strength: e.target.value })} placeholder="e.g. 500mg" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input disabled={isHospitalAdmin} value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} placeholder="e.g. GSK" />
                </div>
                <div className="space-y-2">
                    <Label>{isHospitalAdmin ? "Hospital Price (₹)" : "Base Price (₹)"}</Label>
                    <Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} placeholder="0.00" />
                    {isHospitalAdmin && (initialData as any)?.base_price !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">Master Price: ₹{(initialData as any).base_price}</p>
                    )}
                </div>
            </div>

            {isHospitalAdmin && (
                <div className="space-y-2">
                    <Label>Stock Quantity</Label>
                    <Input type="number" value={formData.stock_quantity} onChange={e => setFormData({ ...formData, stock_quantity: Number(e.target.value) })} placeholder="0" />
                </div>
            )}

            <div className="flex items-center justify-between pt-2">
                <Label>{isHospitalAdmin ? "Active in Hospital" : "Active Status"}</Label>
                <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
            </div>

            <DialogFooter className="mt-4">
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all rounded-lg h-9" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Save"
                    )}
                </Button>
            </DialogFooter>
        </div>
    );
}

"use client";

import { ClinicalMasterLayout } from "@/components/modules/master-data/clinical-master-layout";
import { RoleGuard } from "@/components/auth/role-guard";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { Test, Department } from "@/types/clinical";
import { clinicalService } from "@/services/clinical-service";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter, Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { Search, PackagePlus, Loader2, FlaskConical, X, Plus, Trash2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

export default function TestsPage() {
    const { addToast } = useToast();
    const { user } = useAuth();
    const isHospitalAdmin = user?.role === 'HospitalAdmin';
    const hospitalId = user?.hospitalid;

    // Initial Fetch via SWR
    const testUrl = user ? (isHospitalAdmin && hospitalId ? `/master-data/tests?hospital_id=${hospitalId}` : `/master-data/tests`) : null;
    const deptUrl = user ? (isHospitalAdmin && hospitalId ? `/master-data/departments?hospital_id=${hospitalId}` : `/master-data/departments`) : null;

    const { data: rawTests = [], isLoading: isTestsLoading, mutate: mutateTests } = useApi<Test[]>(testUrl);
    const { data: rawDepts = [], isLoading: isDeptsLoading, mutate: mutateDepts } = useApi<Department[]>(deptUrl);
    const isLoading = isTestsLoading || isDeptsLoading;

    // Derived State
    const tests = useMemo(() => {
        if (isHospitalAdmin) return rawTests.filter((t: Test & { is_linked?: boolean }) => t.is_linked);
        return rawTests;
    }, [rawTests, isHospitalAdmin]);

    const departments = useMemo(() => {
        if (isHospitalAdmin) return rawDepts.filter((d: Department & { is_linked?: boolean }) => d.is_linked);
        return rawDepts;
    }, [rawDepts, isHospitalAdmin]);

    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    // Catalog State for Hospital Admin
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [catalogTests, setCatalogTests] = useState<Test[]>([]);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogLoading, setCatalogLoading] = useState(false);

    useEffect(() => {
        if (departments.length > 0 && (!selectedDepartment || !departments.find(d => d.department_id === selectedDepartment.department_id))) {
            setSelectedDepartment(departments[0]);
        } else if (departments.length === 0) {
            setSelectedDepartment(null);
        }
    }, [departments, selectedDepartment]);

    // --- Hospital Admin Catalog Actions ---
    const fetchCatalogTests = async () => {
        setCatalogLoading(true);
        try {
            // Fetch ALL master tests
            const data = await clinicalService.getTests();
            // Filter out ones already added to this hospital
            const existingIds = new Set(tests.map(t => t.test_id));
            setCatalogTests(data.filter(t => !existingIds.has(t.test_id)));
        } catch {
            addToast("Failed to load catalog", "error");
        } finally {
            setCatalogLoading(false);
        }
    };

    const handleLinkTest = async (test: Test) => {
        if (!hospitalId) return;
        try {
            await clinicalService.createTest({
                ...test,
                price: test.price || 0
            }, Number(hospitalId));

            mutateTests();
            mutateDepts();

            setCatalogTests(prev => prev.filter(t => t.test_id !== test.test_id));
            addToast(`${test.test_name} added to your tests`, "success");
            setIsCatalogOpen(false); // Auto-close model after success
        } catch {
            addToast("Failed to link test", "error");
        }
    };

    // --- Actions ---
    const handleAddItem = async (data: Partial<Test>) => {
        try {
            const newTest = await clinicalService.createTest(data);
            mutateTests();
            addToast(`Test ${newTest.test_name} added`, "success");
        } catch (e: unknown) {
            addToast((e as Error).message || "Failed to add test", "error");
        }
    };

    const handleEditItem = async (item: Test, data: Partial<Test>) => {
        try {
            await clinicalService.updateTest(item.test_id, data, isHospitalAdmin ? Number(hospitalId) : undefined);
            mutateTests();
            addToast(`Test updated`, "success");
        } catch (e: unknown) {
            addToast((e as Error).message || "Failed to update test", "error");
        }
    };

    // --- Renderers ---

    // 1. Item Card
    const renderTestCard = (test: Test) => (
        <div className="bg-white dark:bg-slate-800 border border-border/60 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold">
                    {test.test_code}
                </div>
                {!test.is_active && <Badge variant="destructive" className="h-4 px-1 text-[10px]">Inactive</Badge>}
            </div>

            <h3 className="font-semibold text-base truncate pr-6 cursor-default">{test.test_name}</h3>

            <div className="flex items-center gap-2 mt-1 mb-2">
                <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-100">{test.test_type}</Badge>
            </div>

            {test.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-auto pt-2">{test.description}</p>}

            <div className="mt-3 pt-3 border-t border-dashed flex justify-between items-center">
                {isHospitalAdmin && (test as Test & { base_price?: number }).base_price !== undefined ? (
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground line-through">Base: ₹{(test as Test & { base_price?: number }).base_price}</span>
                        <span className="font-bold text-sm text-blue-700 dark:text-blue-400">₹{test.price || 0}</span>
                    </div>
                ) : (
                    <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-semibold text-muted-foreground">Base Price</span>
                        <span className="font-bold text-sm">₹{test.price || 0}</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <RoleGuard allowedRoles={["SuperAdmin", "HospitalAdmin", "GroupAdmin"]}>
            <>
                {isHospitalAdmin && !isLoading && tests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-6rem)] bg-slate-50/50 dark:bg-slate-950/50">
                        <div className="text-center max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
                            <div className="w-24 h-24 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <PackagePlus className="w-12 h-12 text-sky-500" />
                            </div>
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600 mb-3">
                                Empty Test Catalog
                            </h2>
                            <p className="text-muted-foreground mb-8">
                                Your hospital currently has no tests configured. Browse the master catalog to verify and link standard tests.
                            </p>
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-lg shadow-sky-500/25 transition-all group"
                                onClick={() => {
                                    setIsCatalogOpen(true);
                                    fetchCatalogTests();
                                }}
                            >
                                <PackagePlus className="md:mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                Browse Master Catalog
                            </Button>
                        </div>
                    </div>
                ) : (
                    <ClinicalMasterLayout<Department, Test>
                        title="Pathology Tests Master"
                        description="Manage lab departments and available tests."
                        categoryLabel="Department"
                        itemLabel="Test"
                        categories={departments}
                        items={tests}
                        isLoading={isLoading}
                        selectedCategory={selectedDepartment}
                        onSelectCategory={setSelectedDepartment}

                        // Helpers
                        getCategoryId={(c) => c.department_id}
                        getCategoryName={(c) => c.department_name}
                        getItemId={(i) => i.test_id}
                        getItemName={(i) => i.test_name}
                        getItemCount={(cat) => tests.filter(t => t.department_id === cat.department_id).length}
                        // Filter logic: Item must belong to selected category AND match search query
                        filterItem={(item, query) => {
                            const matchesCategory = selectedDepartment ? item.department_id === selectedDepartment.department_id : false;
                            const testName = item.test_name || "";
                            const testCode = item.test_code || "";
                            const matchesSearch = testName.toLowerCase().includes(query.toLowerCase()) ||
                                testCode.toLowerCase().includes(query.toLowerCase());
                            return matchesCategory && matchesSearch;
                        }}

                        // Renderers
                        renderItemCard={renderTestCard}
                        renderItemForm={(initialData, category, onClose) => (
                            <TestForm
                                initialData={initialData}
                                category={category}
                                onClose={onClose}
                                departments={departments}
                                onSubmit={async (data) => {
                                    if (initialData.test_id) {
                                        await handleEditItem(initialData as Test, data);
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
                                        className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-900/20 dark:border-sky-800/50"
                                        onClick={() => {
                                            setIsCatalogOpen(true);
                                            fetchCatalogTests();
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
                            <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 to-sky-600 px-6 pt-6 pb-5 shrink-0">
                                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                                <div className="absolute bottom-0 left-20 h-14 w-14 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

                                <div className="relative z-10 flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                                            <FlaskConical className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                                Master Test Catalog
                                            </DialogTitle>
                                            <DialogDescription className="text-cyan-100 text-xs mt-0.5">
                                                Browse and link standard tests to your hospital
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

                                    {/* ── Loading skeletons — mirror exact row structure ── */}
                                    {catalogLoading && (
                                        <>
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card animate-pulse"
                                                    style={{ animationDelay: `${i * 60}ms` }}
                                                >
                                                    {/* Icon placeholder */}
                                                    <div className="h-10 w-10 rounded-xl bg-muted/60 shrink-0" />
                                                    {/* Text block */}
                                                    <div className="flex-1 space-y-2 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-4 w-14 rounded-full bg-muted/60" />
                                                            <div className="h-4 w-40 rounded-full bg-muted/60" />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="h-3 w-16 rounded-full bg-muted/40" />
                                                            <div className="h-3 w-28 rounded-full bg-muted/40" />
                                                        </div>
                                                    </div>
                                                    {/* Price + button */}
                                                    <div className="shrink-0 flex items-center gap-3">
                                                        <div className="hidden sm:flex flex-col gap-1.5 items-end">
                                                            <div className="h-3 w-16 rounded-full bg-muted/40" />
                                                            <div className="h-4 w-12 rounded-full bg-muted/60" />
                                                        </div>
                                                        <div className="h-8 w-20 rounded-xl bg-muted/60" />
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* ── Test rows ── */}
                                    {!catalogLoading && (() => {
                                        const filtered = catalogTests.filter(t => {
                                            const name = t.test_name || "";
                                            const code = t.test_code || "";
                                            return name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                                code.toLowerCase().includes(catalogSearch.toLowerCase());
                                        });

                                        if (filtered.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                                    <div className="h-14 w-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center mb-3">
                                                        <FlaskConical className="h-6 w-6 text-cyan-400" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground/70">
                                                        {catalogSearch
                                                            ? "No tests match your search"
                                                            : "All available tests have been added"
                                                        }
                                                    </p>
                                                    {catalogSearch && (
                                                        <button
                                                            onClick={() => setCatalogSearch("")}
                                                            className="mt-3 text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                                                        >
                                                            Clear search
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return filtered.map((test, i) => (
                                            <motion.div
                                                key={test.test_id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03, duration: 0.25 }}
                                                className="group flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card
                                           hover:border-cyan-200 dark:hover:border-cyan-800
                                           hover:shadow-[0_2px_12px_rgba(8,145,178,0.08)]
                                           transition-all duration-200"
                                            >
                                                {/* Icon */}
                                                <div className="h-10 w-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900
                                                text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0
                                                group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/60 transition-colors">
                                                    <FlaskConical className="h-[18px] w-[18px]" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="inline-flex items-center rounded-md bg-muted/60 border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground catalog-mono">
                                                            {test.test_code}
                                                        </span>
                                                        <span className="text-sm font-semibold text-foreground/90 truncate">{test.test_name}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                                        <span>{test.test_type}</span>
                                                        {test.description && (
                                                            <><span className="opacity-40">·</span><span className="truncate max-w-[200px]">{test.description}</span></>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price + action */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="hidden sm:flex flex-col items-end">
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Base Price</p>
                                                        <p className="text-sm font-bold text-foreground catalog-mono">₹{test.price || 0}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleLinkTest(test)}
                                                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl
                                                   bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold
                                                   shadow-[0_2px_8px_rgba(8,145,178,0.3)] hover:shadow-[0_4px_12px_rgba(8,145,178,0.4)]
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

                            {/* ── Footer ── */}
                            {!catalogLoading && (
                                <div className="shrink-0 px-6 py-3.5 border-t border-border/50 bg-muted/10 flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {(() => {
                                            const count = catalogTests.filter(t =>
                                                (t.test_name || "").toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                                (t.test_code || "").toLowerCase().includes(catalogSearch.toLowerCase())
                                            ).length;
                                            return (
                                                <>
                                                    <span className="font-bold text-foreground">{count}</span>
                                                    {" "}test{count !== 1 ? "s" : ""}
                                                    {catalogSearch ? " matched" : " available"}
                                                </>
                                            );
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
function TestForm({
    initialData,
    category,
    onClose,
    departments,
    onSubmit,
    isHospitalAdmin
}: {
    initialData: Partial<Test>,
    category: Department,
    onClose: () => void,
    departments: Department[],
    onSubmit: (data: Partial<Test>) => Promise<void>,
    isHospitalAdmin: boolean
}) {
    const [formData, setFormData] = useState({
        test_name: initialData.test_name || "",
        test_code: initialData.test_code || "",
        test_type: initialData.test_type || "",
        description: initialData.description || "",
        department_id: initialData.department_id || category.department_id, // Default to selected category
        price: initialData.price || 0,
        is_active: initialData.is_active ?? true
    });
    const [parameters, setParameters] = useState<{ parameter_name: string, unit: string, normal_range: string }[]>(
        (initialData as any).test_parameters || []
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const submitData: any = { ...formData };
            if (!isHospitalAdmin) {
                submitData.test_parameters = {
                    deleteMany: {},
                    create: parameters.filter(p => p.parameter_name.trim() !== '')
                };
            }
            await onSubmit(submitData);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col max-h-[85vh]">
            <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Test Name</Label>
                            <Input disabled={isHospitalAdmin} value={formData.test_name} onChange={e => setFormData({ ...formData, test_name: e.target.value })} placeholder="e.g. CBC" />
                        </div>
                        <div className="space-y-2">
                            <Label>Test Code</Label>
                            <Input disabled={isHospitalAdmin} value={formData.test_code} onChange={e => setFormData({ ...formData, test_code: e.target.value })} placeholder="UNIQUE CODE" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select
                                value={String(formData.department_id)}
                                onValueChange={(val) => setFormData({ ...formData, department_id: Number(val) })}
                                disabled={isHospitalAdmin}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Dept" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => (
                                        <SelectItem key={d.department_id} value={String(d.department_id)}>{d.department_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Test Type</Label>
                            <Input disabled={isHospitalAdmin} value={formData.test_type} onChange={e => setFormData({ ...formData, test_type: e.target.value })} placeholder="e.g. Pathology, Radiology" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input disabled={isHospitalAdmin} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Details..." />
                        </div>
                        <div className="space-y-2">
                            <Label>{isHospitalAdmin ? "Hospital Price (₹)" : "Base Price (₹)"}</Label>
                            <Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} placeholder="0.00" />
                            {isHospitalAdmin && (initialData as Partial<Test> & { base_price?: number })?.base_price !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">Master Price: ₹{(initialData as Partial<Test> & { base_price?: number }).base_price}</p>
                            )}
                        </div>
                    </div>

                    {!isHospitalAdmin && (
                        <div className="mt-6 border border-border/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-border/60 flex justify-between items-center">
                                <div>
                                    <Label className="text-sm font-bold text-foreground">Diagnostic Parameters</Label>
                                    <p className="text-xs text-muted-foreground">Define the template for lab results.</p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setParameters([...parameters, { parameter_name: '', unit: '', normal_range: '' }])}
                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 h-8 text-xs font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Parameter
                                </Button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                                <div className="p-4 space-y-3">
                                    {parameters.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No parameters defined. The test results will be unstructured text.</p>
                                    ) : (
                                        parameters.map((param, i) => (
                                            <div key={i} className="flex items-start gap-2 animate-in slide-in-from-bottom-2">
                                                <div className="grid grid-cols-12 gap-2 flex-1">
                                                    <div className="col-span-12 md:col-span-5 relative">
                                                        <Input 
                                                            placeholder="Parameter Name (e.g. Hemoglobin)" 
                                                            value={param.parameter_name}
                                                            onChange={(e) => {
                                                                const newP = [...parameters];
                                                                newP[i].parameter_name = e.target.value;
                                                                setParameters(newP);
                                                            }}
                                                            className="h-9 bg-white"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="col-span-6 md:col-span-3">
                                                        <Input 
                                                            placeholder="Unit (e.g. g/dL)" 
                                                            value={param.unit}
                                                            onChange={(e) => {
                                                                const newP = [...parameters];
                                                                newP[i].unit = e.target.value;
                                                                setParameters(newP);
                                                            }}
                                                            className="h-9 bg-white"
                                                        />
                                                    </div>
                                                    <div className="col-span-6 md:col-span-4">
                                                        <Input 
                                                            placeholder="Range (e.g. 13.0 - 17.0)" 
                                                            value={param.normal_range}
                                                            onChange={(e) => {
                                                                const newP = [...parameters];
                                                                newP[i].normal_range = e.target.value;
                                                                setParameters(newP);
                                                            }}
                                                            className="h-9 bg-white"
                                                        />
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-600 shrink-0"
                                                    onClick={() => setParameters(parameters.filter((_, idx) => idx !== i))}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <Label>{isHospitalAdmin ? "Active in Hospital" : "Active Status"}</Label>
                        <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="mt-4 shrink-0">
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

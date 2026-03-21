"use client";

import { ClinicalMasterLayout, BaseCategory, BaseItem } from "@/components/modules/master-data/clinical-master-layout";
import { RoleGuard } from "@/components/auth/role-guard";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Test, Department } from "@/types/clinical";
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
import { Search, PackagePlus, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TestsPage() {
    const { addToast } = useToast();
    const { user } = useAuth();
    const isHospitalAdmin = user?.role === 'HospitalAdmin';
    const hospitalId = user?.hospitalid;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    // Catalog State for Hospital Admin
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [catalogTests, setCatalogTests] = useState<Test[]>([]);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogLoading, setCatalogLoading] = useState(false);

    // Initial Fetch
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Departments and Tests
            const [deptsResponse, testsResponse] = await Promise.all([
                clinicalService.getDepartments(isHospitalAdmin && hospitalId ? Number(hospitalId) : undefined),
                clinicalService.getTests(isHospitalAdmin && hospitalId ? Number(hospitalId) : undefined)
            ]);

            // For Hospital Admins, filter out tests and departments not explicitly linked to their hospital
            let testsData = testsResponse;
            let deptsData = deptsResponse;

            if (isHospitalAdmin) {
                testsData = testsData.filter((t: any) => t.is_linked);
                deptsData = deptsData.filter((d: any) => d.is_linked);
            }

            setDepartments(deptsData);
            setTests(testsData);

            if (deptsData.length > 0 && !selectedDepartment) {
                setSelectedDepartment(deptsData[0]);
            } else if (deptsData.length === 0) {
                setSelectedDepartment(null as any);
            }
        } catch (error) {
            console.error("Failed to load data", error);
            addToast("Failed to load data", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user, isHospitalAdmin, hospitalId]);

    // --- Hospital Admin Catalog Actions ---
    const fetchCatalogTests = async () => {
        setCatalogLoading(true);
        try {
            // Fetch ALL master tests
            const data = await clinicalService.getTests();
            // Filter out ones already added to this hospital
            const existingIds = new Set(tests.map(t => t.test_id));
            setCatalogTests(data.filter(t => !existingIds.has(t.test_id)));
        } catch (error) {
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

            const fullTest = { ...test, is_linked: true, is_active_in_hospital: true, price: test.price || 0 };
            setTests(prev => [...prev, fullTest]);
            setCatalogTests(prev => prev.filter(t => t.test_id !== test.test_id));
            addToast(`${test.test_name} added to your tests`, "success");
            setIsCatalogOpen(false); // Auto-close model after success

            // Auto select its department if one isn't selected or we want to jump to it
            const dept = departments.find(d => d.department_id === test.department_id);
            if (dept && !selectedDepartment) setSelectedDepartment(dept);

            // Re-fetch data silently in background
            clinicalService.getTests(Number(hospitalId)).then(data => {
                if (isHospitalAdmin) {
                    setTests(data.filter((t: any) => t.is_linked));
                }
            }).catch(console.error);

        } catch (error) {
            addToast("Failed to link test", "error");
        }
    };

    // --- Actions ---
    const handleAddItem = async (data: Partial<Test>) => {
        try {
            const newTest = await clinicalService.createTest(data);
            setTests(prev => [...prev, newTest]);
            addToast(`Test ${newTest.test_name} added`, "success");
        } catch (e: any) {
            addToast(e.message || "Failed to add test", "error");
        }
    };

    const handleEditItem = async (item: Test, data: Partial<Test>) => {
        try {
            const updated = await clinicalService.updateTest(item.test_id, data, isHospitalAdmin ? Number(hospitalId) : undefined);

            setTests(prev => prev.map(t => {
                if (t.test_id === item.test_id) {
                    if (isHospitalAdmin) {
                        return {
                            ...t,
                            price: data.price !== undefined ? data.price : t.price,
                            is_active_in_hospital: data.is_active !== undefined ? data.is_active : (t as any).is_active_in_hospital
                        };
                    }
                    return { ...t, ...data, ...updated };
                }
                return t;
            }));
            addToast(`Test updated`, "success");
        } catch (e: any) {
            addToast(e.message || "Failed to update test", "error");
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
                {isHospitalAdmin && (test as any).base_price !== undefined ? (
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground line-through">Base: ₹{(test as any).base_price}</span>
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
                    <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-xl border-slate-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <DialogTitle className="text-xl font-bold">Master Test Catalog</DialogTitle>
                            <DialogDescription className="mt-1 flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                Browse and add standard tests to your hospital.
                            </DialogDescription>
                            <div className="mt-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search catalog by name or code..."
                                    className="pl-9 bg-slate-50 border-slate-200"
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1 -mx-6 px-6 relative">
                            {catalogLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {catalogTests
                                        .filter(t => {
                                            const name = t.test_name || "";
                                            const code = t.test_code || "";
                                            return name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                                code.toLowerCase().includes(catalogSearch.toLowerCase());
                                        })
                                        .map(test => (
                                            <div key={test.test_id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-sky-300 transition-colors shadow-sm">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="text-[10px] bg-slate-50">{test.test_code}</Badge>
                                                        <h4 className="font-semibold">{test.test_name}</h4>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{test.test_type}</span>
                                                        {test.description && <span className="max-w-[200px] truncate">• {test.description}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Base Price</p>
                                                        <p className="font-bold text-sm">₹{test.price || 0}</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleLinkTest(test)}
                                                        className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                                                    >
                                                        <PackagePlus className="h-4 w-4 mr-1" /> Add
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    {catalogTests.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground">
                                            All available tests have been added to your hospital.
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </DialogContent >
                </Dialog >
            )
            }
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
    onSubmit: (data: any) => Promise<void>,
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
                    {isHospitalAdmin && (initialData as any)?.base_price !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">Master Price: ₹{(initialData as any).base_price}</p>
                    )}
                </div>
            </div>

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

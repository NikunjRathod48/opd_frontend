"use client";

import { ClinicalMasterLayout, BaseCategory } from "@/components/modules/master-data/clinical-master-layout";
import { RoleGuard } from "@/components/auth/role-guard";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Diagnosis, Department } from "@/types/clinical";
import { clinicalService } from "@/services/clinical-service";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";

export default function DiagnosesPage() {
    const { user } = useAuth();
    const isHospitalAdmin = user?.role === 'HospitalAdmin';
    const { addToast } = useToast();
    
    const { data: departments = [], isLoading: isDeptLoading } = useApi<Department[]>('/master-data/departments');
    const { data: diagnoses = [], isLoading: isDiagLoading, mutate: mutateDiag } = useApi<Diagnosis[]>('/master-data/diagnoses');
    const isLoading = isDeptLoading || isDiagLoading;

    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    // Auto-select first department if available
    useEffect(() => {
        if (departments.length > 0 && !selectedDepartment) {
            setSelectedDepartment(departments[0]);
        }
    }, [departments, selectedDepartment]);

    // --- Actions ---
    const handleAddItem = async (data: Partial<Diagnosis>) => {
        try {
            const newDiag = await clinicalService.createDiagnosis(data);
            mutateDiag((prev) => [...(prev || []), newDiag], { revalidate: false });
            addToast(`Diagnosis ${newDiag.diagnosis_name} added`, "success");
        } catch (e: any) {
            addToast(e.message || "Failed to add Diagnosis", "error");
        }
    };

    const handleEditItem = async (item: Diagnosis, data: Partial<Diagnosis>) => {
        try {
            const updated = await clinicalService.updateDiagnosis(item.diagnosis_id, data);
            mutateDiag((prev) => (prev || []).map(d => d.diagnosis_id === item.diagnosis_id ? updated : d), { revalidate: false });
            addToast(`Diagnosis updated`, "success");
        } catch (e: any) {
            addToast(e.message || "Failed to update Diagnosis", "error");
        }
    };

    // --- Renderers ---

    // 1. Item Card
    const renderDiagnosisCard = (item: Diagnosis) => (
        <div className="bg-white dark:bg-slate-800 border border-border/60 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-mono text-xs font-bold">
                    {item.diagnosis_code}
                </div>
            </div>

            <h3 className="font-semibold text-base truncate pr-6 cursor-default">{item.diagnosis_name}</h3>

            {item.description && <p className="text-xs text-muted-foreground line-clamp-3 mt-2">{item.description}</p>}
        </div>
    );

    return (
        <RoleGuard allowedRoles={["SuperAdmin", "HospitalAdmin", "GroupAdmin"]}>
        <ClinicalMasterLayout<Department, Diagnosis>
            title="Diagnoses Master"
            description="Manage clinical diagnosis categories."
            categoryLabel="Department"
            itemLabel="Diagnosis"
            categories={departments}
            items={diagnoses}
            isLoading={isLoading}
            selectedCategory={selectedDepartment}
            onSelectCategory={setSelectedDepartment}

            // Helpers
            getCategoryId={(c) => c.department_id}
            getCategoryName={(c) => c.department_name}
            getItemId={(i) => i.diagnosis_id}
            getItemName={(i) => i.diagnosis_name}
            getItemCount={(cat) => diagnoses.filter(d => d.department_id === cat.department_id).length}

            filterItem={(item, query) => {
                const matchesCategory = selectedDepartment ? item.department_id === selectedDepartment.department_id : false;
                const matchesSearch = item.diagnosis_name.toLowerCase().includes(query.toLowerCase()) ||
                    item.diagnosis_code.toLowerCase().includes(query.toLowerCase());
                return matchesCategory && matchesSearch;
            }}

            // Renderers
            renderItemCard={renderDiagnosisCard}
            renderItemForm={(initialData, category, onClose) => (
                <DiagnosisForm
                    initialData={initialData}
                    category={category}
                    onClose={onClose}
                    departments={departments}
                    onSubmit={async (data) => {
                        if (initialData.diagnosis_id) {
                            await handleEditItem(initialData as Diagnosis, data);
                        } else {
                            await handleAddItem(data);
                        }
                        onClose();
                    }}
                />
            )}

            // Actions (Disabled for Hospital Admins as diagnoses are global master data)
            onAddItem={!isHospitalAdmin ? (handleAddItem as any) : undefined}
            onEditItem={!isHospitalAdmin ? (handleEditItem as any) : undefined}
        />
        </RoleGuard>
    );
}

// Extracted Component
function DiagnosisForm({
    initialData,
    category,
    onClose,
    departments,
    onSubmit
}: {
    initialData: Partial<Diagnosis>,
    category: Department,
    onClose: () => void,
    departments: Department[],
    onSubmit: (data: any) => Promise<void>
}) {
    const [formData, setFormData] = useState({
        diagnosis_name: initialData.diagnosis_name || "",
        diagnosis_code: initialData.diagnosis_code || "",
        description: initialData.description || "",
        department_id: initialData.department_id || category.department_id,
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
                    <Label>Diagnosis Name</Label>
                    <Input value={formData.diagnosis_name} onChange={e => setFormData({ ...formData, diagnosis_name: e.target.value })} placeholder="e.g. Hypertension" />
                </div>
                <div className="space-y-2">
                    <Label>Diagnosis Code</Label>
                    <Input value={formData.diagnosis_code} onChange={e => setFormData({ ...formData, diagnosis_code: e.target.value })} placeholder="ICD Code" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Department</Label>
                <Select
                    value={String(formData.department_id)}
                    onValueChange={(val) => setFormData({ ...formData, department_id: Number(val) })}
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
                <Label>Description</Label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Details..." />
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

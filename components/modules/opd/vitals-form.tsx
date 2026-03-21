"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { opdService } from "@/services/opd-service";
import { Activity, HeartPulse, Thermometer, Droplets, Scale, Ruler } from "lucide-react";

interface VitalsFormProps {
    opdId: number;
    initialData?: any;
    readOnly?: boolean;
    onSaved?: () => void;
}

export function VitalsForm({ opdId, initialData, readOnly = false, onSaved }: VitalsFormProps) {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [vitals, setVitals] = useState({
        height: initialData?.height || "",
        weight: initialData?.weight || "",
        blood_pressure: initialData?.blood_pressure || "",
        temperature: initialData?.temperature || "",
        spo2: initialData?.spo2 || "",
        pulse: initialData?.pulse || "",
    });

    useEffect(() => {
        const loadVitals = async () => {
            try {
                const data = await opdService.getVitals(opdId);
                if (data) {
                    setVitals({
                        height: data.height || "",
                        weight: data.weight || "",
                        blood_pressure: data.blood_pressure || "",
                        temperature: data.temperature || "",
                        spo2: data.spo2 || "",
                        pulse: data.pulse || "",
                    });
                }
            } catch (err) {
                // Not found or error, ignore
            }
        };

        if (initialData) {
            setVitals({
                height: initialData.height || "",
                weight: initialData.weight || "",
                blood_pressure: initialData.blood_pressure || "",
                temperature: initialData.temperature || "",
                spo2: initialData.spo2 || "",
                pulse: initialData.pulse || "",
            });
        } else {
            loadVitals();
        }
    }, [initialData, opdId]);

    const handleChange = (field: keyof typeof vitals, value: string) => {
        setVitals(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (readOnly) return;
        setLoading(true);
        try {
            await opdService.upsertVitals(opdId, {
                height: vitals.height ? Number(vitals.height) : undefined,
                weight: vitals.weight ? Number(vitals.weight) : undefined,
                blood_pressure: vitals.blood_pressure || undefined,
                temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
                spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
                pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
            });
            addToast("Vitals saved successfully", "success");
            if (onSaved) onSaved();
        } catch (error) {
            console.error("Failed to save vitals:", error);
            addToast("Failed to save vitals", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border/50">
            <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                <Activity className="h-3 w-3" /> Patient Vitals
            </Label>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Height */}
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Ruler className="w-3 h-3" /> Height (cm)
                        </Label>
                        <Input
                            type="number"
                            placeholder="e.g. 170"
                            value={vitals.height}
                            onChange={(e) => handleChange("height", e.target.value)}
                            disabled={readOnly}
                            className="h-9 text-xs bg-background border-input"
                        />
                    </div>

                    {/* Weight */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Scale className="w-3 h-3" /> Weight (kg)
                        </Label>
                        <Input
                            type="number"
                            placeholder="e.g. 70"
                            value={vitals.weight}
                            onChange={(e) => handleChange("weight", e.target.value)}
                            disabled={readOnly}
                            className="h-9 text-xs bg-background border-input"
                        />
                    </div>

                    {/* Blood Pressure */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Blood Pressure
                        </Label>
                        <Input
                            type="text"
                            placeholder="e.g. 120/80"
                            value={vitals.blood_pressure}
                            onChange={(e) => handleChange("blood_pressure", e.target.value)}
                            disabled={readOnly}
                            className="h-9 text-xs bg-background border-input"
                        />
                    </div>

                    {/* Temperature */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Thermometer className="w-3 h-3" /> Temperature (°F)
                        </Label>
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="e.g. 98.6"
                            value={vitals.temperature}
                            onChange={(e) => handleChange("temperature", e.target.value)}
                            disabled={readOnly}
                            className="h-9 text-xs bg-background border-input"
                        />
                    </div>

                    {/* SpO2 */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Droplets className="w-3 h-3" /> SpO2 (%)
                        </Label>
                        <Input
                            type="number"
                            placeholder="e.g. 98"
                            value={vitals.spo2}
                            onChange={(e) => handleChange("spo2", e.target.value)}
                            disabled={readOnly}
                            className="h-9 text-xs bg-background border-input"
                        />
                    </div>

                    {/* Pulse */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <HeartPulse className="w-3 h-3" /> Pulse (bpm)
                        </Label>
                        <Input
                            type="number"
                            placeholder="e.g. 72"
                            value={vitals.pulse}
                            onChange={(e) => handleChange("pulse", e.target.value)}
                            disabled={readOnly}
                            className="h-9 text-xs bg-background border-input"
                        />
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} disabled={loading} size="sm" className="w-full sm:w-auto h-9 text-xs shadow-sm">
                            {loading ? "Saving..." : "Save Vitals"}
                        </Button>
                    </div>
                )}
        </div>
    );
}

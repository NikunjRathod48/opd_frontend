import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Users, Calendar, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { TimePicker } from "@/components/ui/time-picker";

// Constants
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Access Token Helper
const getAccessToken = () => {
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('medcore_user');
            if (stored) {
                return JSON.parse(stored).access_token || null;
            }
        } catch {
            return null;
        }
    }
    return null;
};

// API Helper
const apiRequest = async (endpoint: string, method: string = 'GET', body?: any) => {
    const token = getAccessToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config: RequestInit = {
        method,
        headers,
    };

    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://opd-backend-hntt.onrender.com'}${endpoint}`, config);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return {};
};

interface ScheduleItem {
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_appointments: number;
    is_available: boolean;
}

interface DoctorScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctor: any;
}

export function DoctorScheduleModal({ isOpen, onClose, doctor }: DoctorScheduleModalProps) {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [initialSchedule, setInitialSchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    const isDirty = JSON.stringify(schedule) !== JSON.stringify(initialSchedule);

    // Fetch Schedule
    useEffect(() => {
        if (isOpen && doctor) {
            fetchSchedule();
        }
    }, [isOpen, doctor]);

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            const fetchedData = await apiRequest(`/doctors/${doctor.doctor_id || doctor.doctorid}/availability`);

            // Merge with default structure to ensure all days present
            const fullSchedule = Array.from({ length: 7 }, (_, i) => {
                const existing = fetchedData.find((d: any) => d.day_of_week === i);
                return existing || {
                    day_of_week: i,
                    start_time: "09:00",
                    end_time: "17:00",
                    max_appointments: 10,
                    is_available: false
                };
            });
            // Sort by Sunday (0) to Saturday (6) or Monday based on preference. Let's stick to 0-6.
            setSchedule(fullSchedule);
            setInitialSchedule(fullSchedule);
        } catch (error) {
            console.error("Failed to fetch schedule", error);
            addToast("Failed to load doctor schedule", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (index: number, field: keyof ScheduleItem, value: any) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    const handleSave = async () => {
        // Validation: Check max_appointments > 0 for enabled days
        const invalidDays = schedule.filter(d => d.is_available && d.max_appointments <= 0);
        if (invalidDays.length > 0) {
            addToast(`Max patients must be greater than 0 for ${DAYS[invalidDays[0].day_of_week]}`, "error");
            return;
        }

        try {
            setSaving(true);
            await apiRequest(`/doctors/${doctor.doctor_id || doctor.doctorid}/availability`, 'PUT', {
                schedule: schedule
            });
            addToast("Weekly schedule updated successfully", "success");
            setInitialSchedule(schedule);
            onClose();
        } catch (error) {
            console.error("Failed to save schedule", error);
            addToast("Failed to update schedule", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleCopyAll = (sourceIndex: number) => {
        const sourceDay = schedule[sourceIndex];
        const newSchedule = schedule.map((day, i) => {
            if (i === sourceIndex) return day;
            return {
                ...day,
                start_time: sourceDay.start_time,
                end_time: sourceDay.end_time,
                max_appointments: sourceDay.max_appointments,
                is_available: sourceDay.is_available
            };
        });
        setSchedule(newSchedule);
        addToast("Time settings copied to all days", "info");
    }

    if (!doctor) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-none shadow-2xl rounded-2xl md:rounded-[2.5rem]">

                {/* Header */}
                <div className="relative h-20 bg-gradient-to-r from-emerald-600 to-teal-600 shrink-0 flex items-center px-6 md:px-8">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="relative z-10 flex items-center gap-4 text-white w-full">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">Manage Schedule</DialogTitle>
                            <DialogDescription className="text-emerald-100 text-xs">
                                Set weekly availability for {doctor.doctorname || doctor.name}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/10 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-2">Day</div>
                                <div className="col-span-2 text-center">Status</div>
                                <div className="col-span-3">Start Time</div>
                                <div className="col-span-3">End Time</div>
                                <div className="col-span-2">Max Patients</div>
                            </div>

                            {schedule.map((day, index) => (
                                <div key={day.day_of_week}
                                    className={cn(
                                        "grid grid-cols-2 md:grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all duration-200",
                                        day.is_available
                                            ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 shadow-sm"
                                            : "bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-70 hover:opacity-100"
                                    )}
                                >
                                    {/* Day Name */}
                                    <div className="col-span-1 md:col-span-2 font-semibold flex items-center gap-2 text-sm md:text-base">
                                        <div className={cn("w-2 h-2 rounded-full shrink-0", day.is_available ? "bg-emerald-500" : "bg-slate-300")} />
                                        {DAYS[day.day_of_week]}
                                    </div>

                                    {/* Toggle */}
                                    <div className="col-span-1 md:col-span-2 flex items-center justify-end md:justify-center">
                                        <div className="flex items-center gap-2">
                                            <span className="md:hidden text-xs text-muted-foreground font-medium">{day.is_available ? "Open" : "Closed"}</span>
                                            <Switch
                                                checked={day.is_available}
                                                onCheckedChange={(c) => handleUpdate(index, 'is_available', c)}
                                                className="data-[state=checked]:bg-emerald-600 scale-90 md:scale-100"
                                            />
                                        </div>
                                    </div>

                                    {/* Start Time */}
                                    <div className="col-span-1 md:col-span-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold">Start</span>
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 border border-transparent focus-within:border-emerald-500/50 transition-colors">
                                                <TimePicker
                                                    value={day.start_time}
                                                    onChange={(val) => handleUpdate(index, 'start_time', val)}
                                                    disabled={!day.is_available}
                                                    containerClassName="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* End Time */}
                                    <div className="col-span-1 md:col-span-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold">End</span>
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 border border-transparent focus-within:border-emerald-500/50 transition-colors">
                                                <TimePicker
                                                    value={day.end_time}
                                                    onChange={(val) => handleUpdate(index, 'end_time', val)}
                                                    disabled={!day.is_available}
                                                    containerClassName="w-full"
                                                    minTime={day.start_time}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Max Patients */}
                                    <div className="col-span-2 md:col-span-2 mt-2 md:mt-0">
                                        <div className="flex flex-col gap-1">
                                            <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold">Max Patients</span>
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 border border-transparent focus-within:border-emerald-500/50 transition-colors">
                                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={day.max_appointments}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdate(index, 'max_appointments', isNaN(val) ? 0 : val);
                                                    }}
                                                    disabled={!day.is_available}
                                                    className="bg-transparent border-none text-sm font-medium focus:outline-none w-full disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex justify-between shrink-0">
                    <Button variant="ghost" className="text-muted-foreground" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving || !isDirty} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 md:px-8 shadow-emerald-500/20 shadow-lg">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Schedule
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}

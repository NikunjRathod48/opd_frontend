"use client";

import { useAuth, UserRole } from "@/context/auth-context";
import { useData, OPDVisit, Patient, Appointment } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, Calendar, User, Activity, Clock, ChevronRight, ChevronLeft, Stethoscope, Pill, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { generatePatientPDF } from "@/lib/pdf-generator";
import { useToast } from "@/components/ui/toast";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

interface MedicalRecordsViewProps {
    hospitalId?: string;
}

export function MedicalRecordsView({ hospitalId }: MedicalRecordsViewProps) {
    const { user } = useAuth();
    const { patients, opdVisits, appointments } = useData();
    const { addToast } = useToast();

    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    // --- RBAC: Access Control ---
    const isPatient = user?.role === 'Patient';

    // ... (rest of logic same until return)

    const handleExport = async () => {
        if (!selectedPatient) return;
        setIsExporting(true);
        try {
            // Simulate a slight delay for better UX (so loader is visible)
            await new Promise(resolve => setTimeout(resolve, 800));
            generatePatientPDF(selectedPatient, patientOPDVisits, patientAppointments);
            addToast("Medical record exported successfully", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to export record", "error");
        } finally {
            setIsExporting(false);
        }
    };

    // 1. Get List of Accessible Patients
    const effectiveHospitalId = hospitalId || (['HospitalAdmin', 'Receptionist'].includes(user?.role || '') ? user?.hospitalid : undefined);

    const accessiblePatients = patients.filter(p => {
        if (effectiveHospitalId && p.hospitalid && String(p.hospitalid) !== String(effectiveHospitalId)) return false;

        if (isPatient) {
            const tempPatient = patients.find(pat => String(pat.userid) === String(user?.id));
            const pid = tempPatient?.patientid || (user as any)?.patientid || user?.id;
            return p.patientid === pid || p.patientname === user?.name;
        }
        if (searchQuery) {
            return p.patientname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.patient_no?.toString().includes(searchQuery);
        }
        return true;
    });

    // Auto-select if only one patient (e.g. Patient Login)
    if (isPatient && accessiblePatients.length === 1 && !selectedPatientId) {
        setSelectedPatientId(accessiblePatients[0].patientid);
    }

    const selectedPatient = patients.find(p => p.patientid === selectedPatientId);

    // 2. Aggregate Records for Selected Patient
    const patientOPDVisits = opdVisits.filter(v => v.patientid === selectedPatientId).sort((a, b) => new Date(b.visitdatetime).getTime() - new Date(a.visitdatetime).getTime());
    const patientAppointments = appointments.filter(a => a.patientid === selectedPatientId).sort((a, b) => new Date(b.appointmentdatetime).getTime() - new Date(a.appointmentdatetime).getTime());

    // Prepare options for SearchableSelect
    const patientOptions = accessiblePatients.map(p => ({
        label: p.patientname,
        value: p.patientid
    }));

    return (
        <>
            <LoadingOverlay isLoading={isExporting} text="Generating Report..." />
            <div className="flex flex-col gap-4 h-auto md:h-[calc(100dvh-100px)]">
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Medical Records</h2>
                    <p className="text-muted-foreground">Patient history, visits, and clinical notes</p>
                </div>

                <div className="flex flex-1 gap-6 md:overflow-hidden relative flex-col md:flex-row">
                    {/* LEFT PANEL: Patient List */}
                    {/* HIDDEN on mobile if patient selected (Master-Detail) */}
                    {!isPatient && (
                        <Card className={cn(
                            "w-full md:w-1/3 flex flex-col h-full border-r transition-all duration-300",
                            selectedPatientId ? "hidden md:flex" : "flex"
                        )}>
                            <CardHeader className="p-4 border-b shrink-0 bg-muted/20">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                    Search Patient
                                </label>
                                <SearchableSelect
                                    options={patientOptions}
                                    value={selectedPatientId || ""}
                                    onChange={(val) => setSelectedPatientId(val)}
                                    placeholder="Search by name..."
                                    className="w-full"
                                />
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                <div className="divide-y">
                                    {accessiblePatients.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                                            <User className="h-8 w-8 mb-2 opacity-20" />
                                            No patients found.
                                        </div>
                                    )}
                                    {accessiblePatients.map(p => (
                                        <div
                                            key={p.patientid}
                                            onClick={() => setSelectedPatientId(p.patientid)}
                                            className={cn(
                                                "p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between group",
                                                selectedPatientId === p.patientid && "bg-muted/80 border-l-4 border-primary"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary transition-transform group-hover:scale-110",
                                                    selectedPatientId === p.patientid && "bg-primary text-primary-foreground"
                                                )}>
                                                    {p.patientname.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className={cn("font-medium text-sm", selectedPatientId === p.patientid && "font-bold")}>{p.patientname}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {p.patient_no} • {p.age}yrs</p>
                                                </div>
                                            </div>
                                            <ChevronRight className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform",
                                                selectedPatientId === p.patientid && "text-primary translate-x-1"
                                            )} />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* RIGHT PANEL: Patient File */}
                    {/* Full width on mobile when selected */}
                    <Card className={cn(
                        "flex-1 flex flex-col md:h-full overflow-visible md:overflow-hidden border-none shadow-xl bg-white/40 backdrop-blur-md dark:bg-black/40 ring-1 ring-border/50",
                        isPatient ? "w-full" : "w-full md:w-2/3",
                        // Mobile Logic: Hidden if no patient selected (unless it's a patient role)
                        !selectedPatientId && !isPatient ? "hidden md:flex" : "flex h-auto"
                    )}>
                        {selectedPatient ? (
                            <>
                                {/* Premium Header with Glassmorphism */}
                                <div className="shrink-0 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent backdrop-blur-sm" />

                                    {/* Mobile Back Button */}
                                    <div className="md:hidden absolute top-2 left-2 z-20">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedPatientId(null)} className="h-8 gap-1 text-muted-foreground">
                                            <ChevronLeft className="h-4 w-4" /> Back
                                        </Button>
                                    </div>

                                    <div className="p-6 relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-4 pt-10 md:pt-6">
                                        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-background">
                                                {selectedPatient.patientname.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight">{selectedPatient.patientname}</h3>
                                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-sm text-muted-foreground mt-2">
                                                    <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border shadow-sm"><User className="h-3.5 w-3.5 text-primary" /> {selectedPatient.gender}, {selectedPatient.age} Years</span>
                                                    <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border shadow-sm"><Activity className="h-3.5 w-3.5 text-red-500" /> Blood: {selectedPatient.bloodgroupName || 'N/A'}</span>
                                                    <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border shadow-sm"><Calendar className="h-3.5 w-3.5 text-blue-500" /> Reg: {selectedPatient.registrationdate || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary"
                                            onClick={handleExport}
                                            disabled={isExporting}
                                        >
                                            <Download className="mr-2 h-4 w-4" /> {isExporting ? "Exporting..." : "Export"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Tabs & Content - Scrollable Area */}
                                <Tabs defaultValue="clinical" className="flex-1 flex flex-col overflow-hidden">
                                    <div className="px-4 md:px-6 pt-2 border-b shrink-0 bg-background/40 backdrop-blur-sm">
                                        <TabsList className="w-full h-auto bg-transparent p-0 gap-2 md:gap-6 flex">
                                            <TabsTrigger value="clinical" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-2 py-2 h-auto border border-transparent data-[state=active]:border-primary/20 transition-all text-xs md:text-sm flex-col md:flex-row gap-1 md:gap-2">
                                                <Stethoscope className="h-4 w-4" />
                                                <span>Clinical</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="appointments" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-2 py-2 h-auto border border-transparent data-[state=active]:border-primary/20 transition-all text-xs md:text-sm flex-col md:flex-row gap-1 md:gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>Appointments</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-2 py-2 h-auto border border-transparent data-[state=active]:border-primary/20 transition-all text-xs md:text-sm flex-col md:flex-row gap-1 md:gap-2">
                                                <User className="h-4 w-4" />
                                                <span>Info</span>
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {/* Scrollable Content Container */}
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                        <TabsContent value="clinical" className="mt-0 animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="text-lg font-bold flex items-center gap-2">
                                                    <FileText className="h-5 w-5 text-primary" /> Diagnosis History
                                                </h4>
                                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted">Total Visits: {patientOPDVisits.length}</span>
                                            </div>

                                            <div className="relative border-l-2 border-primary/20 ml-3 space-y-8 pb-10">
                                                {patientOPDVisits.length === 0 && <p className="text-muted-foreground pl-6 italic">No clinical records found.</p>}
                                                {patientOPDVisits.map((visit, idx) => (
                                                    <div key={visit.opdid} className="relative pl-8 group">
                                                        <div className={cn(
                                                            "absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-background transition-colors",
                                                            idx === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/30 group-hover:bg-primary/70"
                                                        )} />
                                                        <div className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                                                            <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                                                                <div>
                                                                    <p className="font-bold text-lg text-foreground">{visit.diagnosis || "Regular Checkup"}</p>
                                                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium uppercase tracking-wide">
                                                                        <Clock className="h-3 w-3" /> {new Date(visit.visitdatetime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                                    </p>
                                                                </div>
                                                                <div className={cn(
                                                                    "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border",
                                                                    visit.status === 'Active' ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"
                                                                )}>{visit.status}</div>
                                                            </div>

                                                            {visit.notes && (
                                                                <div className="bg-muted/30 p-3 rounded-lg text-sm text-foreground/80 leading-relaxed border border-border/50 mb-4 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                                                                    {visit.notes}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-3 pt-3 border-t">
                                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                                    DR
                                                                </div>
                                                                <div className="text-xs">
                                                                    <span className="block font-bold text-foreground">{visit.doctorName}</span>
                                                                    <span className="text-muted-foreground">Attending Physician</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="appointments" className="mt-0 animate-in slide-in-from-bottom-2 duration-300">
                                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                <Calendar className="h-5 w-5 text-primary" /> Appointment Timeline
                                            </h4>
                                            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <div className="min-w-[600px]">
                                                        <div className="grid grid-cols-4 bg-muted/40 p-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b">
                                                            <div>Date & Time</div>
                                                            <div>Doctor</div>
                                                            <div>Type</div>
                                                            <div>Status</div>
                                                        </div>
                                                        {patientAppointments.length === 0 && (
                                                            <div className="p-8 text-center text-sm text-muted-foreground italic">No appointments found.</div>
                                                        )}
                                                        {patientAppointments.map(app => (
                                                            <div key={app.appointmentid} className="grid grid-cols-4 p-4 text-sm border-b last:border-0 hover:bg-muted/20 transition-colors items-center">
                                                                <div className="font-medium">{new Date(app.appointmentdatetime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</div>
                                                                <div className="text-muted-foreground">{app.doctorName}</div>
                                                                <div><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">{app.type || 'ODP'}</span></div>
                                                                <div>
                                                                    <span className={cn(
                                                                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                                                        app.status === 'Scheduled' || app.status === 'Checked-In' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                            app.status === 'Completed' ? "bg-green-50 text-green-700 border-green-100" :
                                                                                app.status === 'Cancelled' ? "bg-red-50 text-red-700 border-red-100" :
                                                                                    "bg-gray-50 text-gray-700 border-gray-200"
                                                                    )}>
                                                                        {app.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="info" className="mt-0 animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <Card className="shadow-sm border-l-4 border-l-blue-500">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base">Contact Information</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="grid gap-4 text-sm">
                                                        <div className="flex justify-between py-2 border-b border-dashed">
                                                            <span className="text-muted-foreground">Phone</span>
                                                            <span className="font-medium">{selectedPatient.contact || "N/A"}</span>
                                                        </div>
                                                        <div className="flex justify-between py-2 border-b border-dashed">
                                                            <span className="text-muted-foreground">Email</span>
                                                            <span className="font-medium">{selectedPatient.email || "N/A"}</span>
                                                        </div>
                                                        <div className="flex justify-between py-2 border-b border-dashed">
                                                            <span className="text-muted-foreground">Address</span>
                                                            <span className="font-medium text-right max-w-[200px]">{selectedPatient.address ? selectedPatient.address + (selectedPatient.city_id ? `, City: ${selectedPatient.city_id}` : "") : "N/A"}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="shadow-sm border-l-4 border-l-red-500">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base">Emergency Contact</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="grid gap-4 text-sm">
                                                        <div className="flex justify-between py-2 border-b border-dashed">
                                                            <span className="text-muted-foreground">Name</span>
                                                            <span className="font-medium">{selectedPatient.emergency_contact_name || "N/A"}</span>
                                                        </div>
                                                        <div className="flex justify-between py-2 border-b border-dashed">
                                                            <span className="text-muted-foreground">Relation</span>
                                                            <span className="font-medium">{selectedPatient.emergency_contact_name ? "Emergency Contact" : "N/A"}</span>
                                                        </div>
                                                        <div className="flex justify-between py-2 border-b border-dashed">
                                                            <span className="text-muted-foreground">Phone</span>
                                                            <span className="font-medium">{selectedPatient.emergency_contact_number || "N/A"}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                                <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                                    <Search className="h-10 w-10 opacity-20" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">No Patient Selected</h3>
                                <p className="max-w-xs text-center mt-2 text-sm">Search for a patient or select one from the list to view their full medical history.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}

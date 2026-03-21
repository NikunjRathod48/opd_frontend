"use client";

import { useAuth } from "@/context/auth-context";
import { useData } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import {
    Calendar,
    Users,
    CreditCard,
    ClipboardCheck,
    Stethoscope
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function ReceptionistDashboard() {
    const { user } = useAuth();
    const { appointments, receipts, opdVisits, doctors } = useData();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Filter by Hospital (Receptionist Context)
    const myAppointments = appointments.filter(apt => String(apt.hospitalid) === String(user?.hospitalid));
    const myReceipts = receipts.filter(r => String(r.hospitalid) === String(user?.hospitalid));
    const myVisits = opdVisits.filter(v => String(v.hospitalid) === String(user?.hospitalid));
    const myDoctors = doctors.filter(doc => String(doc.hospitalid) === String(user?.hospitalid));

    const today = new Date().toISOString().split('T')[0];
    
    // Front Desk Metrics
    const todaysAppointments = myAppointments.filter(apt => apt.appointmentdatetime === today);
    const completedAppointments = todaysAppointments.filter(apt => apt.status === 'Completed').length;
    const walkInsToday = myVisits.filter(v => v.visitdatetime.startsWith(today)).length;
    
    // Today's collections
    const collectionsToday = myReceipts
        .filter(r => r.receiptdate === today && r.status === 'Paid')
        .reduce((sum, r) => sum + (Number(r.totalamount) || 0), 0);

    return (
        <RoleGuard allowedRoles={['Receptionist']}>
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950 p-6 font-sans">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-500 mb-2">
                                <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-2xl">
                                    <ClipboardCheck className="h-6 w-6" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                    Front Desk
                                </h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">
                                Overview of today's floor operations and collections.
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <ModernStatCard title="Today's Bookings" value={todaysAppointments.length} icon={Calendar} description="Total scheduled for today" loading={isLoading} color="blue" />
                        <ModernStatCard title="Total Walk-ins" value={walkInsToday} icon={Users} description="OPD tokens generated today" loading={isLoading} color="emerald" />
                        <ModernStatCard title="Completed Visits" value={completedAppointments} icon={Stethoscope} description="Patients checked out" loading={isLoading} color="orange" />
                        <ModernStatCard title="Today's Collection" value={`₹${collectionsToday.toLocaleString()}`} icon={CreditCard} description="Revenue processed today" loading={isLoading} color="violet" />
                    </div>

                    {/* Lists Grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                        
                        {/* Appointments Scroll */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><Calendar className="h-5 w-5 text-blue-500" /> Today's Queue</h2>
                            <p className="text-sm text-slate-500 mb-4">Patient manifest for {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                            <ScrollArea className="h-[350px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">{[1, 2, 3, 4].map(i => <div key={i} className="flex gap-4"><Skeleton className="h-10 w-10 rounded-full"/><div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/2"/><Skeleton className="h-3 w-1/3"/></div></div>)}</div>
                                ) : todaysAppointments.length === 0 ? (
                                     <div className="flex flex-col flex-1 items-center justify-center h-[200px] text-slate-400">
                                        <Calendar className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-medium">Quiet day</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {todaysAppointments.map((apt, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                                        {apt.patientName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{apt.patientName}</p>
                                                        <p className="text-xs font-semibold text-slate-500">Dr. {apt.doctorName}</p>
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    "text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider",
                                                    apt.status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                                                    apt.status === 'Cancelled' ? "bg-red-100 text-red-700" :
                                                    "bg-blue-100 text-blue-700"
                                                )}>{apt.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Recent Transactions Scroll */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><CreditCard className="h-5 w-5 text-violet-500" /> Recent Collections</h2>
                            <p className="text-sm text-slate-500 mb-4">Latest billing activity at this branch</p>
                            <ScrollArea className="h-[350px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
                                ) : myReceipts.length === 0 ? (
                                    <div className="flex flex-col flex-1 items-center justify-center h-[200px] text-slate-400">
                                        <CreditCard className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-medium">No invoices yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myReceipts.slice(0, 7).map((receipt, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors hover:shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{receipt.patientName}</span>
                                                    <span className="text-xs font-semibold text-slate-500">#{receipt.receiptnumber} • {receipt.receiptdate}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">₹{(receipt.totalamount || 0).toLocaleString()}</span>
                                                    <span className={cn(
                                                        "text-[10px] uppercase tracking-widest font-bold",
                                                        receipt.status === 'Paid' ? 'text-emerald-500' : 'text-orange-500'
                                                    )}>{receipt.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                        
                    </div>

                </div>
            </div>
        </RoleGuard>
    );
}

function ModernStatCard({ title, value, icon: Icon, description, loading, color }: { title: string, value: string | number, icon: any, description: string, loading: boolean, color: "blue" | "emerald" | "orange" | "violet" }) {
    const colorMap = {
        blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900",
        emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900",
        orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900",
        violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900",
    };

    if (loading) return <Skeleton className="h-[140px] w-full rounded-3xl" />;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="font-bold text-slate-500 dark:text-slate-400">{title}</span>
                <div className={cn("p-2 rounded-xl border", colorMap[color])}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <div className="relative z-10">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
                <p className="text-xs font-semibold text-slate-400 mt-1">{description}</p>
            </div>
            <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40", colorMap[color].split(" ")[0])} />
        </div>
    );
}

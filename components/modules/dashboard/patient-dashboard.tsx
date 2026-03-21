"use client";

import { useAuth } from "@/context/auth-context";
import { useData } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import {
    Calendar,
    Activity,
    CreditCard,
    Pill,
    User
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function PatientDashboard() {
    const { user } = useAuth();
    const { appointments, receipts, patients } = useData();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const myProfile = patients.find(p => String(p.patientid) === String(user?.id) || p.patientname === user?.name);
    const myAppointments = appointments.filter(apt => apt.patientName === user?.name);
    const myReceipts = receipts.filter(r => r.patientName === user?.name);

    const today = new Date().toISOString().split('T')[0];
    const upcomingAppointments = myAppointments.filter(apt => apt.appointmentdatetime >= today && apt.status !== 'Cancelled');
    const pastAppointments = myAppointments.filter(apt => apt.appointmentdatetime < today || apt.status === 'Completed');

    // Total Spent
    const totalSpent = myReceipts
        .filter(r => r.status === 'Paid')
        .reduce((sum, r) => sum + (Number(r.totalamount) || 0), 0);

    return (
        <RoleGuard allowedRoles={['Patient']}>
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950 p-6 font-sans">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 text-teal-600 dark:text-teal-500 mb-2">
                                <div className="p-3 bg-teal-100 dark:bg-teal-500/20 rounded-2xl">
                                    <User className="h-6 w-6" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                    Patient Portal
                                </h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">
                                Welcome, {user?.name}. Your health overview at a glance.
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <ModernStatCard title="Upcoming Visits" value={upcomingAppointments.length} icon={Calendar} description="Appointments scheduled" loading={isLoading} color="blue" />
                        <ModernStatCard title="Total Visits" value={myAppointments.length} icon={Activity} description="Lifetime consultations" loading={isLoading} color="emerald" />
                        <ModernStatCard title="Total Spent" value={`₹${totalSpent.toLocaleString()}`} icon={CreditCard} description="Lifetime health investment" loading={isLoading} color="violet" />
                    </div>

                    {/* Lists Grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                        
                        {/* Upcoming Appointments */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><Calendar className="h-5 w-5 text-blue-500" /> My Appointments</h2>
                            <p className="text-sm text-slate-500 mb-4">Your upcoming and recent scheduled visits</p>
                            <ScrollArea className="h-[350px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
                                ) : myAppointments.length === 0 ? (
                                     <div className="flex flex-col flex-1 items-center justify-center h-[200px] text-slate-400">
                                        <Calendar className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-medium">No appointments</p>
                                        <p className="text-xs">You have no upcoming or past visits.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingAppointments.concat(pastAppointments).slice(0, 7).map((apt, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800 shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                                        <Calendar className="h-5 w-5"/>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{apt.appointmentdatetime}</p>
                                                        <p className="text-xs font-semibold text-slate-500 mt-1">Consultation with Dr. {apt.doctorName}</p>
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    "text-xs px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-center flex-shrink-0",
                                                    apt.status === 'Completed' ? "bg-emerald-100 text-emerald-700 block" :
                                                    apt.status === 'Cancelled' ? "bg-red-100 text-red-700 block" :
                                                    "bg-blue-100 text-blue-700 block"
                                                )}>{apt.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Recent Transactions Scroll */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><CreditCard className="h-5 w-5 text-violet-500" /> My Invoices</h2>
                            <p className="text-sm text-slate-500 mb-4">Latest billing and payment history</p>
                            <ScrollArea className="h-[350px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
                                ) : myReceipts.length === 0 ? (
                                    <div className="flex flex-col flex-1 items-center justify-center h-[200px] text-slate-400">
                                        <CreditCard className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-medium">No invoices yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myReceipts.slice(0, 7).map((receipt, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors hover:shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                                                        <Activity className="h-5 w-5"/>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">#{receipt.receiptnumber}</span>
                                                        <span className="text-xs font-semibold text-slate-500">{receipt.receiptdate}</span>
                                                    </div>
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

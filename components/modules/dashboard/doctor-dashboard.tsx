"use client";

import { useAuth } from "@/context/auth-context";
import { useData } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import {
    Calendar,
    Stethoscope,
    Users,
    Activity,
    ClipboardList
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function DoctorDashboard() {
    const { user } = useAuth();
    const { appointments, doctors, opdVisits } = useData();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading time to fetch contexts properly
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Derived Metrics for Doctor
    const myDoctorProfile = doctors.find(d => String(d.userid) === String(user?.id));
    const doctorId = myDoctorProfile?.doctorid || (user as any)?.doctorid || user?.id;

    const myAppointments = appointments.filter(apt => 
        String(apt.doctorid) === String(doctorId) || apt.doctorName === user?.name
    );

    const myVisits = opdVisits.filter(v => 
        String(v.doctorid) === String(doctorId)
    );

    const today = new Date().toISOString().split('T')[0];
    const todaysAppointments = myAppointments.filter(apt => apt.appointmentdatetime === today);

    const pendingTokens = myVisits.filter(v => v.status === "Active").length;
    const completedConsults = myVisits.filter(v => v.status === "Discharged" && v.visitdatetime.startsWith(today)).length;

    const aptStatusData = [
        { name: 'Completed', value: myAppointments.filter(a => a.status === 'Completed').length, color: '#10b981' },
        { name: 'Scheduled', value: myAppointments.filter(a => a.status === 'Scheduled').length, color: '#3b82f6' },
        { name: 'Cancelled', value: myAppointments.filter(a => a.status === 'Cancelled').length, color: '#ef4444' },
    ];

    return (
        <RoleGuard allowedRoles={['Doctor']}>
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950 p-6 font-sans">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-500 mb-2">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl">
                                    <Stethoscope className="h-6 w-6" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                    Clinical Dashboard
                                </h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">
                                Good morning, Dr. {user?.name}. Here is your schedule for today.
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <ModernStatCard title="Today's Schedule" value={todaysAppointments.length} icon={Calendar} description="Appointments booked for today" loading={isLoading} color="blue" />
                        <ModernStatCard title="Active Tokens" value={pendingTokens} icon={Activity} description="Patients currently in OPD queue" loading={isLoading} color="orange" />
                        <ModernStatCard title="Completed Consults" value={completedConsults} icon={ClipboardList} description="Finished today" loading={isLoading} color="emerald" />
                    </div>

                    {/* Content Section */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        
                        {/* Status Chart */}
                        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md text-center">
                            <h2 className="text-xl font-bold mb-1">My Appointments</h2>
                            <p className="text-sm text-slate-500 mb-2">Overall status distribution</p>
                            {isLoading ? (
                                <Skeleton className="h-[250px] w-full rounded-xl mt-4" />
                            ) : (
                                <div className="h-[280px] w-full flex flex-col items-center justify-center">
                                    <ResponsiveContainer width="100%" height="75%">
                                        <PieChart>
                                            <Pie data={aptStatusData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" strokeWidth={0}>
                                                {aptStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-col gap-2 text-sm mt-2 w-full px-4">
                                        {aptStatusData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                                    {item.name}
                                                </div>
                                                <span className="opacity-80">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Today's Schedule List */}
                        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><Calendar className="h-5 w-5 text-blue-500" /> Today's Roster</h2>
                            <p className="text-sm text-slate-500 mb-4">Your scheduled patients for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                            <ScrollArea className="h-[320px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
                                ) : todaysAppointments.length === 0 ? (
                                     <div className="flex flex-col flex-1 items-center justify-center h-[200px] text-slate-400">
                                        <Calendar className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-medium">Free day!</p>
                                        <p className="text-xs">You have no appointments scheduled for today.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {todaysAppointments.map((apt, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800 shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-lg">
                                                        {apt.patientName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{apt.patientName}</p>
                                                        <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1"><Activity className="h-3 w-3"/> Token: #{apt.appointmentid || Math.floor(Math.random()*20)}</p>
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    "text-xs px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider",
                                                    apt.status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                                                    apt.status === 'Cancelled' ? "bg-red-100 text-red-700" :
                                                    "bg-blue-100 text-blue-700 block text-center"
                                                )}>{apt.status}</span>
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
            {/* Subtle Gradient Wash */}
            <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40", colorMap[color].split(" ")[0])} />
        </div>
    );
}

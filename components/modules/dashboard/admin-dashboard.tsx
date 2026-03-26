"use client";

import { useAuth } from "@/context/auth-context";
import { useData } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Users,
    Stethoscope,
    Calendar,
    IndianRupee,
    BarChart3,
    Activity,
    CreditCard
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reportsService, DashboardAnalytics } from "@/services/reports-service";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";

export function AdminDashboard() {
    const { user } = useAuth();
    const { patients, doctors, appointments, receipts, hospitals } = useData();
    const { addToast } = useToast();

    const isAdmin = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin'].includes(user?.role || '');

    const analyticsUrl = !isAdmin ? null :
        user?.hospitalgroupid ? `/reports/dashboard-analytics?hospitalGroupId=${user.hospitalgroupid}` :
        user?.hospitalid ? `/reports/dashboard-analytics?hospitalId=${user.hospitalid}` :
        `/reports/dashboard-analytics`;

    const { data: analytics = null, isLoading } = useApi<DashboardAnalytics>(analyticsUrl);

    // Derived Metrics
    const myPatients = patients.filter(p => {
        if (user?.role === 'HospitalAdmin') return String(p.hospitalid) === String(user?.hospitalid) || !p.hospitalid;
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => h.hospitalid === p.hospitalid);
            return h?.hospitalgroupid === user?.hospitalgroupid || !p.hospitalid;
        }
        return true;
    });
    
    const myDoctors = doctors.filter(doc => {
        if (user?.role === 'HospitalAdmin') return String(doc.hospitalid) === String(user?.hospitalid);
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => String(h.hospitalid) === String(doc.hospitalid));
            return String(h?.hospitalgroupid) === String(user?.hospitalgroupid);
        }
        return true;
    });

    const myAppointments = appointments.filter(apt => {
        if (user?.role === 'HospitalAdmin') return String(apt.hospitalid) === String(user?.hospitalid);
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => String(h.hospitalid) === String(apt.hospitalid));
            return String(h?.hospitalgroupid) === String(user?.hospitalgroupid);
        }
        return true;
    });

    const today = new Date().toISOString().split('T')[0];
    const todaysAppointments = myAppointments.filter(apt => apt.appointmentdatetime === today).length;

    const myReceipts = receipts.filter(r => {
        if (user?.role === 'HospitalAdmin') return String(r.hospitalid) === String(user?.hospitalid);
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => String(h.hospitalid) === String(r.hospitalid));
            return String(h?.hospitalgroupid) === String(user?.hospitalgroupid);
        }
        return true;
    });

    const totalRevenueFallback = myReceipts.reduce((sum, r) => sum + (r.totalamount || 0), 0);
    const totalRevenue = analytics ? analytics.totalRevenue : totalRevenueFallback;

    const aptStatusData = analytics ? analytics.appStatusData.map(d => ({
        ...d, color: d.name === 'Completed' ? '#10b981' : d.name === 'Scheduled' ? '#3b82f6' : '#ef4444'
    })) : [
        { name: 'Completed', value: myAppointments.filter(a => a.status === 'Completed').length, color: '#10b981' },
        { name: 'Scheduled', value: myAppointments.filter(a => a.status === 'Scheduled').length, color: '#3b82f6' },
        { name: 'Cancelled', value: myAppointments.filter(a => a.status === 'Cancelled').length, color: '#ef4444' },
    ];

    const revenueData = analytics ? analytics.revenueTrendData : [];

    return (
        <RoleGuard allowedRoles={['SuperAdmin', 'GroupAdmin', 'HospitalAdmin']}>
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950 p-6 font-sans">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header Premium Style */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-500 mb-2">
                                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                    Admin Dashboard
                                </h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">
                                Complete performance metrics for {user?.name}'s jurisdiction.
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <ModernStatCard title="Total Patients" value={myPatients.length} icon={Users} description="Registered network-wide" loading={isLoading} color="blue" />
                        <ModernStatCard title="Active Doctors" value={myDoctors.length} icon={Stethoscope} description="Current staff members" loading={isLoading} color="emerald" />
                        <ModernStatCard title="Today's Appointments" value={todaysAppointments} icon={Calendar} description="Scheduled for today" loading={isLoading} color="orange" />
                        <ModernStatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={IndianRupee} description="Overall collected fees" loading={isLoading} color="violet" />
                    </div>

                    {/* Charts */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><Activity className="h-5 w-5 text-blue-500" /> Revenue Forecast</h2>
                            <p className="text-sm text-slate-500 mb-6">Monthly income distribution and trends</p>
                            {isLoading ? (
                                <Skeleton className="h-[300px] w-full rounded-xl" />
                            ) : (
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }} formatter={(value?: number) => [`₹${(value || 0).toLocaleString()}`, 'Revenue']} />
                                            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md text-center">
                            <h2 className="text-xl font-bold mb-1">Appointment Matrix</h2>
                            <p className="text-sm text-slate-500 mb-2">Status distribution overview</p>
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
                                    <div className="flex flex-wrap justify-center gap-4 text-sm mt-2">
                                        {aptStatusData.map((item, index) => (
                                            <div key={index} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                                {item.name} <span className="opacity-60 ml-1">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lists */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><Calendar className="h-5 w-5 text-orange-500" /> Recent Appointments</h2>
                            <p className="text-sm text-slate-500 mb-4">Latest bookings in system</p>
                            <ScrollArea className="h-[320px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="flex gap-4"><Skeleton className="h-10 w-10 rounded-full"/><div className="space-y-2 flex-1"><Skeleton className="h-4 w-1/2"/><Skeleton className="h-3 w-1/3"/></div></div>)}</div>
                                ) : myAppointments.length === 0 ? (
                                     <div className="flex flex-col flex-1 items-center justify-center h-[200px] text-slate-400">
                                        <Calendar className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-medium">No recent appointments</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myAppointments.slice(0, 7).map((apt, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                                        {apt.patientName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{apt.patientName}</p>
                                                        <p className="text-xs font-semibold text-slate-500">Dr. {apt.doctorName} • {apt.appointmentdatetime}</p>
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

                         <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><CreditCard className="h-5 w-5 text-violet-500" /> Recent Invoices</h2>
                            <p className="text-sm text-slate-500 mb-4">Latest financial activity</p>
                            <ScrollArea className="h-[320px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
                                ) : myReceipts.length === 0 ? (
                                    <div className="flex flex-col flex-1 items-center justify-center h-[200px] text-slate-400">
                                        <CreditCard className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-medium">No recent invoices</p>
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

    if (loading) {
        return <Skeleton className="h-[140px] w-full rounded-3xl" />;
    }

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

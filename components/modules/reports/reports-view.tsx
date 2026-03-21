"use client";

import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { IndianRupee, Users, Calendar, Activity, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { reportsService, DashboardAnalytics } from "@/services/reports-service";
import { useToast } from "@/components/ui/toast";

const COLORS = ['#0ea5e9', '#22c55e', '#ef4444', '#eab308'];

export function ReportsView() {
    const { user } = useAuth();
    const { addToast } = useToast();

    const isSuperAdmin = user?.role === 'SuperAdmin';
    const isGroupAdmin = user?.role === 'GroupAdmin';

    const [isLoading, setIsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                // Determine scope
                let hId = null;
                let gId = null;

                if (user?.role === 'HospitalAdmin') hId = user.hospitalid;
                if (user?.role === 'GroupAdmin') gId = user.hospitalgroupid;

                const data = await reportsService.getDashboardAnalytics(hId, gId);
                setAnalytics(data);
            } catch (err: any) {
                addToast("Failed to load dashboard analytics.", "error");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchAnalytics();
        }
    }, [user, addToast]);

    if (isLoading || !analytics) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3 absolute inset-0 bg-background/50 z-10 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium animate-pulse">Loading Analytics Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {isSuperAdmin ? "Global Analytics" : isGroupAdmin ? "Group Performance" : "Hospital Insights"}
                    </h2>
                    <p className="text-muted-foreground">Comprehensive performance reports and financial analytics.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <div className="absolute -right-6 -top-6 text-primary/5 group-hover:text-primary/10 transition-colors duration-500">
                        <IndianRupee className="h-32 w-32 -rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold"><IndianRupee className="inline h-5 w-5 -mt-0.5" />{analytics.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground text-emerald-600 font-medium">Lifetime generated sum</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <div className="absolute -right-6 -top-6 text-primary/5 group-hover:text-primary/10 transition-colors duration-500">
                        <Calendar className="h-32 w-32 -rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">{analytics.totalAppointments.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground text-emerald-600 font-medium">Appointments booked</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <div className="absolute -right-6 -top-6 text-primary/5 group-hover:text-primary/10 transition-colors duration-500">
                        <Users className="h-32 w-32 -rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">{analytics.activePatients.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground text-emerald-600 font-medium">Distinct patient profiles</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                    <div className="absolute -right-6 -top-6 text-primary/5 group-hover:text-primary/10 transition-colors duration-500">
                        <Activity className="h-32 w-32 -rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Treatment Success</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">{analytics.treatmentSuccessRate}%</div>
                        <p className="text-xs text-muted-foreground text-emerald-600 font-medium">Overall satisfaction rate</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Analytics</CardTitle>
                        <CardDescription>Monthly revenue vs expenses overview.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.revenueTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                        formatter={(value: any) => [`₹${(value || 0).toLocaleString()}`, '']}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                                    <Legend />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Appointment Status</CardTitle>
                        <CardDescription>Distribution of appointment outcomes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.appStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {analytics.appStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Hospital Performance</CardTitle>
                        <CardDescription>Average revenue per hospital branch.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.revenueByHospitalData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                        formatter={(value: any) => [`₹${(value || 0).toLocaleString()}`, 'Revenue']}
                                    />
                                    <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Patient Visits Trend</CardTitle>
                        <CardDescription>Weekly patient footfall analysis.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.revenueByHospitalData}>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                    />
                                    <Bar dataKey="visits" fill="#22c55e" radius={[4, 4, 0, 0]} name="Visits" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

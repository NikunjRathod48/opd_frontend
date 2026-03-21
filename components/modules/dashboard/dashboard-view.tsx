"use client";

import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Users,
    Calendar,
    Activity,
    CreditCard,
    TrendingUp,
    UserPlus,
    Stethoscope,
    Clock,
    IndianRupee
} from "lucide-react";
import { useData } from "@/context/data-context";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reportsService, DashboardAnalytics } from "@/services/reports-service";
import { useToast } from "@/components/ui/toast";

interface DashboardViewProps {
    allowedRoles: UserRole[];
}

export function DashboardView({ allowedRoles }: DashboardViewProps) {
    const { user } = useAuth();
    const {
        patients,
        doctors,
        appointments,
        opdVisits,
        receipts,
        hospitals
    } = useData();

    // Loading State Simulation
    const [isLoading, setIsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const { addToast } = useToast();

    // --- METRICS CALCULATION ---
    // Filter data based on role
    const isPatient = user?.role === 'Patient';
    const isDoctor = user?.role === 'Doctor';
    const isAdmin = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin'].includes(user?.role || '');

    useEffect(() => {
        let isMounted = true;
        const fetchDashboardData = async () => {
            if (!isAdmin) {
                // Not an admin, don't fetch heavy analytics, just use local context data for patients/doctors
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const data = await reportsService.getDashboardAnalytics(
                    user?.hospitalid,
                    user?.hospitalgroupid
                );
                if (isMounted) {
                    setAnalytics(data);
                }
            } catch (error) {
                console.error("Failed to load dashboard analytics:", error);
                if (isMounted) {
                    addToast("Failed to load latest analytics data.", "error");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDashboardData();

        return () => {
            isMounted = false;
        };
    }, [user, isAdmin, addToast]);

    // Scope Total Patients for Admins
    const myPatients = patients.filter(p => {
        if (user?.role === 'HospitalAdmin') return String(p.hospitalid) === String(user?.hospitalid) || !p.hospitalid;
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => h.hospitalid === p.hospitalid);
            return h?.hospitalgroupid === user?.hospitalgroupid || !p.hospitalid;
        }
        return true;
    });
    const totalPatients = myPatients.length;
    // Common Metrics
    // Scope Total Doctors for Admins
    const myDoctors = doctors.filter(doc => {
        if (user?.role === 'HospitalAdmin') return String(doc.hospitalid) === String(user?.hospitalid);
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => String(h.hospitalid) === String(doc.hospitalid));
            return String(h?.hospitalgroupid) === String(user?.hospitalgroupid);
        }
        return true;
    });
    const totalDoctors = myDoctors.length;

    // Filtered Appointments
    const myAppointments = appointments.filter(apt => {
        if (isPatient) {
            return true; // Already filtered by backend
        }
        if (isDoctor) {
            const tempDoc = doctors.find(d => String(d.userid) === String(user?.id));
            const did = tempDoc?.doctorid || (user as any)?.doctorid || user?.id;
            return String(apt.doctorid) === String(did) || apt.doctorName === user?.name;
        }
        if (user?.role === 'HospitalAdmin') return String(apt.hospitalid) === String(user?.hospitalid);
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => String(h.hospitalid) === String(apt.hospitalid));
            return String(h?.hospitalgroupid) === String(user?.hospitalgroupid);
        }
        return true; // SuperAdmin/Receptionist see all
    });

    const today = new Date().toISOString().split('T')[0];
    const todaysAppointments = myAppointments.filter(apt => apt.appointmentdatetime === today).length;

    // Filtered Receipts (Revenue)
    const myReceipts = receipts.filter(r => {
        if (isPatient) return r.patientName === user?.name; // Mock name match
        if (isDoctor) return false; // Doctors usually don't see financial
        if (user?.role === 'HospitalAdmin') return String(r.hospitalid) === String(user?.hospitalid);
        if (user?.role === 'GroupAdmin') {
            const h = hospitals.find(h => String(h.hospitalid) === String(r.hospitalid));
            return String(h?.hospitalgroupid) === String(user?.hospitalgroupid);
        }
        return true; // SuperAdmin/Recep do
    });

    const totalRevenueContext = myReceipts.reduce((sum, r) => sum + (r.totalamount || 0), 0);
    // Use dynamic aggregate if available for admin
    const totalRevenue = isAdmin && analytics ? analytics.totalRevenue : totalRevenueContext;

    // Chart Data Preparation

    // 1. Appointments by Status
    // Dynamic for Admins, Context-based for others
    const aptStatusData = isAdmin && analytics ? analytics.appStatusData.map(d => ({
        ...d,
        color: d.name === 'Completed' ? '#22c55e' : d.name === 'Scheduled' ? '#3b82f6' : '#ef4444'
    })) : [
        { name: 'Completed', value: myAppointments.filter(a => a.status === 'Completed').length, color: '#22c55e' },
        { name: 'Scheduled', value: myAppointments.filter(a => a.status === 'Scheduled').length, color: '#3b82f6' },
        { name: 'Cancelled', value: myAppointments.filter(a => a.status === 'Cancelled').length, color: '#ef4444' },
    ];

    // 2. Revenue Trend (Dynamic from API for Admins)
    const revenueData = isAdmin && analytics ? analytics.revenueTrendData : [];

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                        <p className="text-muted-foreground">
                            Welcome back, <span className="font-medium text-foreground">{user?.name}</span>
                        </p>
                    </div>
                </div>

                {/* --- STATS CARDS --- */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Show Total Patients/Doctors only to Admin/Staff */}
                    {!isPatient && (
                        <>
                            <StatsCard
                                title="Total Patients"
                                value={totalPatients}
                                icon={Users}
                                description="Registered in system"
                                loading={isLoading}
                            />
                            <StatsCard
                                title="Total Doctors"
                                value={totalDoctors}
                                icon={Stethoscope}
                                description="Active staff"
                                loading={isLoading}
                            />
                        </>
                    )}

                    <StatsCard
                        title={isPatient ? "My Appointments" : "Appointments Today"}
                        value={isPatient ? myAppointments.length : todaysAppointments}
                        icon={Calendar}
                        description={isPatient ? "Total History" : "Scheduled for today"}
                        loading={isLoading}
                    />

                    {/* Show Revenue only to Admin/Receptionist */}
                    {!isPatient && !isDoctor && (
                        <StatsCard
                            title="Total Revenue"
                            value={`₹${totalRevenue.toLocaleString()}`}
                            icon={IndianRupee}
                            description="Total collected"
                            loading={isLoading}
                        />
                    )}

                    {/* Patient Specific Card: Total Spend or similar? */}
                    {isPatient && (
                        <StatsCard
                            title="Total Spent"
                            value={`₹${totalRevenue.toLocaleString()}`}
                            icon={CreditCard}
                            description="On medical services"
                            loading={isLoading}
                        />
                    )}
                </div>

                {/* --- CHARTS SECTION --- */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                    {/* Main Chart: Revenue for Admin, Something else for others? */}
                    {(!isPatient && !isDoctor) ? (
                        <Card className="col-span-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <CardTitle>Revenue Overview</CardTitle>
                                <CardDescription>Monthly income forecast vs actuals</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <Skeleton className="h-[350px] w-full" />
                                ) : (
                                    <div className="h-[350px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={revenueData}>
                                                <title>Revenue Chart</title>
                                                <defs>
                                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value?: number) => [`₹${(value || 0).toLocaleString()}`, 'Revenue']} />
                                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        // Placeholder for Patient/Doctor main chart replacement (e.g. Vitals Trend or Activity)
                        <Card className="col-span-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <CardTitle>Overview</CardTitle>
                                <CardDescription>Your activity overview</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2 h-[350px] flex items-center justify-center text-muted-foreground">
                                Activity Chart Coming Soon
                            </CardContent>
                        </Card>
                    )}

                    {/* Appointment Status & Recent Activity Wrapper */}
                    <div className="col-span-3 space-y-4">

                        {/* Appointment Status Pie Chart */}
                        <Card className="col-span-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <CardTitle>Appointment Distribution</CardTitle>
                                <CardDescription>Status breakdown</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-[250px] w-full" />
                                ) : (
                                    <div className="h-[300px] w-full flex flex-col items-center justify-center">
                                        <div className="h-[220px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={aptStatusData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={85}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        strokeWidth={2}
                                                        stroke="hsl(var(--card))"
                                                    >
                                                        {aptStatusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-4 mt-2 mb-2 text-sm">
                                            {aptStatusData.map((item, index) => (
                                                <div key={index} className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-muted-foreground font-medium">{item.name}</span>
                                                    <span className="font-bold">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Recent Appointments List - Filtered */}
                    <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <CardHeader>
                            <CardTitle>Recent Appointments</CardTitle>
                            <CardDescription>Latest scheduled visits</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px] pr-4">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex items-center gap-4">
                                                <Skeleton className="h-9 w-9 rounded-full" />
                                                <div className="space-y-2 flex-1">
                                                    <Skeleton className="h-4 w-[200px]" />
                                                    <Skeleton className="h-3 w-[150px]" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : myAppointments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed h-full mt-2">
                                        <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                        <p className="text-sm font-medium text-foreground">No recent appointments</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">There are no recent appointments scheduled at this branch.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {myAppointments.slice(0, 5).map((apt, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold transition-transform group-hover:scale-110">
                                                        {apt.patientName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{apt.patientName || "Unknown Patient"}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {apt.doctorName} • {apt.appointmentdatetime}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`text-xs px-2.5 py-1 rounded-full font-medium shadow-sm`}>
                                                    <span className={
                                                        apt.status === 'Completed' ? 'text-green-600' :
                                                            apt.status === 'Cancelled' ? 'text-red-600' :
                                                                'text-blue-600'
                                                    }>{apt.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Pending Invoices List - Hidden for Doctors ?? or show salary? Showing billing for now. */}
                    {!isDoctor && (
                        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <CardTitle>{isPatient ? "My Invoices" : "Recent Invoices"}</CardTitle>
                                <CardDescription>Latest billing activity</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px] pr-4">
                                    {isLoading ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <Skeleton className="h-4 w-[150px]" />
                                                    <Skeleton className="h-4 w-[80px]" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : myReceipts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed h-full mt-2">
                                            <CreditCard className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                            <p className="text-sm font-medium text-foreground">No recent invoices</p>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">There are no recent billing activities recorded.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {myReceipts.slice(0, 5).map((receipt, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors rounded-lg cursor-pointer">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm hover:text-primary transition-colors">{receipt.patientName}</span>
                                                        <span className="text-xs text-muted-foreground">#{receipt.receiptnumber} • {receipt.receiptdate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-sm tracking-tight">₹{(receipt.totalamount || 0).toLocaleString()}</span>
                                                        <div className={`w-2 h-2 rounded-full ${receipt.status === 'Paid' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </RoleGuard>
    );
}

function StatsCard({ title, value, icon: Icon, description, loading }: { title: string, value: string | number, icon: any, description: string, loading: boolean }) {
    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium"><Skeleton className="h-4 w-[100px]" /></CardTitle>
                    <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-[60px] mb-2" />
                    <Skeleton className="h-3 w-[120px]" />
                </CardContent>
            </Card>
        )
    }
    return (
        <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-primary opacity-70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    );
}

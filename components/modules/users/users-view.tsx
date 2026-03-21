"use client";

import { useState, useEffect } from "react";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserCircle, Shield, Building, Mail, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
    user_id: number;
    username: string;
    full_name: string;
    email: string;
    phone_number: string;
    role_name: string;
    hospital_name?: string;
    hospital_group_name?: string;
    is_active: boolean;
    profile_image_url?: string;
    created_at: string;
}

export function UsersView({ allowedRoles = ["SuperAdmin"] }: { allowedRoles?: UserRole[] }) {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const data = await api.get<User[]>("/users");
                setUsers(data);
            } catch (error: any) {
                addToast(error.message || "Failed to fetch users", "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (user && allowedRoles.includes(user.role as UserRole)) {
            fetchUsers();
        }
    }, [user, allowedRoles, addToast]);

    // Derived distinct roles for the filter dropdown
    const availableRoles = Array.from(new Set(users.map(u => u.role_name))).filter(Boolean);

    const filteredUsers = users.filter((u) => {
        const matchesSearch =
            (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesRole = roleFilter === "All" || u.role_name === roleFilter;

        return matchesSearch && matchesRole;
    });

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case "SuperAdmin":
                return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300";
            case "GroupAdmin":
                return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300";
            case "HospitalAdmin":
                return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
            case "Doctor":
                return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300";
            case "Receptionist":
                return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
            case "Patient":
                return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="flex flex-col gap-6 h-full flex-1">
                <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">System Users</h2>
                        <p className="text-muted-foreground">Manage and view all registered users across the platform.</p>
                    </div>
                </div>

                <Card className="flex-1 flex flex-col min-h-0 border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/5 border-b pb-4 shrink-0">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
                            <div className="relative w-full sm:w-[350px]">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users by name, email, or username..."
                                    className="pl-9 bg-background focus-visible:ring-primary/20"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-full sm:w-[180px] bg-background">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="Filter by Role" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Roles</SelectItem>
                                        {availableRoles.map(role => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto bg-muted/5 relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3 absolute inset-0 bg-background/50 z-10 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="font-medium animate-pulse">Loading System Users...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-4">
                                <div className="p-4 rounded-full bg-muted">
                                    <UserCircle className="h-12 w-12 text-muted-foreground/60" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-foreground">No Users Found</h3>
                                    <p className="text-sm">We couldn't track down any users matching your filters.</p>
                                </div>
                                <Button variant="outline" onClick={() => { setSearchTerm(''); setRoleFilter('All'); }}>Clear Filters</Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary tracking-wider uppercase text-xs">
                                    <TableRow className="hover:bg-transparent border-b-2 border-border/10">
                                        <TableHead className="w-[300px] font-bold py-4">User</TableHead>
                                        <TableHead className="font-bold">Contact Info</TableHead>
                                        <TableHead className="font-bold">Role & Status</TableHead>
                                        <TableHead className="font-bold">Associated Facility</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((u) => (
                                        <TableRow key={u.user_id} className="group transition-colors hover:bg-muted/30">
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border shadow-sm ring-2 ring-primary/10">
                                                        <AvatarImage src={u.profile_image_url || ""} alt={u.full_name} />
                                                        <AvatarFallback className="font-semibold bg-primary/10 text-primary uppercase">
                                                            {u.full_name?.substring(0, 2) || "U"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold text-sm group-hover:text-primary transition-colors">{u.full_name}</div>
                                                        <div className="text-xs text-muted-foreground font-mono">@{u.username}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                        <span className="truncate max-w-[200px]">{u.email || "-"}</span>
                                                    </div>
                                                    {u.phone_number && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                            <span>{u.phone_number}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-2">
                                                    <Badge variant="outline" className={`font-semibold tracking-wide ${getRoleBadgeStyle(u.role_name)}`}>
                                                        {u.role_name}
                                                    </Badge>
                                                    <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider ${u.is_active ? 'bg-emerald-100text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {u.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(u.hospital_name || u.hospital_group_name) ? (
                                                    <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 max-w-[250px]">
                                                        <Building className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
                                                        <div className="flex flex-col leading-tight gap-1">
                                                            {u.hospital_name && <span className="font-medium text-foreground">{u.hospital_name}</span>}
                                                            {u.hospital_group_name && <span className="text-xs">{u.hospital_group_name}</span>}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs italic text-muted-foreground block text-center w-full max-w-[100px]">N/A</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </RoleGuard>
    );
}

"use client";

import { Fragment } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { useAuth, UserRole } from "@/context/auth-context";
import { Tooltip } from "@/components/ui/tooltip";
import { SidebarTrigger } from "@/components/ui/sidebar-trigger";
import {
    LayoutDashboard,
    Users,
    UsersRound,
    CalendarCheck,
    CalendarHeart,
    ClipboardList,
    Receipt,
    ReceiptText,
    Stethoscope,
    Building2,
    Activity,
    BarChart3,
    PieChart,
    Network,
    ShieldCheck,
    UserRoundCog,
    UserPlus,
    Headset,
    Tag,
    MapPin,
    Pill,
    Microscope,
    Layers,
    ListOrdered
} from "lucide-react";

// Define Menu Items with Role Permissions
type MenuItem = {
    key: string; // Unique key for filtering
    path: string; // Relative path from role root
    icon: any;
    label: string;
    allowedRoles: UserRole[];
};

const ALL_ROLES: UserRole[] = ["SuperAdmin", "GroupAdmin", "HospitalAdmin", "Doctor", "Receptionist", "Patient"];

const SIDEBAR_ITEMS: MenuItem[] = [
    // --- Common ---
    {
        key: "dashboard",
        path: "",
        icon: LayoutDashboard,
        label: "Dashboard",
        allowedRoles: ALL_ROLES
    },

    // --- Super Admin Menu ---
    {
        key: "system-users",
        path: "users",
        icon: UsersRound,
        label: "User Management",
        allowedRoles: ["SuperAdmin"]
    },
    {
        key: "hospital-groups",
        path: "groups",
        icon: Network,
        label: "Hospital Groups",
        allowedRoles: ["SuperAdmin"]
    },
    {
        key: "group-admin-mgmt",
        path: "group-admins",
        icon: ShieldCheck,
        label: "Group Admins",
        allowedRoles: ["SuperAdmin"]
    },
    {
        key: "global-reports",
        path: "reports",
        icon: PieChart,
        label: "Global Analytics",
        allowedRoles: ["SuperAdmin"]
    },
    {
        key: "clinical-departments",
        path: "clinical/departments",
        icon: Layers,
        label: "Departments",
        allowedRoles: ["SuperAdmin"]
    },
    {
        key: "clinical-diagnoses",
        path: "clinical/diagnoses",
        icon: Activity,
        label: "Diagnoses",
        allowedRoles: ["SuperAdmin"]
    },
    {
        key: "clinical-medicines",
        path: "clinical/medicines",
        icon: Pill,
        label: "Medicines",
        allowedRoles: ["SuperAdmin", "HospitalAdmin"]
    },
    {
        key: "clinical-tests",
        path: "clinical/tests",
        icon: Microscope,
        label: "Pathology Tests",
        allowedRoles: ["SuperAdmin", "HospitalAdmin"]
    },
    {
        key: "state-city",
        path: "master-data",
        icon: MapPin,
        label: "Locations",
        allowedRoles: ["SuperAdmin"]
    },
    {
        key: "specializations",
        path: "master-data/specializations",
        icon: Stethoscope,
        label: "Specializations",
        allowedRoles: ["SuperAdmin"]
    },

    // --- Group Admin Menu ---
    {
        key: "hospital-branches",
        path: "hospitals",
        icon: Building2,
        label: "Branches",
        allowedRoles: ["GroupAdmin"]
    },
    {
        key: "hospital-admin-mgmt",
        path: "hospital-admins",
        icon: UserRoundCog,
        label: "Hospital Admins",
        allowedRoles: ["GroupAdmin"]
    },
    {
        key: "receptionists",
        path: "receptionists",
        icon: Headset,
        label: "Front Desk Staff",
        allowedRoles: ["GroupAdmin"]
    },
    {
        key: "group-reports",
        path: "reports",
        icon: BarChart3,
        label: "Group Analytics",
        allowedRoles: ["GroupAdmin"]
    },

    // --- Hospital Admin Menu ---
    {
        key: "doctors",
        path: "doctors",
        icon: UserPlus,
        label: "Doctors",
        allowedRoles: ["HospitalAdmin"]
    },
    {
        key: "hospital-departments",
        path: "departments",
        icon: Layers,
        label: "Departments",
        allowedRoles: ["HospitalAdmin"]
    },
    {
        key: "treatment-settings",
        path: "treatments",
        icon: Tag,
        label: "Treatments & Services",
        allowedRoles: ["HospitalAdmin", "SuperAdmin"]
    },

    // --- Clinical & Operations (Mixed) ---
    {
        key: "patients-common",
        path: "patients",
        icon: Users,
        label: "Patients List",
        allowedRoles: ["HospitalAdmin", "Receptionist"]
    },
    {
        key: "appointments-common",
        path: "appointments",
        icon: CalendarCheck,
        label: "Appointments",
        allowedRoles: ["HospitalAdmin", "Doctor", "Receptionist"]
    },
    {
        key: "opd-clinical",
        path: "opd",
        icon: Stethoscope,
        label: "OPD Queue",
        allowedRoles: ["HospitalAdmin", "Doctor"]
    },
    {
        key: "queues-common",
        path: "queues",
        icon: ListOrdered,
        label: "Token Management",
        allowedRoles: ["Doctor", "Receptionist"]
    },
    {
        key: "records-clinical",
        path: "records",
        icon: ClipboardList,
        label: "Medical Records",
        allowedRoles: ["HospitalAdmin", "Doctor"]
    },
    {
        key: "billing-common",
        path: "billing",
        icon: Receipt,
        label: "Billing & Invoices",
        allowedRoles: ["HospitalAdmin", "Receptionist"]
    },
    {
        key: "pharmacy-common",
        path: "pharmacy",
        icon: Pill,
        label: "Pharmacy",
        allowedRoles: ["HospitalAdmin", "Receptionist"]
    },
    {
        key: "laboratory-common",
        path: "laboratory",
        icon: Microscope,
        label: "Laboratory",
        allowedRoles: ["Receptionist", "Doctor"]
    },
    {
        key: "hospital-reports",
        path: "reports",
        icon: BarChart3,
        label: "Reports",
        allowedRoles: ["HospitalAdmin"]
    },

    // --- Patient Specific ---
    {
        key: "my-appointments",
        path: "appointments",
        icon: CalendarHeart,
        label: "My Appointments",
        allowedRoles: ["Patient"]
    },
    {
        key: "my-receipts",
        path: "receipts",
        icon: ReceiptText,
        label: "My Receipts",
        allowedRoles: ["Patient"]
    }
];

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { user, getRoleBasePath } = useAuth();

    // Default to 'patient' or handle via auth redirect
    const role = user?.role || "Patient";
    const basePath = getRoleBasePath(role);

    const filteredItems = SIDEBAR_ITEMS.filter(item => {
        // Basic Role Check
        if (!item.allowedRoles.includes(role)) return false;

        return true;
    });

    return (
        <>
            {!isCollapsed && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={toggleSidebar}
                />
            )}

            <aside
                className={cn(
                    "fixed top-3 left-3 bottom-3 z-50 flex flex-col border border-border/40 bg-background/80 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-neo-xl rounded-xl overflow-hidden",
                    isCollapsed ? "-translate-x-[200%]" : "translate-x-0 w-72",
                    "md:translate-x-0",
                    isCollapsed ? "md:w-[88px]" : "md:w-72"
                )}
            >
                {/* Toggle Area */}
                <div
                    className={cn(
                        "flex h-16 shrink-0 items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors duration-200",
                        isCollapsed ? "px-0" : "px-4 justify-start"
                    )}
                    onClick={toggleSidebar}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <div className="transition-transform duration-300 hover:scale-110">
                        <SidebarTrigger isOpen={!isCollapsed} />
                    </div>
                </div>

                <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar py-4 overflow-x-hidden">
                    <nav className="flex-1 space-y-2 px-2">
                        {filteredItems.map((item) => {
                            // Construct Dynamic HREF using AuthContext helper
                            const isRoot = item.path === "";
                            const href = isRoot ? basePath : `${basePath}/${item.path}`;

                            // Active State Logic:
                            // 1. Basic match: Exact or StartsWith
                            const isMatch = pathname === href || (pathname?.startsWith(`${href}/`) && !isRoot);

                            // 2. Specificity Check: Is there a LONGER matched item in the list?
                            // If yes, then this item is a "false positive" parent/prefix match and should not be active.
                            const hasMoreSpecificMatch = filteredItems.some(other => {
                                if (other.key === item.key) return false;
                                const otherHref = isRoot ? basePath : `${basePath}/${other.path}`;
                                const otherIsMatch = pathname === otherHref || (pathname?.startsWith(`${otherHref}/`) && !isRoot);
                                return otherIsMatch && otherHref.length > href.length;
                            });

                            const isActive = isMatch && !hasMoreSpecificMatch;

                            const linkClasses = cn(
                                "flex items-center gap-3 rounded-lg py-3 transition-all duration-200 group h-11 relative font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                                isActive
                                    ? cn("bg-primary text-white shadow-lg shadow-primary/25", !isCollapsed && "translate-x-1")
                                    : cn("text-muted-foreground dark:text-slate-300 hover:bg-muted/50 hover:text-foreground dark:hover:text-white", !isCollapsed && "hover:translate-x-1"),
                                isCollapsed ? "md:justify-center md:px-0 md:w-11 md:mx-auto" : "px-4 w-full"
                            );

                            const LinkContent = (
                                <Link
                                    href={href}
                                    className={linkClasses}
                                    onClick={(e) => {
                                        if (window.innerWidth < 768) {
                                            toggleSidebar();
                                        } else if (isCollapsed) {
                                            e.stopPropagation();
                                        }
                                    }}
                                >
                                    <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-300", isCollapsed && "md:scale-110 group-hover:scale-125")} />

                                    <span className={cn(
                                        "whitespace-nowrap transition-all duration-300 overflow-hidden",
                                        isCollapsed ? "md:w-0 md:opacity-0 md:hidden" : "w-auto opacity-100 block"
                                    )}>
                                        {item.label}
                                    </span>

                                    {/* Active Indicator Dot */}
                                    {isActive && !isCollapsed && (
                                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </Link>
                            );

                            return isCollapsed ? (
                                <Tooltip key={item.key} content={item.label} side="right">
                                    {LinkContent}
                                </Tooltip>
                            ) : (
                                <div key={item.key}>{LinkContent}</div>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t p-2">
                    <div className={cn(
                        "flex items-center gap-3 rounded-lg p-2 transition-all duration-200 cursor-pointer hover:bg-accent/50 hover:shadow-sm hover:scale-[1.02]",
                        isCollapsed && "md:justify-center"
                    )}>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 transition-transform group-hover:scale-110 uppercase">
                            {user?.role?.substring(0, 2) || 'GU'}
                        </div>
                        <div className={cn(
                            "text-sm overflow-hidden transition-all duration-300",
                            isCollapsed ? "md:w-0 md:opacity-0 md:hidden" : "w-auto opacity-100"
                        )}>
                            <p className="font-medium truncate group-hover:text-primary transition-colors dark:text-slate-200">{user?.name || "Guest"}</p>
                            <p className="text-xs text-muted-foreground dark:text-slate-400 truncate capitalize">{user?.role || "Visitor"}</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

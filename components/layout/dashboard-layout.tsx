"use client";

import * as React from "react";
import { useEffect } from "react"; // Added useEffect
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-provider";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth(); // Added user and isLoading
    const router = useRouter(); // Added router
    const { isCollapsed } = useSidebar();

    // Prevent Flash of Content during initial load or logout
    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [isLoading, user, router]);

    if (isLoading || !user) {
        // Return a full-screen loader or null to prevent theme flash
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Sidebar />
            <div
                className={cn(
                    "flex flex-1 flex-col transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    // Mobile: Always ml-0 (sidebar overlays)
                    "ml-0",
                    // Desktop:
                    // Collapsed: 80px width + 16px left + 16px gap = ~112px -> ml-28
                    // Expanded: 288px (w-72) + 16px left + 16px gap = ~320px -> ml-80
                    isCollapsed ? "md:ml-28" : "md:ml-80"
                )}
            >
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </SidebarProvider>
    );
}

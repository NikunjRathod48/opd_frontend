"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const { addToast } = useToast();

    useEffect(() => {
        if (!isLoading) {
            // Case 1: No User -> Redirect to Login
            if (!user) {
                // Optional: Store return URL
                router.push("/auth/login");
                return;
            }

            // Case 2: User exists but Role mismatch -> Redirect to Unauthorized
            if (!allowedRoles.includes(user.role)) {
                console.log(`RoleGuard Access Denied. User Role: ${user.role}, Allowed: ${allowedRoles.join(', ')}`);
                addToast("Access Denied: You do not have permission to view this page.", "error");
                router.push("/errors/unauthorized");
            }
        }
    }, [user, isLoading, allowedRoles, router, addToast]);

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading permissions...</div>;
    }

    // While checking or redirecting, return null to prevent flash of content
    if (!user || !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
